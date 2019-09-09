const dgram = require('dgram');
let saNet = false;
// set up the udpsocket
const udpSocket = dgram.createSocket({type: 'udp4', reuseAddr: true});
udpSocket.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    udpSocket.close();
});
udpSocket.on('message', (msg, rinfo) => {
        try {
            msg = JSON.parse(msg);
        } catch (e) {
            console.log('Malformed UDP Message:', msg);
        }
        // add the addpress the message was received from
        msg.address = rinfo.address;
        if (msg.messageType) {
            // wait up to one second so everyone doesnt blast the line at once
            switch (msg.messageType) {
                case 'discover':
                    setTimeout(function () {
                        udpSocket.emit('discover', msg);
                    }, Math.round(Math.random() * 100));
                    break;
                case 'bindHome':
                    //this happens on the rio
                    if (msg.id == localSettings.ServiceInfo.id && !localSettings.home) {
                        console.log('new home binding info received', msg.home, rinfo);
                        localSettings.home = msg.home;
                        localSettings.home.address = rinfo.address;
                        localSettings.name = msg.name;
                        localSettings.description = msg.description;
                        localSettings.channel = msg.channel;
                        require('fs').writeFileSync(global.settingsFile, JSON.stringify(localSettings, null, 2));
                        process.exit(100);
                    }
                    break;
                case 'unbindHome':
                    if (msg.id == localSettings.ServiceInfo.id && localSettings.home) {
                        console.log('unbind command received - removing home info');
                        localSettings.home = null;
                        localSettings.description = 'Available';
                        localSettings.name = 'Not Bonded';
                        require('fs').writeFileSync(global.settingsFile, JSON.stringify(localSettings, null, 2));
                        process.exit(100);
                    }
                    break;
                case 'setChannel':
                    if (msg.id == localSettings.ServiceInfo.id ) {
                        console.log('channel set received:',msg.channel);
                        localSettings.channel = msg.channel;
                        require('fs').writeFileSync(global.settingsFile, JSON.stringify(localSettings, null, 2));
                    }
                    break;
                case 'setRXOnly':
                    if (msg.id == localSettings.ServiceInfo.id ) {
                        console.log('rxOnly set received:',msg.rxOnly);
                        localSettings.rxOnly = msg.rxOnly;
                        require('fs').writeFileSync(global.settingsFile, JSON.stringify(localSettings, null, 2));
                    }
                    break;

                default:
                    udpSocket.emit(msg.messageType, msg);
            }
        } else {
            udpSocket.emit('messageObject', msg);
        }
    }
);
udpSocket.on('error', (e) => {
    console.log('UDP Error:' + e);
});
udpSocket.startUdpServer = function (usesaNet = false) {
    //updated
    if (usesaNet) {
        if (!connectsaNet()) {
            console.highlight('saNet failed to start - waiting for adapter to become available');
        }
    }
    return new Promise(function (resolve, reject) {
        let ip = getIPv4NetworkInterfaces();
        let options = {port: 41235};
        // for cs6 the network.internet mac is used and required
        let udpAddress = (usesaNet) ? getIPv4NetworkInterfaces(localSettings.network.internet) : ip[0].address;
        if (process.platform != 'linux') {
            options.address = udpAddress;
        }
        udpSocket.bind(options, () => {
            try {
                udpSocket.addMembership('224.0.0.49', udpAddress); // dont care what interface right now
                console.log(`(MAIN) UDP Multicast Bound to 224.0.0.49 IFace:${udpAddress}`);
            } catch (e) {
                console.log('udpaddmembership failed:', e);
                //process.exit(100);
            }
            resolve();
        });
    });
};


function connectsaNet(startedFromTimer = false) {
    let saNetIp = getIPv4NetworkInterfaces(localSettings.network.saNet);
    if (saNetIp) {
        let options = {port: 41235};
        console.log('saNet Address from adapter:', saNetIp);
        //   if (process.platform != 'linux') {
        options.address = saNetIp;
        // }
        saNet = dgram.createSocket({type: 'udp4', reuseAddr: true});
        console.highlight('saNet created!');
        saNet.bind(options, () => {
            saNet.addMembership('224.0.0.49', saNetIp); // dont care what interface right now
            saNet.on('message', (msg, rinfo) => {
                //           console.log('sanet',msg.toString(),rinfo)
                udpSocket.emit('message', msg, rinfo);
            });
            // now that we know the saNet is available
            // start the dhcp server
            process.send({type: 'startDHCP'});
            if (startedFromTimer) {
                // if saNet wasn;t available at startup -
                // resert the git server so it binds to the saNet adapter
                process.send({type: 'restartGit'});
            }
        });
        return true;
    } else {
        setTimeout(function () {
            connectsaNet(true);
        }, 5000);
        return false;
    }
}


udpSocket.sendObject = function (data) { // convert to promise?
    udpSocket.send(JSON.stringify(data), 41235, '224.0.0.49');
    if (saNet) {
        saNet.send(JSON.stringify(data), 41235, '224.0.0.49');
    }
};
udpSocket.discover = async function (systemType = 'ALL') {
    udpSocket.sendObject({messageType: 'discover', systemType: systemType});
};
udpSocket.bindHome = async function (id, home, rioInfo, name = id, description = id,channel = 0) {
    // this all happens on the cs6 - from the webpage iosetup
    udpSocket.sendObject({messageType: 'bindHome', id: id, home: home, name: name, description: description});
    rioInfo.bonded = true;
    rioInfo.localSettings.home = home;
    rioInfo.localSettings.name = name;
    rioInfo.localSettings.description = description;
    rioInfo.connected == false;
    rioInfo.channel = channel;
    delete rioInfo.messageType;
    global.settings.connectedRios[id] = rioInfo;
    database.updateSettings('system', global.settings);
};
udpSocket.setChannel = async function(id,channel = 0){
    udpSocket.sendObject({messageType: 'setChannel', id: id,channel:channel});
    global.settings.connectedRios[id].channel  = channel;
    database.updateSettings('system', global.settings);
}
udpSocket.setRXOnly = async function(id,rxOnly = false){
    udpSocket.sendObject({messageType: 'setRXOnly', id: id,rxOnly:rxOnly});
    global.settings.connectedRios[id].rxOnly  = rxOnly;
    database.updateSettings('system', global.settings);
}

udpSocket.unbindHome = async function (id) {
    udpSocket.sendObject({messageType: 'unbindHome', id: id});
    delete global.settings.connectedRios[id];
    database.updateSettings('system', global.settings);
};
udpSocket.test = async function (...id) {
    return [...id];
};
module.exports = udpSocket;


function getIPv4NetworkInterfaces(mac = false) {
    var networkInterfaces = Object.entries(require('os').networkInterfaces());
    var IPv4Interfaces = [];
    for (var i = 0; i < networkInterfaces.length; ++i) {
        // this will iterate through each NIC
        for (var j = 0; j < networkInterfaces[i][1].length; ++j) {
            // this will iterate through each binding in each nic
            if (networkInterfaces[i][1][j].internal == false && networkInterfaces[i][1][j].family == "IPv4") {
                if (mac == networkInterfaces[i][1][j].mac) {
                    return networkInterfaces[i][1][j].address;
                }
                IPv4Interfaces.push({
                    name: networkInterfaces[i][0],
                    mac: networkInterfaces[i][1][j].mac,
                    address: networkInterfaces[i][1][j].address
                });
            }
        }
    }
    if (mac) {
        return false;
    } else {
        return (IPv4Interfaces);
    }
}