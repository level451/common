module.exports = function(msg){
    if (Buffer.isBuffer(msg)){
        msg = msg.toString()
    }
    return(JSON.parse(msg))
// test comment
    //two
//three
}
