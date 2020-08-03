const EventEmitter = require('events');
const database = new EventEmitter();
const bcrypt = require('bcrypt');
database.test = async function (x) {
    database.updateEventLog({id: localSettings.ServiceInfo.id, class: 'System', type: 'test', systemType: 'CS6', data: x, timeStamp: new Date()});
};
database.getUsers = async function (filter = {}) {
    filter.hidden = {$ne: true};
    try {
        let rslt = await dbo.collection('Users').find(filter).sort({displayName: 1}).toArray();
        return (rslt || {});
    } catch (e) {
        console.log(e);
    }
};
database.getRequestLogById = async function (id) {
    try {
        let rslt = await dbo.collection('requestLog').find({_id: database.ObjectID(id)}).toArray();
        return rslt[0];
    } catch (e) {
        console.log(e);
    }
};
database.getSessionByRequestLogId = async function (id) {
    try {
        let rslt = await dbo.collection('Session').find({'urlHistory.requestId': database.ObjectID(id)}).toArray();
        return rslt;
    } catch (e) {
        console.log(e);
    }
};
database.getSessionLog = async function (limit = 2, skip = 0, filter = {}) {
    try {
        let rslt = await dbo.collection('Session').find(filter).limit(limit).skip(skip).project({userId: 0}).sort({sessionLastAccessed: -1}).toArray();
        return rslt;
    } catch (e) {
        console.log(e);
    }
};
database.getRequestLog = async function (limit = 50, skip = 0, filter = {}) {
    try {
        let rslt = await dbo.collection('requestLog').find(filter).limit(limit).skip(skip).project({userId: 0}).sort({_id: -1}).toArray();
        return rslt;
    } catch (e) {
        console.log(e);
    }
};
database.getRequestLogDistinct = async function (fields = '', filter = {}) {
    try {
        let rslt = await dbo.collection('requestLog').distinct(fields, filter);
        return rslt;
    } catch (e) {
        console.log(e);
    }
};
database.getSettings = async function (type = 'system') {
    try {
        let rslt = await dbo.collection('settings').find({type: type}).project({_id: 0, type: 0}).toArray();
        //     console.log(rslt[0], rslt, type);
        return (rslt[0] || {});
    } catch (e) {
        console.log(e);
    }
};
database.updateSettings = async function (type, data, emitReloadAssembledShowData = false) {
    try {
        let rslt = await dbo.collection('settings').findOneAndUpdate({type: type},
            {$set: data}, {upsert: true, returnOriginal: false});
        if (type == 'system') {
            if (global.settings && global.settings.showName != rslt.value.showName) {
                database.emit('showNameChange', rslt.value.showName);
                global.settings = rslt.value;
            }
            database.emit('systemSettingsUpdated', rslt.value);
            //who knows what this will screw up -
            // when settings are updated via webpage - this will insure the global settings
            // is updated 8/3/2020 Todd
           // global.settings = rslt.value;
             //console.log('updated settigns',settings)
        }
        if (emitReloadAssembledShowData) {
            database.emit('reloadAssembledShowData');
        }
        return rslt;
    } catch (e) {
        console.log(e);
    }
};
database.addUsers = async function (data) {
    try {
        data.hash = await bcrypt.hash(data.hash, 2);
        data.mustChangePassword = true;
        data.preferences = {
            webTheme: 'default'
        };
        let rslt = await dbo.collection('Users').insertOne(data);
        return rslt;
    } catch (e) {
        console.log(e);
    }
    console.log('addUsers', data);
};
database.deleteUsers = async function (data) {
    try {
        let rslt = await dbo.collection('Users').deleteOne(data);
        return rslt;
    } catch (e) {
        console.log(e);
    }
};
database.updateEventLog = async function (data) {
    try {
        let rslt = await dbo.collection('eventLog').insertOne(data);
    } catch (e) {
        console.log(e);
    }
    database.emit('newEventLogEntry', data);
};
database.getEventLog = async function (limit = 1000, skip = 0, filter = {}, newestFirst = false) {
    // console.log(filter);
    try {
        let rslt = await dbo.collection('eventLog').find(filter).limit(limit).skip(skip).project({}).sort({_id: (newestFirst) ? -1 : 1}).toArray();
        return rslt;
    } catch (e) {
        console.log(e);
    }
};
database.error = async function (type, data) {
    throw 400;
};
module.exports = database;
const MongoClient = require('mongodb').MongoClient;
module.exports.ObjectID = require('mongodb').ObjectID;
//const assert = require('assert');
// Connection URL
let url;
if (localSettings && localSettings.MongoServer && localSettings.MongoServer.Address) {
    url = 'mongodb://' + localSettings.MongoServer.Address + ':27017';
} else {
    console.log('Database URL not found in localSettingsDescription.MongoServer.Address using localhost');
    url = 'mongodb://' + localSettingsDescription.MongoServer.Address + ':27017';
    console.log('url', url);
}
var client;
// Database Name
// Use connect method to connect to the server
module.exports.getMongoConnection = function (databaseName, requiredCollections) {
    return new Promise(function (resolve, reject) {
        MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}).then((client) => {
            checkIfCollectionsExist(client.db(databaseName));
            clearSystemInfoConnectionState(client.db(databaseName)); // reset the connection state of everything connected on restart
            resolve(client.db(databaseName));
        }).catch((e) => reject(e));
    });


    function checkIfCollectionsExist(dbo) {
        dbo.command({listCollections: 1}, function (err, rslt) {
            if (err) {
                console.log(err);
                return;
            }
            let allCollectionsExist = true;
            let collectionList = [];
            for (let i = 0; i < rslt.cursor.firstBatch.length; ++i) {
                collectionList.push(rslt.cursor.firstBatch[i].name);
            }
            for (let i = 0; i < requiredCollections.length; ++i) {
                if (collectionList.indexOf(requiredCollections[i].name) == -1) {
                    // collection doesnt exist
                    allCollectionsExist = false;
                    console.log('Collection Doesnt Exist:' + requiredCollections[i].name);
                    dbo.createCollection(requiredCollections[i].name, requiredCollections[i].options, function (err, rslt) {
                        console.log('created collection:', requiredCollections[i].name);
                        // determin if we are just adding 1 record or many
                        if (requiredCollections[i].data) {
                            if (requiredCollections[i].data.constructor === Array) {
                                // insert the objects
                                dbo.collection(requiredCollections[i].name).insertMany(requiredCollections[i].data, function (err, rslt) {
                                    if (err) {
                                        throw err;
                                    } else {
                                        console.log('Collection Created:' + requiredCollections[i].name);
                                    }
                                    if (requiredCollections[i].index) {
                                        dbo.collection(requiredCollections[i].name).createIndexes(requiredCollections[i].index, function (err, rslt) {
                                            console.log('Index Created:' + JSON.stringify(requiredCollections[i].index));
                                        });
                                    } else {
                                        console.log('No Indexes required');
                                    }
                                });
                            } else {
                                dbo.collection(requiredCollections[i].name).insertOne(requiredCollections[i].data, function (err, rslt) {
                                    if (err) {
                                        throw err;
                                    } else {
                                        console.log('Collection Created:' + requiredCollections[i].name);
                                    }
                                    if (requiredCollections[i].index) {
                                        dbo.collection(requiredCollections[i].name).createIndexes(requiredCollections[i].index, function (err, rslt) {
                                            console.log('Index Created:' + JSON.stringify(requiredCollections[i].index));
                                        });
                                    } else {
                                        console.log('No Indexes required');
                                    }
                                });
                            }
                        } else {
                            //no datat to insert just possibly an index
                            if (requiredCollections[i].index) {
                                dbo.collection(requiredCollections[i].name).createIndexes(requiredCollections[i].index, function (err, rslt) {
                                    console.log('Index Created:' + JSON.stringify(requiredCollections[i].index));
                                });
                            } else {
                                console.log('No Indexes required');
                            }
                        }
                    });
                }
            }
            if (allCollectionsExist) {
                console.log('All Required Collections Exist In the Database ' + databaseName);
            }
        });
    }
};
database.logSystemInfo = function (mac, event, data) {
    dbo.collection('SystemInfo').updateOne({mac: mac}, {$set: {[event]: data}}, {upsert: true}, (err, resp) => {
        if (err) {
            console.log("Problem logging system info", err);
        }
    });
};
database.getSystemInfo = function (filter, cb) {
    dbo.collection('SystemInfo').find(filter).toArray((err, rslt) => {
        if (!err) {
            var outputObject = {};
            // transform array to an object indexed off of the mac
            for (var i = 0; i < rslt.length; i++) {
                outputObject[rslt[i].mac] = rslt[i];
            }
        }
        cb(outputObject);
    });
};


function clearSystemInfoConnectionState(db) {
    db.collection('SystemInfo').updateMany({}, {$set: {connectionState: false}}, (err, rslt) => {
        if (err) {
            console.log("Problem clearing systemInfo connectionState", err);
        }
    });
    db.collection('requestLog').updateMany({activeWebSocket: true}, {$set: {activeWebSocket: false}}, (err, rslt) => {
        if (err) {
            console.log("Problem clearing systemInfo connectionState", err);
        }
    });
}
