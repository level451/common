const EventEmitter = require('events');
const webSocketEmitter = new EventEmitter();

//class MyEmitter extends EventEmitter {}
module.exports = webSocketEmitter;

const myEmitter = new EventEmitter();
var webSocket = {};
const WebSock = require('ws');

module.exports.startWebSocketServer = function(server){
    const wss = new WebSock.Server( {server} );

    wss.on('connection', function connection(ws,req) {
        webSocketEmitter.emit('test','test')
        const parameters = require('url').parse(req.url, true).query;

        if (!parameters.mac && !parameters.browser){ //reject websocket wequests that are not from approved mac addresses
            ws.close()
            return;
        }
        console.log('Connected Clients:'+wss.clients.size)
        ws.browser = parameters.browser
        ws.sid = parameters.sid;
        ws.isAlive = true;
        ws.remoteAddress = ws._socket.remoteAddress;
        ws.id = (ws.sid)?ws.sid:ws.mac;

        ws.subscribeEvents=JSON.parse(parameters.subscribeEvents)

        if (parameters.subscribeEvents){
            subscribeEvents(ws)
        }

        webSocket[ws.id]=ws;




        ws.on('message', function incoming(message) {
           // console.log(message)

            var data=JSON.parse(message)
            myEmitter.emit(data.emitterId,data,ws.id)


        });
        ws.on('pong', heartbeat);
        ws.on('close', function(){
           // remove all eventlisteners we subscribed to
            unsubscribeEvents(ws)
            if (ws.id && webSocket[ws.id]) {
                delete webSocket[ws.id];
                console.log('Removeing websocket from active object', ws.id)
            } else {
                console.log('WARNING: websocket closing and is not found as connected', ws.id)
            }
        });


    });

    const interval = setInterval(function ping() {
        wss.clients.forEach(function each(ws) {
              if (ws.isAlive === false) {console.log('Socket killed with heartbeat:',ws.id)}
              if (ws.isAlive === false) return ws.terminate();
              ws.isAlive = false;
              ws.ping(noop);
        });
    }, 30000);
    function noop() {
//hits here every ping-pong
   }
    function heartbeat() {
        this.lastPing = new Date()
        this.isAlive = true;
    }
}



function subscribeEvents(ws){
    for (var i = 0;i<ws.subscribeEvents.length;++i){
        let subscribeObject = Object.getOwnPropertyNames(ws.subscribeEvents[i])[0] // parse the property name
        // check to see is the object we are tring to subscribe to is an eventEmitter
        if (global[subscribeObject] instanceof require("events").EventEmitter){
            // wow this took forever to learn the syntax
            // global[subscribeObject] is the eventemitter object we are subscribing to
            // after we subscribe we are using bind so the function has access to the
            // event the was subscribe to and the websocket to send it to

            // store the function name so we can unsuscribe later
            ws.subscribeEvents[i].function =  function(evtData,f){
                if (this.ws.readyState == 1){
                    try{
                        this.ws.send(JSON.stringify({[this.event]:evtData}))

                    } catch(e){
                        console.log('Failed to send websocket',webSocket[mac].readyState,mac,data)
                    }

                }

            }.bind({object:subscribeObject,event:ws.subscribeEvents[i][subscribeObject],ws:ws})

            // subscribe with the emietter.on to the saved function
            global[subscribeObject].on(ws.subscribeEvents[i][subscribeObject],ws.subscribeEvents[i].function)

            console.log('Bound Websocket '+ws.id+' to event '+ws.subscribeEvents[i][subscribeObject]+' in object:'+subscribeObject)
        } else
        {
            console.log('FAILED to bind Bound Websocket '+ws.id+' to event '+ws.subscribeEvents[i][subscribeObject]+' in object:'+subscribeObject+' NOT an Event Emitter')
        }

    }
}
function unsubscribeEvents(ws){
    for (var i = 0;i<ws.subscribeEvents.length;++i) {
        let subscribeObject = Object.getOwnPropertyNames(ws.subscribeEvents[i])[0] // parse the property name

        if (global[subscribeObject] instanceof require("events").EventEmitter) {
            console.log('UN-Bound Websocket '+ws.id+' to event '+ws.subscribeEvents[i][subscribeObject]+' in object:'+subscribeObject)

            global[subscribeObject].removeListener(ws.subscribeEvents[i][subscribeObject], ws.subscribeEvents[i].function)
        }

    }
}