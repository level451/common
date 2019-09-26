import * as remoteObject from '/javascripts/remoteObject.mjs';
import eventify from '/javascripts/eventify.mjs';

if (location.protocol === 'https:') {
    var wss = new WebSocket('wss://' + window.location.hostname + ':' + window.location.port +
        '/?systemType=browser&id=' + sessionDocument._id + '.' + requestId);
    console.log('Using Secure Websocket');
} else {
    var wss = new WebSocket('ws://' + window.location.hostname + ':' + window.location.port +
        '/?systemType=browser&id=' + sessionDocument._id + '.' + requestId);
    console.log('Using Standard Websocket');
}
eventify(wss);


function on(...args) {
    //genius function
    wss.on(...args);
}


wss.onopen = function () {
    console.log('websocket open');
    wss.emit('open', '---------------');
};
wss.onmessage = function (evt) {
    try {
        // SEE IF THE EVENT DATA IS AN OBJECT
        let obj = JSON.parse(evt.data);
        if (obj.remoteEmit) {
            if (obj.reject) { // reject the promise with an error
                window[obj.emitter].emit(obj.eventName, obj);
            } else {
                if (obj.args) {
                    window[obj.emitter].emit(obj.eventName, obj.args);
                } else {
                    window[obj.emitter].emit(obj.eventName, '');
                }
            }
        } else if (obj.emitterDefinition) {
            // this is an emitter Definition - the basic remote object
            // we are going to create the hooks to the remote function
            //console.log(obj)
            remoteObject.createGlobalEmitterObjectFunctions(obj);
            // the we are going to use its remote emitter to emit that it is ready
            //window[obj.emitterName].emit('ready', '');
        } else if (obj.logOut) {
            window.location.href = '/login';
        } else {
              this.emit('message', obj);
           // console.log('??', obj);
        }
    } catch (e) {
        //this.emit('message', evt.data);
    }
    // wsEmitter.emit(Object.keys(d)[0],d[Object.keys(d)[0]])
    //  console.log(evt.data)
};
wss.onerror = function (err) {
    console.log('websocket error:' + err);
    wss.close();
};
wss.onclose = function () {
    //  this.emit('close', '');
    console.log('websocket close reconecting websocket');
    location.reload();
};


function subscribeToRemoteObjects(eventsToSubscribeTo) {
    wss.send(JSON.stringify({subscribeToObjects: true, eventsToSubscribeTo: eventsToSubscribeTo}));
}


function startWebsocket(subscribeEvents = {}) {
    remoteObject.createEventEmitterObjects(subscribeEvents);
    // once it is open subscribe to events for reomte objects
    wss.onopen = function () {
        wss.emit('open');
        console.log('websocket open');
        subscribeToRemoteObjects(subscribeEvents);
    };
}


function sendObject(d) {

    if (wss.readyState == 1) {
        try {
            wss.send(JSON.stringify(d));
        } catch (e) {
            console.log('Failed to send websocket', e, this.readyState, this.ws.id);
        }
    }
}


export {
    on, startWebsocket, sendObject
};
