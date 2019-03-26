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

    });
    ws.on('ping', heartbeat);

    ws.on('message', function incoming(data) {
        //dataProcessor(JSON.parse(data));
        return;

        setTimeout(function () {
            ws.send(JSON.stringify({emitterId: data.emitterId, results: "sucess"}));
        }, data.timeOut);
        console.log(data);
    });
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

module.exports.send = function (data) {
    if (ws.readyState == 1) {
        ws.send(data)
    } else {
        console.log('cant send socket closed', data)
    }

}
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