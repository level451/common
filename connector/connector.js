const WebSocket = require('ws');
const EventEmitter = require('events');
const wscEmitter = new EventEmitter();
/*
*
*
*
*
*
* */
let connectionParameters = {}


module.exports = wscEmitter;
var ws = {};
var sid;
module.exports.connect = function (remoteAddress, useSecureWebsocket, systemType, id) {
    if (!id) {
        id = 'RandomId:'+Math.random().toString()
    }
    connectionParameters = {
        remoteAddress: remoteAddress,
        useSecureWebsocket: useSecureWebsocket,
        systemType: systemType,
        id:id
    }

    webSocketConnect()
}


function webSocketConnect() {
    if (!localSettings || !localSettings.home.address) {
        console.log("Can't connect to MasterConsole - address not in localsettings");
        return
    }

    let wsConnectionPrefix = (connectionParameters.useSecureWebsocket) ? 'wss': 'ws'
    ws = new WebSocket(wsConnectionPrefix + '://' + connectionParameters.remoteAddress + '?id='+
        connectionParameters.id+'&systemType='+connectionParameters.systemType);
    //ws = new WebSocket('wss://' + localSettings.home.address + '?id=e1:e1:e1:e1&type=homeSolar');

    ws.on('open', heartbeat);
    ws.on('open', function () {
        console.log('connected to home')
        wscEmitter.emit('connected')
    });
    ws.on('ping', heartbeat);

    ws.on('message', function incoming(d) {
        try {
            var obj = JSON.parse(d)
        } catch (e) {
            console.log('parse error', e)
        }
        if (obj.remoteAsyncFunction) {
            // call to an Asyncfunction from the remote
            global[obj.emitterName][obj.functionName](...obj.args).then(function (...args) {
                console.log('--', obj)
                remoteEmit(obj.emitterName, obj.returnEventName, ...args)
            })

        }

    })

    ws.on('close', function clear() {
        clearTimeout(this.pingTimeout);
        console.log('onclose - lost connection to master console');
        reconnect();
    });

    ws.on('error', function (err) {
        this.close();
        console.log(err)


    });

    function reconnect() {
        setTimeout(function () {
            webSocketConnect();
        }, 5000)

    }
}


function heartbeat() {
    clearTimeout(this.pingTimeout);

    // Use `WebSocket#terminate()` and not `WebSocket#close()`. Delay should be
    // equal to the interval at which your server sends out pings plus a
    // conservative assumption of the latency.
    this.pingTimeout = setTimeout(() => {
        this.terminate();
        console.log('terminated connection')
    }, 30000 + 1000);
}

module.exports.send = send

module.exports.sendObjectDefinitionDataToRemote = function (emitterName, emitter) {

    // send the object definition data to the remote
    // called from parent object example:
    // connector.on('connected',()=>{
    //     connector.sendObjectDataToRemote('ted',ted)
    // })
    let emitterDefinition = {
        emitterDefinition: true,
        emitterName: emitterName,
        asyncFunctions: [],
    };
    for (var prop in emitter) {
        if (emitter.hasOwnProperty(prop) && !prop.startsWith('_')) {
            if (typeof emitter[prop] === 'function' && emitter[prop].constructor.name === 'AsyncFunction') {
                console.log(emitter[prop].constructor.name)
                console.log('asyncFunction Prop:', prop)
                emitterDefinition.asyncFunctions.push(prop)
            }
        }
    }
    send(emitterDefinition)
}

function send(d) {
    if (ws.readyState == 1) {
        try {
            ws.send(JSON.stringify(d))
        } catch (e) {
            console.log('cant send failed', e, d)

        }
    } else {
        console.trace('cant send socket closed', d)
    }


}

module.exports.remoteEmit = remoteEmit;

function remoteEmit(emitter, eventName, ...args) {
    // sends the emitted event to the obj clone on the remote
    if (ws.readyState == 1) {
        //console.log(eventName)
        try {
            ws.send(JSON.stringify({remoteEmit: true, emitter: emitter, eventName: eventName, args: args}))
            //console.log('emitter',emitter,eventName,args)
        } catch (e) {
            console.log('send failure:', e)
        }
    } else {
        console.log('cant send socket closed', args)
    }


}
