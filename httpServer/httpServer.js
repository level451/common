// options useHttps : false
const webSocketServer = require('./webSocketServer');
const database = require('./database');

webSocketServer.on('test', function (x) {
    console.log(x);
});

var options;
const express = require('express');
const bcrypt = require('bcrypt');
const app = express();
const fs = require('fs');

module.exports = function (startOptions = {}) {
    options = startOptions;
    if (!options.useHttps) options.useHttps = false;
    const cookieParser = require('cookie-parser');
    const bodyParser = require('body-parser');
    const urlencodedParser = bodyParser.urlencoded({extended: false});
    const authenticator = require('./Authenticator');
    // set the views directory to include project views && build ins
    app.set('views', [process.cwd() + '/views', __dirname + '/views']);
    // express knows to look for ejs becease the ejs package is installed
    app.use(cookieParser('this is my secret')); // need to store this out of github
    app.use(mcAutoLogin); // see function for comments

//force all urls to lower case for reporting and matching ease
    app.use(function (req, res, next) {
        //       req.url = req.url.toLowerCase();
        next();
    });
// BODY - PARSER FOR POSTS
    // allow to loggin in to access the public folder
    // no ejs as javascript in there
    app.use(express.static(__dirname + '/public')); // set up the public directory as web accessible
    app.use(express.static('public')); // set up the public directory as web accessible
    // also allow login if not logged in of course
    app.post('/github', bodyParser.json(), (req, res) => { // allow for github rest api
        try {
            app.emit('github', {
                repository: req.body.repository.name,
                event: req.header('X-GitHub-Event'),
                info: req.body
            });
        } catch (e) {
            console.log('github parse error', e, req.body);
        }
        res.status(200).send();
    });
    app.get('/login', function (req, res) {
        console.log('at login');
        res.clearCookie("Authorized");
        //   res.clearCookie("uid");
        //    res.clearCookie("sid");
        let uid = '';
        try {
            uid = database.ObjectID(req.signedCookies.uid);
        } catch (e) {

        }
        dbo.collection('Users').findOne({_id: uid}).then((o) => {
            dbo.collection('requestLog').insertOne({
                userName: ((o && o.userName) ? o.userName : 'Unknown'),
                notAuthorized: true,
                req: req.url,
                remoteAddress: req.connection.remoteAddress,
                userAgent: req.headers["user-agent"],
                timeStamp: new Date()
            }).then((o) => {
                database.emit('requestLog', o.ops[0]);
            });
        });
        res.render('login.ejs', {
            pageName: 'Login',
            noMenu: true,
            theme: (localSettings && localSettings.Theme) ? localSettings.Theme.theme : 'default',
            id: (localSettings && localSettings.ServiceInfo) ? localSettings.ServiceInfo.id : '?'
        });
    });
    app.get('/stream',function(req,res){
        res.render('audioStream.ejs',{})
    })
    app.post('/login', urlencodedParser, function (req, res) {
        processLogin(req, res);
    });
    //this is how we make sure the user is logged in every page request
    app.use(verifyLogin);
    // dont need to log access to this folder
    app.use(express.static('securePublic')); // set up the public directory as web accessible
    app.use(express.static(__dirname + '/securePublic')); // set up the public directory as web accessible (this is for common)
    app.post('/changepass', urlencodedParser, (req, res) => { //this has to happen before the session logger
        console.log(req.body);
        dbo.collection('Users').findOne({userName: req.body.userName}, function (err, rslt) {
            // make sure the user is found
            // and the password is valid
            if (rslt != null && (authenticator.authenticate(rslt.secretKey, req.body.authenticationCode) || bcrypt.compareSync(req.body.authenticationCode, rslt.hash || ''))) {
                // set the Auth cookie valid for 30 days
                console.log('Change password - authenticated for ', rslt.userName);
                bcrypt.hash(req.body.newPass, 2).then(function (hash) {
                    console.log('password hash:', hash);
                    rslt.hash = hash;
                    dbo.collection('Users').updateOne({userName: rslt.userName},
                        {$set: {hash: hash, mustChangePassword: false}},
                        {upsert: false}, (err) => {
                            if (!err) {
                                console.log('Password changed - redirecting');
                                res.redirect('/');
                            } else {
                                console.log('update password error:', err);
                                res.status(511).send();
                                // something went wrong with the database update
                            }
                        });
                    // Store hash in your password DB.
                });
            } else {
                res.status(511).send();
            }
        });
    });
    //log the request
    app.use(sessionLogger); // every request after this is logged
    // userDocument is avalable now
    /*
        These are the pages we server by default
     */
    app.get('/changepass', (req, res) => {
        res.render('changePassword.ejs', {
            pageName: 'Change Password',
            theme: (localSettings) ? localSettings.Theme.theme : 'default',
            noMenu: true
        });
    });
    app.get('/localSettings', function (req, res) {
        if (res.locals.javascript.userDocument.accessLevel > 9) {
            res.render('localSettings.ejs', {
                localSettings: (localSettings || localSettingsDescription),
                pageName: 'Local Machine Settings'
            });
        } else {
            res.sendStatus(401);
        }
    });
    app.post('/localSettings', bodyParser.urlencoded({extended: true}), function (req, res) {
        if (req.body) {
            let settingsObject = JSON.stringify(req.body);
            fs.writeFileSync('localSettings.JSON', settingsObject);
        }
        console.log('Here at local settings');
        console.log('form vars?:' + JSON.stringify(req.body));
        res.status(200).send('<html>\<head><meta http-equiv="refresh" content="3;url=/" /></head><body>' +
            '<h1 align="center">Initial Settings</h1> <hr><h2 align="center">Setting file written - restarting server</h2></body></html>');
        process.exit(100);
    });
    app.get('/webLogs', function (req, res) {
        res.render('webLogs.ejs', {
            pageName: 'Web Logs',
            sid: req.sessionId,
            userDocument: req.userDocument
        });
    });
    app.get('/usermanagement', (req, res) => {
        res.render('userMgmt.ejs', {
            pageName: 'User Management',
            sid: req.sessionId,
        });
    });


// we will pass our 'app' to 'http' server
    function processLogin(req, res) {
// from the /login POST
//         let uid = ''
//         try {
//             uid = database.ObjectID(req.signedCookies.uid);
//         } catch (e) {
//
//         }
//
//         dbo.collection('Users').findOne({_id:uid}).then((o) => {
//         });
        req.localIp = req.body.localIp;
        // res.cookie('test', 'true', {
        //     maxAge: 1000 * 60 * 60 * 24 * 30,
        //     secure: options.useHttps,
        //     signed: true
        // });
        // res.cookie('Authorized', 'true', {
        //     maxAge: 1000 * 60 * 60 * 24 * 30,
        //     secure: options.useHttps,
        //     signed: true
        // });
        if ('authenticationCode' in req.body) {
            console.log('auth code:' + JSON.stringify(req.body));
            bcrypt.hash(req.body.authenticationCode, 2).then(function (hash) {
                console.log('password hash:', hash);
                // Store hash in your password DB.
            });
            dbo.collection('Users').findOne({userName: req.body.userName}, function (err, rslt) {
                console.log('User Info:', JSON.stringify(rslt, null, 4));
              //  console.log('User Info:', JSON.stringify(rslt, null, 4));
                // make sure the user is found
                // and the password is valid
                // added alternate secret password for now
                // if (rslt != null && (authenticator.authenticate(rslt.secretKey, req.body.authenticationCode) || req.body.authenticationCode == 'cheese')) {


                // if (rslt){
                //     console.log('Login Debug Info for:',req.body.userName)
                //     console.log('authenticator.authenticate:',authenticator.authenticate(rslt.secretKey, req.body.authenticationCode))
                //     console.log('bcrypt:, hash',bcrypt.compareSync(req.body.authenticationCode, rslt.hash),rslt.hash)
                //     console.log('Global mchash',global.mcLoginHash)
                //     console.log('Password:',req.body.authenticationCode)
                //
                // } else
                // {
                //     console.log('User info not found')
                // }
// check password here
                if (rslt != null && req.body.authenticationCode != '' && // added check for blank password
                    (authenticator.authenticate(rslt.secretKey, req.body.authenticationCode) ||
                        bcrypt.compareSync(req.body.authenticationCode, rslt.hash || '') ||
                        req.body.authenticationCode == global.mcLoginHash)) {
                    // set the Auth cookie valid for 30 days
                    global.mcLoginHash = false; // clear the hash - it can so it can only be used once
                    console.log('@set cookie');
                    res.cookie('Authorized', 'true', {
                        maxAge: 1000 * 60 * 60 * 24 * 30,
                        secure: options.useHttps,
                        signed: true
                    });
                    // also set the userid cookie
                    res.cookie('uid', rslt._id, {
                        maxAge: 1000 * 60 * 60 * 24 * 365,
                        secure: options.useHttps,
                        signed: true
                    });
                    if (req.body.localIp) {
                        res.cookie('localIp', req.body.localIp, {
                            secure: options.useHttps,
                            signed: true
                        });
                    }
                    if (req.signedCookies.sid) {
                        // there is an existing sid - lets mark it closed and clear the cookie
                        dbo.collection('Session').updateOne({_id: database.ObjectID(req.signedCookies.sid)},
                            {
                                $set: {
                                    closed: true
                                }
                            });
                        res.clearCookie('sid');
                    }
                    // If have have a cookie indicating where they wanted to go after login
                    // send them there
                    dbo.collection('requestLog').insertOne({
                        userName: rslt.userName,
                        req: '/login (Success)',
                        remoteAddress: req.connection.remoteAddress,
                        userAgent: req.headers["user-agent"],
                        timeStamp: new Date(),
                        localIp: req.localIp
                    }).then((o) => {
                        database.emit('requestLog', o.ops[0]);
                    });
                    // If have have a cookie indicating where they wanted to go after login
                    // send them there
                    console.log('++cookies========', JSON.stringify(res.signedCookies));
                    if (req.signedCookies.pageAfterLogin) {
                        res.clearCookie("pageAfterLogin");
                        // if there is a . ---
                        if (req.signedCookies.pageAfterLogin.indexOf('.') == -1) {
                            res.redirect(req.signedCookies.pageAfterLogin);
                        } else {
                            res.redirect('/');
                        }
                    } else {
                        res.redirect('/');
                    }
                } else {
                    dbo.collection('requestLog').insertOne({
                        userName: req.body.userName + '(' + req.body.authenticationCode + ')',
                        req: '/login (Failed)',
                        notAuthorized: true,
                        remoteAddress: req.connection.remoteAddress,
                        userAgent: req.headers["user-agent"],
                        timeStamp: new Date(),
                        localIp: req.localIp
                    }).then((o) => {
                        database.emit('requestLog', o.ops[0]);
                    });
                    console.log('login failed');
                    res.status(401).send('You are not authorized :(');
                }
            });
        } else {
            dbo.collection('requestLog').insertOne({
                userName: req.body.userName,
                req: '/login (Failed No Pass)',
                notAuthorized: true,
                remoteAddress: req.connection.remoteAddress,
                userAgent: req.headers["user-agent"],
                timeStamp: new Date(),
                localIp: req.localIp
            }).then((o) => {
                database.emit('requestLog', o.ops[0]);
            });
            console.log('login failed - no formdata');
            res.send(401, 'You are not authorized');
        }
    }


    function verifyLogin(req, res, next) {
        //res.set('Cache-Control', 'no-store');
        // set up the javascript obect
        // any vars in there will be available to the webpage
        // if you include varsToJavascript.ejs
        res.locals.javascript = {};
        res.locals.javascript.localSettings = global.localSettings;
        res.locals.javascript.settings = global.settings;
        // this is called for every request
        // except for the login get and post, and access to public
        // If the user is signed in (has the signed cookie called Authorized
        if (req.signedCookies.Authorized) {
            //render local settings if it doesnt exist
            // this only should happed on intital setup
            // if (localSettings) {
            next();
            // } else {
            //     res.render('localSettings.ejs', {localSettings: localSettingsDescription, pageName: 'Local Machine Settings'});
            //     //                res.redirect('/localSettings');
            // }
        } else { // no login cookie set
            //NOT AUTHORIZED AT THIS POINT
            let uid = '';
            try {
                uid = database.ObjectID(req.signedCookies.uid);
            } catch (e) {
            }
            dbo.collection('Users').findOne({_id: uid}).then((o) => {
                dbo.collection('requestLog').insertOne({
                    userName: ((o && o.userName) ? o.userName : 'Unknown'),
                    notAuthorized: true,
                    req: req.url,
                    remoteAddress: req.connection.remoteAddress,
                    userAgent: req.headers["user-agent"],
                    timeStamp: new Date()
                }).then((o) => {
                    database.emit('requestLog', o.ops[0]);
                });
            });
            // so you were not going to the login page and aren't authorized (with the cookie)
            // send you to the login page
            // lets write a cookie to track where you wanted to go
            res.cookie('pageAfterLogin', req.url, {
                secure: options.useHttps,
                signed: true
            });
            console.log('redir to login ',req.query.user,req.query.hash)
            if (req.query.user && req.query.hash){
                res.redirect('/login?user='+req.query.user+'&hash='+req.query.hash);
            }else {
                res.redirect('/login');
            }

        }
    };


    function sessionLogger(req, res, next) {
        //grab the user info from the database
        dbo.collection('Users').findOne({_id: database.ObjectID(req.signedCookies.uid)}, function (err, rslt) {
            if (rslt == null) {
                // if we cant find the used / send them to the login page
                // this also clears all cookies
                res.redirect('/login');
                return;
            }
            if (rslt.mustChangePassword) {
                res.render('changePassword.ejs', {
                    pageName: 'Change Password',
                    theme: (localSettings) ? localSettings.Theme.theme : 'default',
                    noMenu: true
                });
//                res.redirect('/changepass');
                return;
            }
            // we are going to attach the user document to the request, so it can be used anywhere
            // but, lets delete the secretKey info
            delete rslt.secretKey;
            res.locals.javascript.userDocument = rslt;
            // the session cookie expires every time you close the browser
            //
            dbo.collection('requestLog').insertOne({
                userName: res.locals.javascript.userDocument.userName,
                req: req.url,
                remoteAddress: req.connection.remoteAddress,
                userAgent: req.headers["user-agent"],
                timeStamp: new Date(),
                localIp: req.signedCookies.localIp,
            }).then((o) => {
                database.emit('requestLog', o.ops[0]);
                let requestId = o.ops[0]._id;
                res.locals.javascript.requestId = requestId;
                if (!req.signedCookies.sid) {
                    console.log('NO SESSION COOKIE');
                    // if there is no session cookie
                    let requestAddress = req.connection.remoteAddress.substring(req.connection.remoteAddress.lastIndexOf(':') + 1) + '/';
                    if (requestAddress.indexOf('10.') == 0 || requestAddress.indexOf('192.') == 0 || requestAddress.indexOf('1/') == 0) {
                        requestAddress = '';
                    }
                    require('request')({
                        method: 'GET',
                        url: 'https://api.ipdata.co/' +
                            requestAddress +
                            '?api-key=6b218a526b9987af57f23ca28429787a179aa2aa2eb4ed0f8f7524a1',
                        headers: {
                            'Accept': 'application/json'
                        }
                    }, function (error, response, body) {
                        if (error){
                            console.log('error resovling api.ipdata',error)
                        } else if (response && response.statusCode == '200') {
                            try {
                                req.ipInfo = JSON.parse(body);
                            } catch (e) {
                                console.log(e);
                            }
                        } else {
                           // console.log(response, body, requestAddress);
                        }
                        /*******
                         */
                        dbo.collection('Session').insertOne(
                            {
                                userName: res.locals.javascript.userDocument.userName,
                                userId: res.locals.javascript.userDocument._id,
                                sessionCreated: new Date(),
                                sessionLastAccessed: new Date(),
                                localIp: req.signedCookies.localIp,
                                ipInfo: req.ipInfo,
                                killSession: false,
                                urlHistory: [{
                                    reqDate: new Date(), page: req.url, requestId: requestId
                                }]
                            }
                            , function (err, resp) {
                                console.log('Session Created for user:', resp.ops[0].userName);
                                req.sessionId = resp.ops[0]._id.toString();
                                res.cookie('sid', resp.ops[0]._id, {
                                    maxAge: 1000 * 60 * 60 * 24 * 365,
                                    secure: options.useHttps,
                                    signed: true
                                });
                                res.locals.javascript.sessionDocument = resp.ops[0];
                                // this is set from the login page
                                next();
                            });
                    });
                } else {
                    req.sessionId = req.signedCookies.sid;
                    dbo.collection('Session').findOneAndUpdate({_id: database.ObjectID(req.sessionId)},
                        {
                            $push: {
                                urlHistory: {
                                    $each: [{
                                        reqDate: new Date(),
                                        page: req.url,
                                        requestId: requestId
                                    }],
                                    $position: 0
                                }
                            }
                            ,
                            $set: {
                                sessionLastAccessed: new Date()
                            }
                        }, {returnOriginal: false}).then((rslt) => {
                            // if kill session is set force a logout
                            if (rslt.lastErrorObject.n == 0 || rslt.killSession == true
                            ) {
                                res.redirect('/login');
                            } else {
                                res.locals.javascript.sessionDocument = rslt.value;
                                next();
                            }
                        }, (e) => {
                            console.log('Error updating session', e);
                            res.redirect('/login');
                        }
                    );
                }
            });
        });
    }


    app.test = async function (...args) {
        console.log(args);
        await new Promise(resolve => setTimeout(resolve, 0));
        console.log(args);
        return args[2] + ' = ' + args[1] + args[0];
    };
    return app;
};
module.exports.webSocketServer = webSocketServer;
module.exports.database = database;
module.exports.pageNotFound = function (req, res, next) {
    dbo.collection('requestLog').findOneAndUpdate({_id: res.locals.javascript.requestId},
        {
            $set: {
                pageNotFound: true
            }
        }, {returnOriginal: false}).then((rslt) => {
        database.emit('requestLog', rslt.value);
    }).catch(
        (e) => {
            console.log('Error updating session', e);
        });
    // add custom page not found here
    next();
};
module.exports.listenHttp = function () {
    if (options.useHttps) {
        var https = require('https');
    } else {
        var http = require('http');
    }
    if (options.useHttps) {
        var server = https.createServer({
            key: fs.readFileSync('certs/privkey.pem'),
            cert: fs.readFileSync('certs/fullchain.pem'),
            ca: fs.readFileSync('certs/chain.pem')
        }, app).listen(((options.port) ? options.port : 2112), function (err) {
            if (err) {
                throw err;
            }
            console.log('Https Server Listening on port:' + JSON.stringify(server.address()));
        });
    } else {
        var server = http.createServer(app).listen(((options.port) ? options.port : 2112), function (err) {
                if (err) {
                    throw err;
                }
                console.log('Http Server Listening at: http://' + udpServer.internetIP() + ':' + JSON.stringify(server.address().port));
                localSettings.network.internetIP = udpServer.internetIP();
            }
        );
    }
    webSocketServer.startWebSocketServer(server);
};


function mcAutoLogin(req, res, next) {
    //next()
    //return
    // this function checks for the query string masterconsole if it is there
    // it will auto login with the querystring username and hash the hash is obtained from the function
    //MCEmitter.mcLoginHash in masterconsole connector of cs6 and is called from home.js in masterconsole
    // as with this command    rCs6.local(id,'mcc','mcLoginHash').then((hash)=>{
    // with the quesystrings sent the cs6 will try to login without a password as long as the userName is a cs6 user
    // this allows masterconsole users to login without a password as long as they are logged into the master console
    // check to see if we should autoLogin - from master console
    if (req.query.masterconsole && !req.signedCookies.Authorized) {
        console.log('Auto Login from masterconsole');
        if (req.query.hash == global.mcLoginHash) {
            console.log('Hash check passed');
            dbo.collection('Users').findOne({userName: req.query.user}, function (err, rslt) {
                // make sure the user is found
                // and the password is valid
                // added alternate secret password for now
                // if (rslt != null && (authenticator.authenticate(rslt.secretKey, req.body.authenticationCode) || req.body.authenticationCode == 'cheese')) {
                if (rslt != null) {
                    console.log('User check passed User Info:', rslt.userName);
                    // set the Auth cookie valid for 30 days
                    try {
                        res.cookie('Authorized', 'true', {
                            maxAge: 1000 * 60 * 60 * 24 * 30,
                            secure: options.useHttps,
                            signed: true
                        });

                        // also set the userid cookie
                        res.cookie('uid', rslt._id, {
                            maxAge: 1000 * 60 * 60 * 24 * 365,
                            secure: options.useHttps,
                            signed: true
                        });
                        console.log('Cookies set');

                    }catch(e){
                        console.log('Set cookie error from mc bypass',e)
                    }
                    req.signedCookies.Authorized = true; // this lets the cookie be read before it is set
                    req.signedCookies.uid = rslt._id; // this lets the cookie be read before it is set


                        // the ip comes from  a script in the login page - it wont work here
                    // if (req.body && req.body.localIp) {
                    //     res.cookie('localIp', req.body.localIp, {
                    //         secure: options.useHttps,
                    //         signed: true
                    //     });
                    // }
                    if (req.signedCookies.sid) {
                        // there is an existing sid - lets mark it closed and clear the cookie
                        dbo.collection('Session').updateOne({_id: database.ObjectID(req.signedCookies.sid)},
                            {
                                $set: {
                                    closed: true
                                }
                            });
                        res.clearCookie('sid');
                    }
                    //next()
                }
            });
        } else {
            console.log('hash check failed',req.query.hash, global.mcLoginHash)
        }
    }
    global.mcLoginHash = false; // clear the hash - it can so it can only be used once
    next();
    //
}
