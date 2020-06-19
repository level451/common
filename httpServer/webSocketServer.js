const EventEmitter = require('events');
const webSocketEmitter = new EventEmitter();
const database = require('./database');
//class MyEmitter extends EventEmitter {}
module.exports = webSocketEmitter;
var webSocket = {};
const WebSock = require('ws');
module.exports.startWebSocketServer = function (server) {
    const wss = new WebSock.Server({server});
    wss.on('connection', function connection(ws, req) {
        const parameters = require('url').parse(req.url, true).query;
        ws.systemType = parameters.systemType;
        ws.id = parameters.id;
        // make sure we allow this connection
        //
        // RIO CHECK
        if (ws.systemType == 'RIO') {
            if (!settings.connectedRios[ws.id]) {
                console.log(`Rio not in connectedRios  ${ws.id} tried to connect - sending disconnect command via udp`);
                if (udpServer) {
                    udpServer.unbindHome(ws.id);
                    ws.close();
                    return;
                }
            } else if (webSocket[ws.id]) {
                console.log('RIO Already Connected - closing connection', ws.id);
                ws.close();
                return;
            }
        }
        if (!parameters.id && !parameters.browser) { //reject websocket wequests that are not from approved mac addresses
            ws.close();
            return;
        }
        ws.mac = parameters.mac;
        ws.isAlive = true;
        ws.remoteAddress = ws._socket.remoteAddress;
        ws.connectTime = new Date();
        if (ws.systemType == 'RIO') {
            global.settings.connectedRios[ws.id].connected = true;
            global.settings.connectedRios[ws.id].address = ws.remoteAddress.substr(ws.remoteAddress.lastIndexOf(':') + 1);
            database.updateSettings('system', global.settings).then((rslt) => {
            });
        }
        // in case of duplicate ids
        if (webSocket[ws.id] && ws.systemType != 'RIO') {
            ws.id += '.' + Math.random().toString();
        }
        console.log('New WebSocket Connection ID:' + ((ws.id)?ws.id.substring(0, 8) : '?' + ' systemType:') + ((ws.systemType)?ws.systemType:'?') +
            ' Total Connections: ', wss.clients.size);
        webSocket[ws.id] = ws;
        if (ws.systemType == 'browser') {
            webSocketEmitter.emit('browserConnect', ws.id);
            //console.log('Browser Connected - systemType', ws.systemType,ws.id);
        } else {
            webSocketEmitter.emit('connect', {id: ws.id, systemType: ws.systemType});
            if (ws.systemType == 'RIO'){
                console.log('Rio Connected - systemType & connected', ws.systemType,ws.id,global.settings.connectedRios[ws.id].connected);
                settings.connectedRios[ws.id].connected = true;
            }
        }
        ws.on('message', function incoming(message) {
           // console.log(message)
            try {
                var obj = JSON.parse(message);
            } catch (e) {
                console.log('failed to parse websocket obj:', e);
            }
            if (obj.subscribeToObjects) {
                unsubscribeEvents(ws);
                ws.subscribeEvents = obj.eventsToSubscribeTo;
                subscribeEvents(ws);
            } else if (obj.updateLocalSettings) {
                console.log('localsettingsupdate');
                global.settings.connectedRios[ws.id].localSettings = obj.localSettings;
                database.updateSettings('system', global.settings);
            } else if (obj.emitterDefinition) {
                // emitterDefinition now includes localsettings
                if (obj.localSettings && global.settings && global.settings.connectedRios[ws.id]) {
                    //     console.log('Emitter Definition from',ws.id)
                    global.settings.connectedRios[ws.id].localSettings = obj.localSettings;
                    global.settings.connectedRios[ws.id].connected = true;
                    database.updateSettings('system', global.settings);
                }
                createGlobalEmitterObject(obj, ws);
            } else if (obj.remoteEmit) { // got message from remote emitter
                if (global[obj.emitter] instanceof require("events").EventEmitter) {
                    // it's an emitter - emit the message
                    //global[obj.emitter].emit(obj.eventName, ...obj.args);
                    if (typeof (obj.args[0]) == 'object' && obj.args[0] != null) {
                        obj.args[0].timeStamp = new Date();
                    }
                    global[obj.emitter].emit(obj.eventName, ...obj.args);
                } else {
                    global[obj.emitter] = new EventEmitter();
                    console.trace('New emiter created - should not happen now', obj.emitter);
                    // check to see if anyone subscribed before this existed
                    for (var each in webSocket) {
                        if (webSocket[each].subscribeEvents) {
                            subscribeEvents(webSocket[each]);
                        }
                    }
                    global[obj.emitter].emit(obj.eventName, ...obj.args);
                }
            } else if (obj.remoteAsyncFunction) {
                // call to an Asyncfunction from the remote
                // this would come in from a web browser
                //
                // reparse message with date fix
                try {
                    var obj = JSON.parse(message, function (key, value) {
                            let reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
                            if (typeof value === 'string') {
                                var a = reISO.exec(value);
                                if (a)
                                    return new Date(value);
                            }
                            return value;
                        }
                    );
                } catch (e) {
                    console.log('failed to parse websocket obj:', e);
                }
                if (global[obj.emitterName]) {
//                    global[obj.emitterName][obj.functionName](...obj.args).then(function (...args) {
                    global[obj.emitterName][obj.functionName](...obj.args).then(function (args) {
                        // here I got the data back
                        //console.log('Data returned from remote async function', obj, ws.id,args);
                        // send the data back to me and fulfill the promise
                        ws.send(JSON.stringify({
                            remoteEmit: true,
                            emitter: obj.emitterName,
                            eventName: obj.returnEventName,
                            args: args
                        }));
                        //remoteEmit(obj.emitterName,obj.returnEventName,...args)
                    }).catch(function (args) {
                        ws.send(JSON.stringify({
                            remoteEmit: true,
                            reject: true,
                            emitter: obj.emitterName,
                            eventName: obj.returnEventName,
                            args: args
                        }));
                    });
                } else {
                    //object doesnt exsist anymore
                    this.send(JSON.stringify({
                            remoteEmit: true,
                            reject: true,
                            emitter: obj.emitterName,
                            eventName: obj.returnEventName,
                            args: new Error('Object not here any more')
                        })
                    );
                }
            } else if (obj.killSession) {
                console.log('kill Session', obj.requestLogId);
                for (var id in webSocket) {
                    if (webSocket[id].systemType == 'browser' && id.split('.')[1] == obj.requestLogId) {
                        console.log('found', id);
                        if (webSocket[id].readyState == 1) {
                            try {
                                webSocket[id].send(JSON.stringify({
                                    logOut: true
                                }));
                            } catch (e) {
                                console.log('Failed to logout');
                            }
                        }
                        break;
                    }
                }
            } else {
                // no other case applies emit the data to be processed elseware
                if (obj.emit) {
                    webSocketEmitter.emit(obj.emit, obj,ws);
                }
            }
        });
        ws.on('pong', heartbeat);
        ws.on('close', function () {
            if (ws.systemType == 'RIO' && global.settings.connectedRios[ws.id]) {
                console.log('RIO DISCONNECT', ws.id);
                global.settings.connectedRios[ws.id].connected = false;
                database.updateSettings('system', global.settings);
            }
            // remove all eventlisteners we subscribed to for BROWSERS
            // if this.subscribeEvents exists this websock is a browser this is subscribed to some remove emiter events
            if (this.subscribeEvents) {
                unsubscribeEvents(this);
            }
            // if this.globalEmitterObjectName exists this websock is the connection to a remote emitter
            if (this.globalEmitterObjectName) {
                deleteRemoteEmitter(this);
            }
            if (ws.id && webSocket[ws.id]) {
                delete webSocket[ws.id];
                //     console.log('Removeing websocket from active object', ws.id);
            } else {
                console.log('WARNING: websocket closing and is not found as connected', ws.id);
            }
            if (ws.systemType == 'browser') {
                webSocketEmitter.emit('browserClose', ws.id, ws.connectTime);
            } else {
                webSocketEmitter.emit('close', {id: ws.id, systemType: ws.systemType});
            }
        });
    });
    const interval = setInterval(function ping() {
        wss.clients.forEach(function each(ws) {
            if (ws.isAlive === false) {
                console.log('Socket killed with heartbeat:', ws.id);
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
        this.lastPing = new Date();
        this.isAlive = true;
    }
};


function subscribeEvents(ws) {
    let emitterDefinitionsSent = [];
    for (var i = 0; i < ws.subscribeEvents.length; ++i) {
        let subscribeObject = Object.getOwnPropertyNames(ws.subscribeEvents[i])[0]; // parse the name of the event to subscribe to
        // check to see is the object we are tring to subscribe to is an eventEmitter && we are not already subscribed
        //console.log('type', subscribeObject, typeof global[subscribeObject]);
        //global[subscribeObject] instanceof require("events").EventEmitter
        if ((typeof global[subscribeObject] == 'object' || typeof global[subscribeObject] == 'function') && typeof (ws.subscribeEvents[i].function) != 'function') {
            // wow this took forever to learn the syntax
            // global[subscribeObject] is the eventemitter object we are subscribing to
            // after we subscribe we are using bind so the function has access to the
            // event the was subscribe to and the websocket to send it to
            // store the function name so we can unsuscribe later
            ws.subscribeEvents[i].function = function (args) {
                if (this.ws.readyState == 1) {
                    try {
                        this.ws.send(JSON.stringify({
                            remoteEmit: true,
                            emitter: this.emitter,
                            eventName: this.eventName,
                            args: args
                        }));
                        //this.ws.send(JSON.stringify({[this.event]: evtData}))
                        // console.log('event:'+this.object)
                    } catch (e) {
                        console.log('Failed to subscribe');
                    }
                }
            }.bind({emitter: subscribeObject, eventName: ws.subscribeEvents[i][subscribeObject], ws: ws});
            // subscribe with the emietter.on to the saved function
            global[subscribeObject].on(ws.subscribeEvents[i][subscribeObject], ws.subscribeEvents[i].function);
//*****
            // send the object definition data to the remote
            // called from parent object example:
            // connector.on('connected',()=>{
            //     connector.sendObjectDataToRemote('ted',ted)
            // })
            if (emitterDefinitionsSent.includes(subscribeObject) == 0) {
                //havent sent an emitterDefinition for this object
                emitterDefinitionsSent.push(subscribeObject);
                let emitterDefinition = {
                    emitterDefinition: true,
                    emitterName: subscribeObject,
                    asyncFunctions: [],
                };
                // get the list of Asnc functions to send
                for (var prop in global[subscribeObject]) {
                    if (global[subscribeObject].hasOwnProperty(prop) && !prop.startsWith('_')) {
                        if (typeof global[subscribeObject][prop] === 'function' && global[subscribeObject][prop].constructor.name === 'AsyncFunction') {
                            //console.log(global[subscribeObject][prop].constructor.name)
                            //console.log('asyncFunction Prop:', prop)
                            emitterDefinition.asyncFunctions.push(prop);
                        }
                    }
                }
                ws.send(JSON.stringify(emitterDefinition));
            }
// *****
            //  console.log('Bound Websocket ' + ws.id + ' to event ' + ws.subscribeEvents[i][subscribeObject] + ' in object:' + subscribeObject);
        } else {
            if (ws.subscribeEvents[i].function) {
                //       console.log('Already Bound Websocket ' + ws.id + ' to event ' + ws.subscribeEvents[i][subscribeObject] + ' in object:' + subscribeObject)
            } else {
                // no emitter of this type are available
                //  console.log('FAILED to bind Bound Websocket ' + ws.id + ' to event ' + ws.subscribeEvents[i][subscribeObject] + ' in object:' + subscribeObject + ' NOT an Event Emitter');
            }
        }
    }
}


function unsubscribeEvents(ws) {
    if (ws.subscribeEvents) {
        for (var i = 0; i < ws.subscribeEvents.length; ++i) {
            let subscribeObject = Object.getOwnPropertyNames(ws.subscribeEvents[i])[0]; // parse the property name
            // unbind will fail is the object is not an emiter or the object was not bound
            if ((typeof global[subscribeObject] == 'object' || typeof global[subscribeObject] == 'function') && typeof (ws.subscribeEvents[i].function) == 'function') {
                //       console.log('UN-Bound Websocket ' + ws.id + ' from ' + subscribeObject + ' - ' + ws.subscribeEvents[i][subscribeObject]);
                global[subscribeObject].removeListener(ws.subscribeEvents[i][subscribeObject], ws.subscribeEvents[i].function);
            } else {
                //   console.log('UN-Bound fail - not an emiter Websocket ' + ws.id + ' to event ' + ws.subscribeEvents[i][subscribeObject] + ' in object:' + subscribeObject)
            }
        }
    }
}


function deleteRemoteEmitter(ws) {
    if (ws.globalEmitterObjectName) {
        // check if this is the last of the members
        if (global[ws.globalEmitterObjectName].members.length == 1) {
            // deleting globalEmitterObject should remove all listeners,
            // but the listener functions need to be deleted
            for (var each in webSocket) {
                if (webSocket[each].subscribeEvents) {
                    for (var i = 0; i < webSocket[each].subscribeEvents.length; ++i) {
                        let subscribeObject = Object.getOwnPropertyNames(webSocket[each].subscribeEvents[i])[0]; // parse the property name
                        if (subscribeObject == ws.globalEmitterObjectName) {
                            delete webSocket[each].subscribeEvents[i].function;
                            console.log('Deleting subscription:' + subscribeObject + '.' + webSocket[each].subscribeEvents[i][subscribeObject] + ' from ' + webSocket[each].id);
                        }
                    }
                }
            }
            console.log(`Removing ${ws.globalEmitterObjectId} from Global Emitter Object ${ws.globalEmitterObjectName}`);
            console.log('Destroying Global Emitter Object:', ws.globalEmitterObjectName);
            delete global[ws.globalEmitterObjectName];
        } else {
            console.log(`Removing ${ws.globalEmitterObjectId} from Global Emitter Object ${ws.globalEmitterObjectName}`);
            // more members remain only delete this member
            delete global[ws.globalEmitterObjectName].ws[ws.globalEmitterObjectId];
            // add to the disconnected list
            global[ws.globalEmitterObjectName].discconnectedMembers.push(ws.globalEmitterObjectId);
            let index = global[ws.globalEmitterObjectName].members.indexOf(ws.globalEmitterObjectId);
            if (index > -1) {
                global[ws.globalEmitterObjectName].members.splice(index, 1);
            }
        }
    }
}


function createGlobalEmitterObject(d, ws) {
    ws.globalEmitterObjectName = d.emitterName;
    ws.globalEmitterObjectId = d.emitterId;
    // first global emiter of this type
    if (!global[d.emitterName]) {
        //console.log(`Creating Global Emitter ${d.emitterName} Id:${d.emitterId}`);
        global[d.emitterName] = new EventEmitter();
        global[d.emitterName].members = [d.emitterId];
        global[d.emitterName].discconnectedMembers = [];
        global[d.emitterName].ws = {};
        global[d.emitterName].ws[d.emitterId] = ws; // attach the webSocket from the remote object to the new object
        createGlobalEmitterObjectAsncyFunctions(d);
        // check if subscriptions are pending for this object from before it was here
        for (var each in webSocket) {
            if (webSocket[each].subscribeEvents) {
                // just try to resub everyone
                subscribeEvents(webSocket[each]);
            }
        }
        webSocketEmitter.emit('newGlobalEmitterObject', d.emitterName);
    } else {
        //console.log(`Adding Emitter ${d.emitterId} to Global emitter ${d.emitterName}`);
        // if not a new emiter - add this on to the members
        global[d.emitterName].members.push(d.emitterId);
        global[d.emitterName].ws[d.emitterId] = ws; // attach the webSocket from the remote object to the object
        createGlobalEmitterObjectAsncyFunctions(d);
        for (var each in webSocket) {
            if (webSocket[each].subscribeEvents) {
                // just try to resub everyone
                subscribeEvents(webSocket[each]);
            }
        }
        // if it was discconnected remove it from the disconnected list
        let index = global[d.emitterName].discconnectedMembers.indexOf(d.emitterId);
        if (index > -1) {
            global[d.emitterName].discconnectedMembers.splice(index, 1);
        }
    }
}


function createGlobalEmitterObjectAsncyFunctions(d) {
    // this creates the function that is called for a remote object
    // likely from the browser
    for (functionToCreate of d.asyncFunctions) {
        //console.log('functionToCreate', functionToCreate, d.emitterName);
        // this is the return hook function
        //this saves the functionName , somehow this works where as functionToCreate
        let functionName = functionToCreate;
        global[d.emitterName][functionToCreate] = async function (...args) {
            // create a random event to subscribe to - to await the return value
            let member = null;
            // if this first arg is an emiter id
            // send the request there
            // otherwise send it to the first one
            if (this.members.includes(args[0])) {
                member = args[0];
                args.shift();
            } else {
                // make sure it isn't a disconnected id
                if (this.discconnectedMembers.includes(args[0])) {
                    console.log('--- Attempting remote function to disconnected unit:', args[0]);
                } else {
                    member = this.members[0];
                }
            }
            var returnEventName = Math.random().toString();
            //send the command to the remote
            if (this.ws[member].readyState == 1) {
                try {
                    this.ws[member].send(JSON.stringify({
                        remoteAsyncFunction: true,
                        emitterName: d.emitterName,
                        functionName: functionName,
                        returnEventName: returnEventName,
                        args: args
                    }));
                } catch (e) {
                    console.log('Failed to send websocket', e, this.readyState, this.ws.id);
                }
                // return a promise to be fulfilled when we get the data back
                return new Promise(function (resolve) {
                    global[d.emitterName].once(returnEventName, resolve);
                });
            }
        };
        //   global[d.emitterName][functionToCreate].name = functionToCreate;
        //***************
    }
    // this function is added to all remote emiters
    global[d.emitterName].getMembers = async function (...args) {
        return this.members;
    };
}


webSocketEmitter.on('browserConnect', (id) => {
    // update session database on browser connect
    id = id.split('.'); // id[0] is sessionId & id[1] is requestId
    //console.log('emit connect session id:', id[1]);
    dbo.collection('requestLog').findOneAndUpdate({_id: database.ObjectID(id[1])},
        {
            $set: {
                websocketOpenTime: new Date(),
                activeWebSocket: true
            }
        }, {returnOriginal: false}).then((rslt) => {
        database.emit('requestLog', rslt.value);
    }).catch(
        (e) => {
            console.log('Error updating session', e);
        });
});
webSocketEmitter.on('browserClose', (id, connectTime) => {
    id = id.split('.'); // id[0] is sessionId & id[1] is requestId
    //console.log('-----------------------++++++++++++++++++++++emit disconnect', id);
    dbo.collection('requestLog').findOneAndUpdate({_id: database.ObjectID(id[1])},
        {
            $set: {
                websockeCloseTime: new Date(),
                activeWebSocket: false,
                connectedTimeMinutes: (new Date() - connectTime) / 60000
            }
        }, {returnOriginal: false}).then((rslt) => {
        database.emit('requestLog', rslt.value);
    }).catch(
        (e) => {
            console.log('Error updating session', e);
        });
});
webSocketEmitter.getConnetions = async function (unitType = 'all') {
    return unitType;
};
