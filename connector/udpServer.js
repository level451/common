const dgram = require('dgram');
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
                        console.log('new home binding info received', msg.home);
                        localSettings.home = msg.home;
                        localSettings.name = msg.name;
                        localSettings.description = msg.description;
                        require('fs').writeFileSync(global.settingsFile, JSON.stringify(localSettings));
                        process.exit(100);
                    }
                    break;
                case 'unbindHome':
                    if (msg.id == localSettings.ServiceInfo.id && localSettings.home) {
                        console.log('unbind command received - removing home info');
                        localSettings.home = null;
                        localSettings.description = 'Available';
                        localSettings.name = 'Not Bonded';
                        require('fs').writeFileSync(global.settingsFile, JSON.stringify(localSettings));
                        process.exit(100);
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
udpSocket.startUdpServer = function () {
    return new Promise(function (resolve, reject) {
        udpSocket.bind(41235, () => {
            try {
                let ip = getIPv4NetworkInterfaces();
                console.log(`${ip.length} Network Interfaces found`);
                for (let i = 0; i < ip.length; ++i) {
                    udpSocket.addMembership('224.0.0.49', ip[i].address); // dont care what interface right now
                    console.log(`UDP Multicast Bound to 224.0.0.49 IFace:${ip[i].address}`);
                }
            } catch (e) {
                console.log('udpaddmembership failed:', e);
                process.exit(100);
            }
            resolve();
        });
    });
};
udpSocket.sendObject = function (data) { // convert to promise?
    udpSocket.send(JSON.stringify(data), 41235, '224.0.0.49');
};
udpSocket.discover = async function (systemType = 'ALL') {
    udpSocket.sendObject({messageType: 'discover', systemType: systemType});
};
udpSocket.bindHome = async function (id, home, rioInfo, name = id, description = id) {
    // this all happens on the cs6 - from the webpage iosetup
    udpSocket.sendObject({messageType: 'bindHome', id: id, home: home, name: name, description: description});
    rioInfo.bonded = true;
    rioInfo.localSettings.home = home;
    rioInfo.localSettings.name = name;
    rioInfo.localSettings.description = description;
    rioInfo.connected == false;
    delete rioInfo.messageType;
    global.settings.connectedRios[id] = rioInfo;
    database.updateSettings('system', global.settings);
};
udpSocket.unbindHome = async function (id) {
    udpSocket.sendObject({messageType: 'unbindHome', id: id});
    delete global.settings.connectedRios[id];
    database.updateSettings('system', global.settings);
};
udpSocket.test = async function (...id) {
    return [...id];
};
module.exports = udpSocket;


function getIPv4NetworkInterfaces() {
//returns an array with all the non-loopback IPv4 networkds
// includes:
// name:(Interface Name)
// mac:(MAC address of the nic)
// address:(ipv4 address as string)
    var networkInterfaces = Object.entries(require('os').networkInterfaces());
    var IPv4Interfaces = [];
    for (var i = 0; i < networkInterfaces.length; ++i) {
        // this will iterate through each NIC
        for (var j = 0; j < networkInterfaces[i][1].length; ++j) {
            // this will iterate through each binding in each nic
            if (networkInterfaces[i][1][j].internal == false && networkInterfaces[i][1][j].family == "IPv4") {
                IPv4Interfaces.push({
                    name: networkInterfaces[i][0],
                    mac: networkInterfaces[i][1][j].mac,
                    address: networkInterfaces[i][1][j].address
                });
            }
        }
    }
    return (IPv4Interfaces);
}