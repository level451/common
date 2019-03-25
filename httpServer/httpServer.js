// options useHttps : false

const webSocketServer = require('./webSocketServer')
webSocketServer.on('test',function(x){console.log(x)})
module.exports.webSocketServer = webSocketServer
module.exports.start = function(options) {

    if (!options){options = {}}
    if (!options.useHttps) options.useHttps = false;

    const express = require('express');
    const app = express();
    if (options.useHttps){
        var https = require('https');
    } else
    {
        var http = require('http');
    }

    const fs = require('fs');
    const cookieParser = require('cookie-parser');
    const bodyParser = require('body-parser');
    const urlencodedParser = bodyParser.urlencoded({extended: false});
    const authenticator = require('./Authenticator');



// express knows to look for ejs becease the ejs package is installed
    app.use(cookieParser('this is my secret')) // need to store this out of github
// BODY - PARSER FOR POSTS


//GET home route
    app.use(express.static('public')); // set up the public directory as web accessible

    app.use(verifyLogin);


    app.get('/login', function (req, res) {
        console.log('at login')
        res.clearCookie("Authorized");
        res.clearCookie("uid");
        res.clearCookie("sid");
        res.render('login.ejs', {pageName: 'Login', noMenu: true});
    });

    app.get('/localSettings', function (req, res) {

        res.render('localSettings.ejs', {localSettings: localSettings, pageName: 'Local Maching Settings'});
    });

    app.post('/localSettings', bodyParser.urlencoded({extended: true}), function (req, res) {
        if (req.body) {
            let settingsObject = JSON.stringify(req.body)
            fs.writeFileSync('localSettings.JSON', settingsObject);
        }

        console.log('Here at local settings')
        console.log('form vars?:' + JSON.stringify(req.body))
        res.status(200).send('<html>\<head><meta http-equiv="refresh" content="3;url=/" /></head><body>' +
            '<h1 align="center">Initial Settings</h1> <hr><h2 align="center">Setting file written - restarting server</h2></body></html>')
        process.exit(100)
    })
    app.post('/login', urlencodedParser, function (req, res) {
        processLogin(req, res)
    });


// we will pass our 'app' to 'http' server
    if (options.useHttps){
        var server = https.createServer({
            key: fs.readFileSync('certs/privkey.pem'),
            cert: fs.readFileSync('certs/fullchain.pem'),
            ca: fs.readFileSync('certs/chain.pem')
        }, app).listen(((options.port) ? options.port : 2112), function (err) {
            if (err) {
                throw err
            }
            console.log('Https Server Listening on port:' + JSON.stringify(server.address()))


        });

    } else
    {
        var server = http.createServer(app).listen(((options.port) ? options.port : 2112),function(err){
            if (err){
                throw err
            }
            console.log('Http Server Listening on port:'+JSON.stringify(server.address()))}
        );
    }

    webSocketServer.startWebSocketServer(server)

    function processLogin(req, res) {
// from the /login POST
        if ('authenticationCode' in req.body) {

            console.log('auth code:' + JSON.stringify(req.body))
            dbo.collection('Users').findOne({userName: req.body.userName}, function (err, rslt) {
                console.log(rslt)
                if (rslt != null && authenticator.authenticate(rslt.secretKey, req.body.authenticationCode)) {
                    console.log('OPtions.usehttps',options.useHttps)
                    res.cookie('Authorized', 'true', {
                        maxAge: 1000 * 60 * 60 * 24 * 30,
                        secure: options.useHttps,
                        signed: true
                    })
                    res.cookie('uid', rslt._id, {maxAge: 1000 * 60 * 60 * 24 * 30, secure: options.useHttps, signed: true})
                    res.redirect('/')

                } else {
                    console.log('login failed')
                    res.status(401).send('You are not authorized :(')
                }

            })


        } else {
            console.log('login failed - no formdata')
            res.send(401, 'You are not authorized')
        }


    }
    function verifyLogin(req, res, next) {
        app.emit('test',req.url)

        //console.log(req.connection.remoteAddress + ':' + req.url);
        //render local settings if it isnt there
        // user is not logged in here

        if (!localSettings) {


            // if thier posting the local setting - bypass login requirement
            if (req.method === 'POST' && req.url == '/localSettings') {
                next();
                return;
            } else {
                // no local settings so user database isnt accessible
                res.render('localSettings.ejs', {
                    localSettings: localSettingsDescription,
                    pageName: 'First Time Setup:Local Maching Settings'
                });
                return;
            }

        }
        //grap the user info from the database
        if (req.signedCookies.Authorized || (req.url == '/login')) {


            if (req.url == '/login') {
                next();
                return;
            }
            dbo.collection('Users').findOne({_id: database.ObjectID(req.signedCookies.uid)}, function (err, rslt) {
                if (rslt == null) {
                    res.redirect('/login')


                    return;
                }
                // console.log('user found',rslt)
                // remove secretKey
                delete rslt.secretKey;
                req.userDocument = rslt;


                if (!req.signedCookies.sid) {
                    dbo.collection('Session').insertOne({killSession: false}, function (err, resp) {
                        console.log('Session Created:', resp.ops[0])
                        req.sessionId = resp.ops[0]._id.toString();
                        res.cookie('sid', resp.ops[0]._id, {secure: options.useHttps, signed: true});

                        next();
                    })
                } else {
                    dbo.collection('Session').findOne({_id: database.ObjectID(req.signedCookies.sid)}, function (err, rslt) {
                        if (rslt == null) {
                            console.log('Session Not found', rslt);
                        }
                        if (rslt.killSession == true){
                            res.redirect('/login')
                        }
                        req.sessionId = rslt._id
                        next();
                    })
                }
            })
        } else { // no login cookie set
            res.redirect('/login')

        }


    };
    return app

}
