const speakeasy = require('speakeasy')
//var secret = speakeasy.generateSecret({length:16}); // 16 min for google auth
const secret = { ascii: 'T4q)b1}RGw$kOR7k',
    hex: '5434712962317d524777246b4f52376b',
    base32: 'KQ2HCKLCGF6VER3XERVU6URXNM',
    otpauth_url: 'otpauth://totp/SecretKey?secret=KQ2HCKLCGF6VER3XERVU6URXNM' }

const QRCode = require('qrcode');



exports.qrcodeFromSecret = function(secret) {
    const companyName = 'SAI%20/%20Wiz%20Computing'
    return new Promise(function (resolve, reject) {
        require('qrcode').toDataURL('otpauth://totp/' + companyName + '?secret=' + secret, (err, url) => {
            if (!err) {
                resolve(url)
            } else {
                reject(err)
            }
        })
    })


}
exports.authenticate = function(secret,token){
    return speakeasy.totp.verify({ secret: secret,
        encoding: 'base32',
        token: token,
        window:1 })

}