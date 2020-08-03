const EventEmitter = require('events');
const rslt = new EventEmitter();
module.exports.send = function (type, data) {
    return new Promise((resolve, reject) => {
        let id = 'id' + Date.now();
        try{
            process.send({promise: id, type: type, ...data});

        } catch(e){
                console.log('?? Unable to communitate with supervisor')
        }
          rslt.once(id, (data) => {
            if (data.reject) {
                reject(data)
            } else {
                resolve(data);
                if (type === 'startNgrok' || type ==='stopNgrok'){
                    this.ngrokUrl = data;
                   // mcc.emit('clientInfo',{type,data})
                }
            }
        });
    });
};
process.on('message', (data) => {
   // console.log('message', data);
    if (data.promise) {
        rslt.emit(data.promise, data.data);
    }
});