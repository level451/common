const subscribeEvents = [{"database": 'newEventLogEntry'}, {'wf': ''}];
import * as ws from '/javascripts/websocket.mjs';

ws.startWebsocket(subscribeEvents);
ws.on('open', function () {
    console.log('Websocket Connected');
});
console.log('User Access Level ', userDocument.accessLevel);
let users = []
database.once('getUsersAvailable', () => {
    database.getUsers().then(rslt => {
        users = rslt;
        //     rslt.forEach((user) => {
        //
        //         users[user.userName] = user;
        //         }
        //     );
        makeUserList();
    });
});

window.onload = function(){
document.getElementById('addUser').onclick = addUser
}
function addUser(){
    console.log('add user')
    Swal.fire({
        title: 'Enter New User Login Name.',
        input: 'text',
        inputAttributes: {
            autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Create',
        showLoaderOnConfirm: true,
        preConfirm: (login) => {
            return fetch(`//api.github.com/users/${login}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(response.statusText)
                    }
                    return response.json()
                })
                .catch(error => {
                    Swal.showValidationMessage(
                        `Request failed: ${error}`
                    )
                })
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.value) {
            Swal.fire({
                title: `${result.value.login}'s avatar`,
                imageUrl: result.value.avatar_url
            })
        }
    })

}
function makeUserList() {
    let userListSelect = document.getElementById('userListSelect');
    users.forEach((user) => {
        let option = document.createElement('option');
        option.value = user.userName;
        option.text = user.displayName + ' (' + user.userName + ')';
        userListSelect.appendChild(option);
    });
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