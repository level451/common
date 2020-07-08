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

function displayAccessLevel(){
    let userListSelect = document.getElementById('userListSelect');
    console.log('**',userListSelect.value)
    document.getElementById('accessLevel').innerText = window.users[userListSelect.value].accessLevel
}
function deleteUser() {
    let userListSelect = document.getElementById('userListSelect');
    Swal.fire({
        title: 'Are you sure?',
        text: `Delete user ${window.users[userListSelect.value].userName}`,
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Delete'
    }).then((result) => {
        if (result.value) {
            database.deleteUsers({userName: window.users[userListSelect.value].userName}).then((e) => {
                console.log(e);
                Swal.fire(
                    'Deleted!',
                    `${window.users[userListSelect.value].userName} is deleted.`,
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
        window.users = rslt;
        let userListSelect = document.getElementById('userListSelect');
        userListSelect.parentNode.replaceChild(userListSelect.cloneNode(false), userListSelect); // clears options
        userListSelect = document.getElementById('userListSelect');
               for (let i = 0; i < window.users.length; ++i){
            //    users.forEach((user) => {
            let option = document.createElement('option');
            option.value = i;
            option.text = window.users[i].displayName + ' (' + window.users[i].userName + ')';
            userListSelect.appendChild(option);
        };
        userListSelect.onchange = displayAccessLevel;
        displayAccessLevel();

    });
}

