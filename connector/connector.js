const WebSocket = require('ws');

const EventEmitter = require('events');
const wscEmitter = new EventEmitter();

//class MyEmitter extends EventEmitter {}
module.exports = wscEmitter;
var ws;
var sid;

connect();

function connect() {
    if (!localSettings || !localSettings.home.address) {
        console.log("Can't connect to MasterConsole - address not in localsettings");
        return
    }

    ws = new WebSocket('wss://' + localSettings.home.address + '?mac=e1:e1:e1:e1&type=homeSolar');

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
            console.log('parse error',e)
        }
        if (obj.remoteFunction){
            // call to an Asyncfunction from the remote
            global[obj.emitterName][obj.eventName](...obj.args).then(function(...args){
               console.log('--',obj)
                remoteEmit(obj.emitterName,obj.returnEventName,...args)
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
            connect();
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

module.exports.send = send()
module.exports.remoteEmit = function (emitter, eventName, ...args) {
    if (ws.readyState == 1) {

        try {
            ws.send(JSON.stringify({emitter: emitter, eventName: eventName, args: args}))
        } catch (e) {
            console.log('send failure:', e)
        }
    } else {
        console.log('cant send socket closed', args)
    }


}
module.exports.sendObjectData = function (emitterName, emitter) {
    let emitterDefinition = {
        emitterDefinion: true,
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
        console.log('cant send socket closed', d)
    }


}
function remoteEmit(emitter, eventName, ...args) {
    if (ws.readyState == 1) {
        console.log(eventName)
        try {
            ws.send(JSON.stringify({emitter: emitter, eventName: eventName, args: args}))
            console.log('emitter',emitter,eventName,args)
        } catch (e) {
            console.log('send failure:', e)
        }
    } else {
        console.log('cant send socket closed', args)
    }


}