export function toMMDDHHMMSS(inDate) {
    let d = new Date(inDate)
    return padl(d.getMonth() + 1) + '/' + padl(d.getDate()) + ' ' + padl(d.getHours()) + ':' + padl(d.getMinutes())+ ':' + padl(d.getSeconds());
}
export function toMMDDHHMM(inDate) {
    let d = new Date(inDate)
    return padl(d.getMonth() + 1) + '/' + padl(d.getDate()) + ' ' + padl(d.getHours()) + ':' + padl(d.getMinutes());
}
export function toMMDD(inDate) {
    let d = new Date(inDate)
    return padl(d.getMonth() + 1) + '/' + padl(d.getDate());
}


function padl(str) {
    str = str.toString()
    var pad = "00"
    return pad.substring(0, pad.length - str.length) + str

}
