const EventEmitter = require('events');
const database = new EventEmitter()




database.getRequestLogById = async function (id) {
    try {
        let rslt = await  dbo.collection('requestLog').find({_id:database.ObjectID(id)}).toArray()

        return rslt[0];
    } catch (e) {
        console.log(e);
    }
};
database.getSessionByRequestLogId = async function (id) {
    try {
        let rslt = await  dbo.collection('Session').find({'urlHistory.requestId':database.ObjectID(id)}).toArray()

        return rslt;
    } catch (e) {
        console.log(e);
    }
};
database.getSessionLog = async function (limit = 2,skip = 0,filter = {}) {
    try {
        let rslt = await dbo.collection('Session').find(filter).limit(limit).skip(skip).project({userId: 0}).sort({sessionLastAccessed: -1}).toArray();
        return rslt;
    } catch (e) {
        console.log(e);
    }
};
database.getRequestLog = async function (limit = 50,skip = 0,filter = {}) {
    console.log(filter)
    try {
        let rslt = await dbo.collection('requestLog').find(filter).limit(limit).skip(skip).project({userId: 0}).sort({_id: -1}).toArray();
        return rslt;
    } catch (e) {
        console.log(e);
    }
};
database.getRequestLogDistinct = async function (fields = '',filter = {}) {
    try {
        let rslt = await dbo.collection('requestLog').distinct(fields,filter);
        return rslt;
    } catch (e) {
        console.log(e);
    }
};

module.exports = database;

const MongoClient = require('mongodb').MongoClient;
module.exports.ObjectID = require('mongodb').ObjectID;
//const assert = require('assert');

// Connection URL
if (!localSettings) {
    console.log('WARNING - localSetting not found attempting to connect with default settings');
    var url = 'mongodb://' + localSettingsDescription.MongoServer.Address + ':27017';
    console.log('url', url);
} else {
    var url = 'mongodb://' + localSettings.MongoServer.Address + ':27017';
}
var client;
// Database Name
// Use connect method to connect to the server



module.exports.getMongoConnection = function (databaseName,requiredCollections) {
    return new Promise(function (resolve, reject) {
        MongoClient.connect(url, {useNewUrlParser: true}).then((client) => {
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
            let collectionrList = [];
            for (let i = 0; i < rslt.cursor.firstBatch.length; ++i) {
                collectionrList.push(rslt.cursor.firstBatch[i].name);
            }
            for (let i = 0; i < requiredCollections.length; ++i) {
                if (collectionrList.indexOf(requiredCollections[i].name) == -1) {
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
exports.logSystemInfo = function (mac, event, data) {
    dbo.collection('SystemInfo').updateOne({mac: mac}, {$set: {[event]: data}}, {upsert: true}, (err, resp) => {
        if (err) {
            console.log("Problem logging system info", err);
        }
    });
};
exports.getSystemInfo = function (filter, cb) {
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
    db.collection('requestLog').updateMany({activeWebSocket:true}, {$set: {activeWebSocket: false}}, (err, rslt) => {
        if (err) {
            console.log("Problem clearing systemInfo connectionState", err);
        }
    });

}
