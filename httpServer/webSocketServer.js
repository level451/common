const EventEmitter = require('events');
const webSocketEmitter = new EventEmitter();

//class MyEmitter extends EventEmitter {}
module.exports = webSocketEmitter;

var webSocket = {};
const WebSock = require('ws');

module.exports.startWebSocketServer = function (server) {
    const wss = new WebSock.Server({server});

    wss.on('connection', function connection(ws, req) {
        const parameters = require('url').parse(req.url, true).query;

        if (!parameters.mac && !parameters.browser) { //reject websocket wequests that are not from approved mac addresses
            ws.close()
            return;
        }

        ws.browser = parameters.browser
        ws.sid = parameters.sid;
        ws.mac = parameters.mac;
        ws.isAlive = true;
        ws.remoteAddress = ws._socket.remoteAddress;
        ws.id = (ws.sid) ? ws.sid : ws.mac;
        if (webSocket[ws.id]) {
            ws.id += Math.random().toString()
        }
        console.log('Connected Clients:' + wss.clients.size, ws.id)

        if (parameters.subscribeEvents) {
            try {
                ws.subscribeEvents = JSON.parse(parameters.subscribeEvents)
                subscribeEvents(ws)

            } catch (e) {
                console.log('Failed to parse subscribed events', parameters.subscribeEvents)
            }
        }

        webSocket[ws.id] = ws;


        ws.on('message', function incoming(message) {
            // console.log(message)
            try {
                var data = JSON.parse(message)
            } catch (e) {
                console.log('failed to parse websocket data:', e)
            }

            if (data.emitterDefinition) {

                createGlobalEmitterObject(data, ws)

                if (typeof ted == 'object') {
                    ted.asyncTest('call ted test function', 'val2', 3).then(function (s) {
                        console.log('--------------', s)
                    })
                }
                // ted.asyncTest('call ted test function','val2',3).then(function (s) {
                //     console.log('--------------',s)
                // })


            }
            if (data.emitter) { // got message from reomte emitter
                if (global[data.emitter] instanceof require("events").EventEmitter) {
                    // it's an emitter - emit the message
                    global[data.emitter].emit(data.eventName, ...data.args)
                } else {
                    global[data.emitter] = new EventEmitter();
                    console.log('New emiter created - should not happen now', data.emitter)
                    // check to see if anyone subscribed before this existed
                    for (var each in webSocket) {
                        if (webSocket[each].subscribeEvents) {
                            subscribeEvents(webSocket[each])
                        }
                    }
                    global[data.emitter].emit(data.eventName, ...data.args)

                }
            }
        });
        ws.on('pong', heartbeat);
        ws.on('close', function () {
            // remove all eventlisteners we subscribed to
            unsubscribeEvents(ws)
            if (this.globalEmitterObjectName){
                console.log ('Removing Global Emitter Object:',this.globalEmitterObjectName)
                // deleting globalEmitterObject should remove all listeners,
                // but the listener functions need to be deleted
                for (var each in webSocket) {
                    if (webSocket[each].subscribeEvents) {
                        for (var i = 0; i < webSocket[each].subscribeEvents.length; ++i) {
                            let subscribeObject = Object.getOwnPropertyNames(webSocket[each].subscribeEvents[i])[0] // parse the property name

                            if (subscribeObject == this.globalEmitterObjectName){
                              delete webSocket[each].subscribeEvents[i].function
                                console.log('Deleting this subscription',subscribeObject,webSocket[each].id)
                            }
                        }
                    }
                }

                delete global[this.globalEmitterObjectName]
            }

            delete global[ws.globalEmitterObjectName]
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
            if (ws.isAlive === false) {
                console.log('Socket killed with heartbeat:', ws.id)
            }
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



function subscribeEvents(ws) {
    for (var i = 0; i < ws.subscribeEvents.length; ++i) {
        let subscribeObject = Object.getOwnPropertyNames(ws.subscribeEvents[i])[0] // parse the property name
        // check to see is the object we are tring to subscribe to is an eventEmitter
        if (global[subscribeObject] instanceof require("events").EventEmitter && typeof (ws.subscribeEvents[i].function) != 'function') {
            // wow this took forever to learn the syntax
            // global[subscribeObject] is the eventemitter object we are subscribing to
            // after we subscribe we are using bind so the function has access to the
            // event the was subscribe to and the websocket to send it to

            // store the function name so we can unsuscribe later
            ws.subscribeEvents[i].function = function (...args) {

                if (this.ws.readyState == 1) {
                    try {
                        this.ws.send(JSON.stringify({emitter: this.emitter, eventName: this.eventName, args: args}))

                        //this.ws.send(JSON.stringify({[this.event]: evtData}))
                        // console.log('event:'+this.object)
                    } catch (e) {
                        console.log('Failed to send websocket', webSocket[mac].readyState, mac, data)
                    }

                }

            }.bind({emitter: subscribeObject, eventName: ws.subscribeEvents[i][subscribeObject], ws: ws})

            // subscribe with the emietter.on to the saved function
            global[subscribeObject].on(ws.subscribeEvents[i][subscribeObject], ws.subscribeEvents[i].function)
//*****

                // send the object definition data to the remote
                // called from parent object example:
                // connector.on('connected',()=>{
                //     connector.sendObjectDataToRemote('ted',ted)
                // })
                let emitterDefinition = {
                    emitterDefinition: true,
                    emitterName: subscribeObject,
                    asyncFunctions: [],
                };
                for (var prop in global[subscribeObject]) {
                    if (global[subscribeObject].hasOwnProperty(prop) && !prop.startsWith('_')) {
                        if (typeof global[subscribeObject][prop] === 'function' && global[subscribeObject][prop].constructor.name === 'AsyncFunction') {
                            console.log(global[subscribeObject][prop].constructor.name)
                            console.log('asyncFunction Prop:', prop)
                            emitterDefinition.asyncFunctions.push(prop)
                        }
                    }
                }
                ws.send(JSON.stringify(emitterDefinition))



// *****
            console.log('Bound Websocket ' + ws.id + ' to event ' + ws.subscribeEvents[i][subscribeObject] + ' in object:' + subscribeObject)
        } else {
            if (ws.subscribeEvents[i].function) {
                console.log('Already Bound Websocket ' + ws.id + ' to event ' + ws.subscribeEvents[i][subscribeObject] + ' in object:' + subscribeObject)

            } else {
                console.log('FAILED to bind Bound Websocket ' + ws.id + ' to event ' + ws.subscribeEvents[i][subscribeObject] + ' in object:' + subscribeObject + ' NOT an Event Emitter')
            }
        }

    }
}

function unsubscribeEvents(ws) {
    if (ws.subscribeEvents) {
        for (var i = 0; i < ws.subscribeEvents.length; ++i) {
            let subscribeObject = Object.getOwnPropertyNames(ws.subscribeEvents[i])[0] // parse the property name
            // unbind will fail is the object is not an emiter or the object was not bound
            if (global[subscribeObject] instanceof require("events").EventEmitter && typeof (ws.subscribeEvents[i].function) == 'function') {
                console.log('UN-Bound Websocket ' + ws.id + ' to event ' + ws.subscribeEvents[i][subscribeObject] + ' in object:' + subscribeObject)

                global[subscribeObject].removeListener(ws.subscribeEvents[i][subscribeObject], ws.subscribeEvents[i].function)


                console.log('UN-Bound fail - not an emiter Websocket ' + ws.id + ' to event ' + ws.subscribeEvents[i][subscribeObject] + ' in object:' + subscribeObject)
            } else {
            }

        }

    }
}

function createGlobalEmitterObject(d, ws) {
    console.log('Creating Global Emitter from remote object:' + d.emitterName)
    global[d.emitterName] = new EventEmitter();
    global[d.emitterName].ws = ws // attach the webSocket from the remote object to the new object

    ws.globalEmitterObjectName = d.emitterName;
    createGlobalEmitterObjectAsncyFunctions(d)
    // check if subscriptions are pending for this object from before it was here
    for (var each in webSocket) {
        if (webSocket[each].subscribeEvents) {
            // just try to resub everyone
            subscribeEvents(webSocket[each])
        }
    }


}

function createGlobalEmitterObjectAsncyFunctions(d) {
    for (functionToCreate of d.asyncFunctions) {

        console.log('functionToCreate', functionToCreate, d.emitterName)
        // this is the return hook function
        global[d.emitterName][functionToCreate] = async function (...args) {
            var returnEventName = Math.random().toString();
            //send the command to the remote
            if (this.ws.readyState == 1) {
                try {
                    this.ws.send(JSON.stringify({
                        remoteAsyncFunction: true,
                        emitterName: d.emitterName,
                        functionName: functionToCreate,
                        returnEventName: returnEventName,
                        args: args
                    }))
                } catch (e) {
                    console.log('Failed to send websocket', e, this.readyState, this.ws.id)
                }
                // return a promise to be fulfilled when we get the data back
                return new Promise(function (resolve) {
                    global['ted'].once(returnEventName, resolve)
                })
            }

        }


        //***************
    }

}