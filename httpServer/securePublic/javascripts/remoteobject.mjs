import eventify from '/javascripts/eventify.mjs';
import {sendObject} from '/javascripts/websocket.mjs';

export function createGlobalEmitterObjectFunctions(d) {
    createGlobalEmitterObjectAsncyFunctions(d);
}


function createGlobalEmitterObjectAsncyFunctions(d) {
    for (let i = 0; i < d.asyncFunctions.length; ++i) {
        let functionToCreate = d.asyncFunctions[i];
        console.log(`Creating function ${d.emitterName}:${functionToCreate}`);
        // this is the return hook function
        window[d.emitterName][functionToCreate] = async function (args) {
            // create a random event to subscribe to - to await the return value
            var returnEventName = Math.random().toString();
            //console.log('Return event :'+ functionToCreate+' Once Event Name'+returnEventName)
            //send the command to the remote
            sendObject({
                remoteAsyncFunction: true,
                emitterName: d.emitterName,
                functionName: functionToCreate,
                returnEventName: returnEventName,
                args: args
            });
            // return a promise to be fulfilled when we get the data back
            return new Promise(function (resolve, reject) {
                window[d.emitterName].once(returnEventName, function (args) {
                    if (args.reject) {
                        reject(args.args);
                    } else {
                        resolve(args);
                    }
                }, resolve, reject);
            });
        };
        window[d.emitterName].emit(`${functionToCreate}Available`);
    }
}


export function createEventEmitterObjects(subscribeEvents) {
    //console.log(subscribeEvents, subscribeEvents.length)
    for (var i = 0; i < subscribeEvents.length; ++i) {
        //console.log(Object.keys(subscribeEvents[i]));
        window[Object.keys(subscribeEvents[i])] = {};
        eventify(window[Object.keys(subscribeEvents[i])]);
    }
}