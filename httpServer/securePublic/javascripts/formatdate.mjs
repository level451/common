export function toMMDDHHMMSS(inDate) {
    let d = new Date(inDate);
    if (isNan(d)){
        return ' Invalid Date',d
    }
    return padl(d.getMonth() + 1) + '/' + padl(d.getDate()) + ' ' + padl(d.getHours()) + ':' + padl(d.getMinutes()) + ':' + padl(d.getSeconds());
}


export function toMMDDHHMMSSMS(inDate) {
    let d = new Date(inDate);
    if (isNan(d)){
        return ' Invalid Date',d
    }
    return padl(d.getMonth() + 1) + '/' + padl(d.getDate()) + ' ' + padl(d.getHours()) + ':' + padl(d.getMinutes()) + ':' + padl(d.getSeconds()) + '.' + padl(d.getMilliseconds());
}


export function toHHMMSS(inDate) {
    let d = new Date(inDate);
    if (isNan(d)){
        return ' Invalid Date',d
    }
    return padl(d.getHours()) + ':' + padl(d.getMinutes()) + ':' + padl(d.getSeconds());
}


export function toMMDDHHMM(inDate) {
    let d = new Date(inDate);
    if (isNan(d)){
        return ' Invalid Date',d
    }
    return padl(d.getMonth() + 1) + '/' + padl(d.getDate()) + ' ' + padl(d.getHours()) + ':' + padl(d.getMinutes());
}


export function toMMDD(inDate) {
    let d = new Date(inDate);
    if (isNan(d)){
        return ' Invalid Date',d
    }
    return padl(d.getMonth() + 1) + '/' + padl(d.getDate());
}


function padl(str) {
    str = str.toString();
    var pad = "00";
    return pad.substring(0, pad.length - str.length) + str;
}
