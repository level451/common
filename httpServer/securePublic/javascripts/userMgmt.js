const subscribeEvents = [{"database": 'newEventLogEntry'}, {'wf': ''}];
import * as ws from '/javascripts/websocket.mjs';

ws.startWebsocket(subscribeEvents);
ws.on('open', function () {
    console.log('Websocket Connected');
});
console.log('User Access Level ', userDocument.accessLevel);
let users = [];
database.once('getUsersAvailable', () => {
    makeUserList();
});
window.onload = function () {
    document.getElementById('addUser').onclick = addUser;
    document.getElementById('deleteUser').onclick = deleteUser;
};


function deleteUser() {
    let userListSelect = document.getElementById('userListSelect');
    Swal.fire({
        title: 'Are you sure?',
        text: `Delete user ${userListSelect.value}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Delete'
    }).then((result) => {
        if (result.value) {
            database.deleteUsers({userName: userListSelect.value}).then((e) => {
                console.log(e);
                Swal.fire(
                    'Deleted!',
                    `${userListSelect.value} is deleted.`,
                    'success'
                );
                makeUserList();
            });
        }
    });
}


function addUser() {
    console.log('add user');
    Swal.mixin({
        confirmButtonText: 'Next &rarr;',
        showCancelButton: true,
        progressSteps: ['1', '2', '3', '4']
    }).queue([
        {
            title: 'Enter New User Login Name.',
            input: 'text',
            inputAttributes: {
                autocapitalize: 'off'
            },
            showCancelButton: true,
            confirmButtonText: 'Create',
            showLoaderOnConfirm: true,
            preConfirm: (requestedUserName) => {
                return database.getUsers({userName: requestedUserName}).then(list => {
                    if (list.length == 0) {
                        return requestedUserName;
                    } else {
                        Swal.showValidationMessage(`Login already in use by ${list[0].displayName}`);
                    }
                });
            },
            allowOutsideClick: () => !Swal.isLoading()
        },
        {
            title: `Enter First and Last names`,
            input: 'text',
            inputAttributes: {
                autocapitalize: 'on'
            }
        }
        ,
        {
            title: 'Temporary Password',
            html:
                '<input id="password" type="password" class="swal2-input" placeholder="Temporary Password" autocomplete="off">' +
                '<input id="verifyPassword" type="password" class="swal2-input" placeholder="Verify Password" autocomplete="off">',
            focusConfirm: false,
            preConfirm: () => {
                let pass1 = document.getElementById('password').value;
                let pass2 = document.getElementById('verifyPassword').value;
                if (pass1 != pass2) {
                    Swal.showValidationMessage(`The passwords do not match`);
                } else
                    return pass1;
            }
        }
        , {
            title: 'Select Access Level',
            input: 'select',
            inputOptions: Array.from(Array(parseInt(userDocument.accessLevel) + 1).keys()),
            inputPlaceholder: 'Access Level',
            preConfirm: (accessLevel) => {
                console.log(typeof accessLevel, accessLevel.length);
                if (accessLevel.length == 1) {
                    return accessLevel;
                } else {
                    Swal.showValidationMessage(`Access Level is required`);
                }
            }
        }
    ]).then((result) => {
        if (result.value) {
            database.addUsers({
                userName: result.value[0],
                displayName: result.value[1],
                hash: result.value[2],
                accessLevel: result.value[3],
                created: new Date(),
                createdBy: userDocument.userName
            }).then((e) => {
                Swal.fire(
                    'User Added',
                    'A Password change will be required at first login',
                    'success'
                );
                makeUserList();
            });
        }
    });
}


function makeUserList() {
    database.getUsers().then(rslt => {
        users = rslt;
        let userListSelect = document.getElementById('userListSelect');

        userListSelect.parentNode.replaceChild(userListSelect.cloneNode(false), userListSelect); // clears options
        userListSelect.title = "Current Users"
        userListSelect = document.getElementById('userListSelect');
        users.forEach((user) => {
            let option = document.createElement('option');
            option.value = user.userName;
            option.text = user.displayName + ' (' + user.userName + ')';
            userListSelect.appendChild(option);
        });
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