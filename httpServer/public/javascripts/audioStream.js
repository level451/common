let player
function load(){
    console.log('load')
     player = new PCMPlayer({
        encoding: '16bitInt',
        channels: 2,
        sampleRate: 44100,
        flushingTime: 50
    });
    cs6Stream()
}

async function cs6Stream(id) {
   let wsStream
    if (location.protocol === 'https:') {
        wsStream = new WebSocket('wss://' + window.location.hostname + ':' + window.location.port +
            '/?systemType=browser&stream=yes&connectToAudioStream=yes');
        console.log('Using Secure Websocket');
    } else {
        wsStream = new WebSocket('ws://' + window.location.hostname + ':' + window.location.port +
            '/?systemType=browser&stream=yes&connectToAudioStream=yes');
        console.log('Using Standard Websocket');
    }

    wsStream.onmessage = (async (msg)=>{
        msg.data.arrayBuffer().then((data)=>{
            player.feed( new Uint16Array(data));


        })
     //   console.log(await msg.data.text())
    })
    wsStream.onclose = (()=>{console.log('stream close')})
    wsStream.onerror = function (err) {
        console.log('stream error:' + err);
    };

    return wsStream
}

//
//
//
// var wss // make secure websocket available to everyone
// var cs6Info
// var navstatus;
// function load() {
//     console.log('loaded')
//     startWebsocket()
//     httpGetAsync('ejs/cs6Info.ejs',function(x){
//         cs6Info = x;
//         renderAllUnitInfo();
//
//     });
//
// }
//
// function openNav() {
//     if(navstatus =="open"){
//        closeNav();
//        return;
//     }
//     document.getElementById("mySidenav").style.width = "225px";
//     document.getElementById("mySidenav").style.opacity=1;
//     document.getElementById("unitInfo").style.marginLeft = "225px";
//     navstatus = "open"
// }
//
// function closeNav() {
//     document.getElementById("mySidenav").style.width = 0;
//     document.getElementById("mySidenav").style.opacity=0;
//     document.getElementById("unitInfo").style.marginLeft = "0px";
//     navstatus = "closed";
// }
//
//
//
// function startWebsocket(){
//     if (location.protocol === 'https:') {
//         wss = new WebSocket('wss://'+ window.location.hostname + ':'+window.location.port+
//             '/?browser=true&sid='+sid+'&subscribeEvents=["systemInfo"]')
//         console.log('Using Secure Websocket')
//     } else
//     {
//         wss = new WebSocket('ws://'+ window.location.hostname + ':'+window.location.port+
//             '/?browser=true&sid='+sid+'&subscribeEvents=["machineInfo"]')
//         console.log('Using Standard Websocket')
//     }
//
//     wss.onopen = function(){
//         console.log('websocket open')
//     }
//     wss.onmessage = function(evt){
//         data = JSON.parse(evt.data)
//         if (data.mac && data.emitterId == 'systemInfo'){
//
//             if (!systemInfo[data.mac]) systemInfo[data.mac]={}
//             systemInfo[data.mac][data.event]=data[data.event];
//             renderUnitInfo(data.mac,systemInfo[data.mac])
//             console.log('Systeminfo Update',systemInfo,data.event)
//         }
//         return
//         if (data.ssh){
//
//             console.log(data.data)
//         } else
//         {
//             console.log(evt.data)
//         }
//     }
//     wss.onerror = function(err){
//         console.log('websocket error:'+err)
//         wss.close();
//
//     }
//     wss.onclose = function (){
//         console.log('websocket close reconecting websocket')
//         setTimeout(function(){startWebsocket()},1000)
//     }
// }
//
//
// function renderUnitInfo(mac,info) {
//     if (!document.getElementById(mac)) {
//         document.getElementById('unitInfo').innerHTML = document.getElementById('unitInfo').innerHTML+ '<div class ="cs6unitinfo" id=' + mac + ' onclick="cs6unitinfoclick(id)" ></div>'
//     }
//
//     var info = new Date(systemInfo[mac].machineInfo.system.startTime).toString();
//     info = info.substring(0,24);
//     document.getElementById(mac).innerHTML = ejs.render(cs6Info, {systemInfo: systemInfo[mac]});
// }
//
// function cs6unitinfoclick(macid){
//     if(document.getElementById(macid).offsetWidth>270){
//         document.getElementById(macid).style.width = "200px";
//         document.getElementById(macid).style.height = "230px";
//         document.getElementById(macid).getElementsByClassName("cs6wrapper")[0].style.display = "none";
//         return;
//     }
//
//     var names = document.getElementsByClassName("cs6unitinfo");
//     for (var i = 0; i< names.length; i++){
//         document.getElementById(names[i].id).style.width = "200px";
//         document.getElementById(names[i].id).style.height = "230px";
//         document.getElementById(names[i].id).getElementsByClassName("cs6wrapper")[0].style.display = "none";
//     }
//     document.getElementById(macid).style.width = "600px";
//     document.getElementById(macid).style.height = "650px";
//     document.getElementById(macid).getElementsByClassName("cs6wrapper")[0].style.display = "block";
// }
//
// function renderAllUnitInfo(){
//     for (mac in systemInfo){
//         renderUnitInfo(mac,systemInfo[mac])
//     }
// }
//
// function httpGetAsync(theUrl, callback)
// {
//     var xmlHttp = new XMLHttpRequest();
//     xmlHttp.onreadystatechange = function() {
//         if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
//             callback(xmlHttp.responseText);
//     }
//     xmlHttp.open("GET", theUrl, true); // true for asynchronous
//     xmlHttp.send(null);
// }