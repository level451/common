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
                    if (msg.id == localSettings.ServiceInfo.id && !localSettings.home) {
                        console.log('new home binding info received', msg.home);
                        localSettings.home = msg.home;
                        require('fs').writeFileSync('localSettings.JSON', JSON.stringify(localSettings));
                        process.exit(100);
                    }
                    break;
                case 'unbindHome':
                    if (msg.id == localSettings.ServiceInfo.id && localSettings.home) {
                        console.log('unbind command received - removing home info');
                        localSettings.home = null;
                        require('fs').writeFileSync('localSettings.JSON', JSON.stringify(localSettings));
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
            udpSocket.addMembership('224.0.0.49'); // dont care what interface right now
            console.log('UDP Multicast Bound to 224.0.0.49');
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
udpSocket.bindHome = async function (id, home) {
    udpSocket.sendObject({messageType: 'bindHome', id: id, home: home});
};
udpSocket.unbindHome = async function (id) {
    udpSocket.sendObject({messageType: 'unbindHome', id: id});
};
udpSocket.test = async function (...id) {
    return [...id]
};

module.exports = udpSocket;
