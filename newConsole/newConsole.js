/**
 * Super useful logger
 *
 * Currently no loggers out there that log time, filename and line number
 *
 *
 * Example output:
 * 2010-01-17 11:43:37.987 [info] Message in models/User.js:120
 */
// var fs = require("fs"),
util = require("util");
//
//
// // Colours
// const red   = '44',
//     blue  = '34m',
//     reset = '\033[0m';
//
const oldconsole = console
process.stdout.write('NewConsole Active!'+'\n')
module.exports = {

    log: function() {
        Error.stackTraceLimit = 2
        let stackInfo =   Error().stack.split('\n')
        Error.stackTraceLimit = 10
        let fileNameStart = stackInfo[2].lastIndexOf('\\')+1
        let fileNameEnd = stackInfo[2].indexOf(':',fileNameStart)
        let fileName = stackInfo[2].substring(fileNameStart,fileNameEnd)+':'+
            stackInfo[2].substring(fileNameEnd+1,stackInfo[2].lastIndexOf(':'));

        //console.log.apply(console,arguments)
        let string = util.format( util.format.apply(this, arguments));
        if (string.length > 100 || string.includes('\n')){
            process.stdout.write(''.padEnd(100)+Date().toString().substr(16,9)+
                colourise(34,fileName.padEnd(20))+'\n' )

            process.stdout.write(string+'\n')
        } else
        {

            process.stdout.write(string.padEnd(100)+Date().toString().substr(16,9)+
                colourise(34,fileName.padEnd(20))+'\n')

        }
        // process.stdout.write(arguments[0] + '-'+module.filename+"\n");
        return
    },

    info: function() {
        oldconsole.info(util.format( util.format.apply(this, arguments)))

    },

    trace:function() {
        oldconsole.log("------TRACE--------")

        oldconsole.info(util.format( util.format.apply(this, arguments)))

    },

    error: function() {


        oldconsole.log("------ERROR--------")

        Error.stackTraceLimit = 2
        let stackInfo =   Error().stack.split('\n')
        Error.stackTraceLimit = 10
        let fileNameStart = stackInfo[2].lastIndexOf('\\')+1
        let fileNameEnd = stackInfo[2].indexOf(':',fileNameStart)
        let fileName = stackInfo[2].substring(fileNameStart,fileNameEnd)+':'+
            stackInfo[2].substring(fileNameEnd+1,stackInfo[2].lastIndexOf(':'));

        //console.log.apply(console,arguments)
        let string = util.format( util.format.apply(this, arguments));
        if (string.length > 100 || string.includes('\n')){
            process.stdout.write(''.padEnd(100)+Date().toString().substr(16,9)+
                colourise(34,fileName.padEnd(20))+'\n' )

            process.stdout.write(string+'\n')
        } else
        {

            process.stdout.write(string.padEnd(100)+Date().toString().substr(16,9)+
                colourise(34,fileName.padEnd(20))+'\n')

        }
        oldconsole.trace(util.format( util.format.apply(this, arguments)))

        process.stdout.write('---------------'+'\n')

        // process.stdout.write(arguments[0] + '-'+module.filename+"\n");
        return
    }

}

function getTrace(call) {
    return {
        file: call.getFileName(),
        lineno: call.getLineNumber(),
        timestamp: new Date().toUTCString()
    }
}

function colourise(colourCode, string) {
    return "\x1b[" + colourCode + "m"  + string + "\033[0m";
}
function MyError() {
    Error.captureStackTrace(this);
}