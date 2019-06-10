const WebSocket = require('ws');
const EventEmitter = require('events');
const wscEmitter = new EventEmitter();
const udpServer = require('./udpServer');
wscEmitter.connected = false;
wscEmitter.id = '';
/*
*
*
*
*
*
* */
let connectionParameters = {};
module.exports = wscEmitter;
module.exports.udpServer = udpServer;
var ws = {};
var sid;
var hasConnected = false;
wscEmitter.connect = function (remoteAddress, useSecureWebsocket, systemType, id) {
    if (!id) {
        return false;
    }
    wscEmitter.id = id;
    connectionParameters = {
        remoteAddress: remoteAddress,
        useSecureWebsocket: useSecureWebsocket,
        systemType: systemType,
        id: id
    };
    return new Promise((resolve, reject) => {
        webSocketConnect(resolve, reject);
    });
};


function webSocketConnect(resolve, reject) {
    if (wscEmitter.connected == true) {
        console.log('Already connected')
        return false
    }
    if (!localSettings || !localSettings.home.address) {
        console.log("Can't connect to MasterConsole - address not in localsettings");
        return;
    }
    let wsConnectionPrefix = (connectionParameters.useSecureWebsocket) ? 'wss' : 'ws';
    ws = new WebSocket(wsConnectionPrefix + '://' + connectionParameters.remoteAddress + '?id=' +
        connectionParameters.id + '&systemType=' + connectionParameters.systemType);
    //ws = new WebSocket('wss://' + localSettings.home.address + '?id=e1:e1:e1:e1&type=homeSolar');
    ws.on('open', heartbeat);
    ws.on('open', function () {
        wscEmitter.connected = true;
        hasConnected = true;
        if (resolve) {
            resolve();
        }
        console.log('---connected to home---');
        wscEmitter.emit('connect');
    });
    ws.on('ping', heartbeat);
    ws.on('message', function incoming(d) {
        try {
            var obj = JSON.parse(d);
        } catch (e) {
            console.log('parse error', e);
        }
        if (obj.remoteAsyncFunction) {
            // call to an Asyncfunction from the remote
            console.log(obj);
            global[obj.emitterName][obj.functionName](...obj.args).then(function (...args) {
                //console.log('--', obj);
                remoteEmit(obj.emitterName, obj.returnEventName, ...args);
            });
        }
    });
    ws.on('close', function clear() {
        wscEmitter.connected = false;
        clearTimeout(this.pingTimeout);
        console.log('onclose - lost connection to home');
        wscEmitter.emit('close');
        if (hasConnected) {
            reconnect();
        }
    });
    ws.on('error', function (err) {
        if (reject) {
            reject(err);
        }
        this.close();
        //console.log(err)
    });


    function reconnect() {
        setTimeout(function () {
            if (wscEmitter.connected == false) {
                webSocketConnect();
            }
        }, 5000);
    }
}


function heartbeat() {
    clearTimeout(this.pingTimeout);
    // Use `WebSocket#terminate()` and not `WebSocket#close()`. Delay should be
    // equal to the interval at which your server sends out pings plus a
    // conservative assumption of the latency.
    this.pingTimeout = setTimeout(() => {
        this.terminate();
        console.log('terminated connection');
    }, 30000 + 1000);
}


module.exports.send = send;
module.exports.sendObjectDefinitionDataToRemote = function (emitterName, emitter) {
    // send the object definition data to the remote
    // called from parent object example:
    // connector.on('connected',()=>{
    //     connector.sendObjectDataToRemote('ted',ted)
    // })
    let emitterDefinition = {
        emitterDefinition: true,
        emitterName: emitterName,
        emitterId: localSettings.ServiceInfo.id,
        asyncFunctions: [],
    };
    for (var prop in emitter) {
        if (emitter.hasOwnProperty(prop) && !prop.startsWith('_')) {
            if (typeof emitter[prop] === 'function' && emitter[prop].constructor.name === 'AsyncFunction') {
                //   console.log(emitter[prop].constructor.name);
                console.log('asyncFunction Prop:', prop);
                emitterDefinition.asyncFunctions.push(prop);
            }
        }
    }
    send(emitterDefinition);
};


function send(objectToSend) {
    if (ws.readyState == 1) {
        try {
            ws.send(JSON.stringify(objectToSend));
        } catch (e) {
            console.log('cant send failed', e, d);
        }
    } else {
        console.error('cant send socket closed', objectToSend);
    }
}


module.exports.remoteEmit = remoteEmit;


function remoteEmit(emitter, eventName, ...args) {
    // sends the emitted event to the obj clone on the remote
    if (ws.readyState == 1) {
        //console.log(eventName)
        try {
            ws.send(JSON.stringify({remoteEmit: true, emitter: emitter, eventName: eventName, args: args}));
            //console.log('emitter',emitter,eventName,args)
        } catch (e) {
            console.log('send failure:', e);
        }
    } else {
        console.log('cant send socket closed', args);
    }
}
