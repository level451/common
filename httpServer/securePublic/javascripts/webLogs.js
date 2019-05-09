const subscribeEvents = [{"database": "requestLog"}];
import * as ws from '/javascripts/webSocket.mjs';
import * as formatDate from '/javascripts/formatDate.mjs';

let requestLogSkip = 0;
let sessionSkip = 0;
var requestLog = [];
var sessionData;
var requestLogFilter = {};
const sessionHistoyDisplayLength = 15;
let filterButtons = document.getElementById('filterButtons').innerHTML;
ws.startWebsocket(subscribeEvents);
// test :
//httpServer.getSessionLog().then(function(x){console.log(x)})
database.once('getSessionLogAvailable', () => {
    database.getSessionLog(sessionHistoyDisplayLength).then(data => {
        sessionData = data;
        drawSessionTable();
    });
});
database.once('getRequestLogAvailable', () => {
    database.getRequestLog(20, 0).then(data => {
        requestLog = data;
        drawRequestTable();
    });
});
//emited from websocket every time a new request is made
database.on('requestLog', (d => {
    let indexValue = requestLog.findIndex(o => o._id == d._id);
    if (indexValue == -1) {
        requestLog.unshift(d);
        console.log('new');
    } else {
        requestLog[indexValue] = d;
        console.log('update');
    }
    drawRequestTable();
}));


function drawRequestTable() {
    let table = document.getElementById('requestLogTable');
    if (!table.tBodies[0]) {
        var tbody = table.createTBody();
    } else {
        var tbody = table.tBodies[0];
        // clear the table
        tbody.innerHTML = '';
    }
    for (let i = 0; i < (requestLog.length); i++) {
        let row = tbody.insertRow(-1);
        if (requestLog[i].activeWebSocket) row.style.backgroundColor = 'lawngreen';
        if (requestLog[i].notAuthorized) row.style.backgroundColor = 'red';
        if (requestLog[i].pageNotFound) row.style.backgroundColor = 'yellow';
        row.insertCell(-1).innerHTML = formatDate.toMMDDHHMMSS(requestLog[i].timeStamp);
        row.insertCell(-1).innerHTML = requestLog[i].userName + ((requestLog[i].localIp) ? '(' + requestLog[i].localIp + ')' : '');
        row.insertCell(-1).innerHTML = requestLog[i].req;
        row.insertCell(-1).innerHTML = requestLog[i].remoteAddress;
        if (requestLog[i].activeWebSocket) {
            row.insertCell(-1).innerHTML = '<button onclick="killSession(\'' + requestLog[i]._id + '\')">Log Out User</button>';
        }
    }
}


window.killSession = function (id) {
    ws.sendObject({killSession: true, requestLogId: id});
};


function drawSessionTable() {
    let table = document.getElementById('sessionInfoTable');
    if (!table.tBodies[0]) {
        var tbody = table.createTBody();
    } else {
        var tbody = table.tBodies[0];
        // clear the table
        tbody.innerHTML = '';
    }
    for (let i = 0; i < sessionHistoyDisplayLength; i++) {
        if (sessionData[i]) {
            let row = tbody.insertRow(-1);
            row.style.verticalAlign = "top";
            if (sessionData[i].closed) row.style.backgroundColor = 'lightgrey';
            row.insertCell(-1).innerHTML = formatDate.toMMDDHHMM(sessionData[i].sessionLastAccessed);
            row.insertCell(-1).innerHTML = sessionData[i].userName;
            row.insertCell(-1).innerHTML = nestedDetails(sessionData[i].urlHistory);
            row.insertCell(-1).innerHTML = detailsIpInfo(sessionData[i].ipInfo);
            row.insertCell(-1).innerHTML = sessionData[i].localIp;
            row.insertCell(-1).innerHTML = sessionData[i].urlHistory.length;
        } else {
            let row = tbody.insertRow(-1);
            row.insertCell(-1).innerHTML = '<br>';
        }
    }
}


function detailsIpInfo(o) {
    if (!o || o.city == undefined) {
        return '-';
    } else {
        // have ipInfo
        let details = `<details><summary>${o.city},${o.region_code}</summary><ul>
<li>TimeZone:${o["time_zone"].abbr}</li>
<li>${["country_name"]}</li>
<li>${o["continent_name"]}</li>
<li>${o["organisation"]}</li>
<li>${o["postal"]}</li>
<li>Tor:${o.threat["is_tor"]}</li>
<li>Proxy:${o.threat["is_proxy"]}</li>
<li>Anon:${o.threat["is_anonymous"]}</li>
<li>Attacker:${o.threat["is_known_attacker"]}</li>
<li>Abuser:${o.threat["is_known_abuser"]}</li>
<li>Threat:${o.threat["is_threat"]}</li>
<li>Bogon:${o.threat["is_bogon"]}</li>
</ul></details>`;
        return details;
    }
}


// function nestedDetails(d) {
//          let o = {};
//
//     d.forEach((e) => {
//         let date = formatDate.toMMDD(e.reqDate);
//         if (!o[date]) {
//             o[date] = {count: 0, details: document.createElement('details')};
//         }
//         let subDetail = document.createElement('details')
//
//         subDetail.addEventListener('click',function(e){getRequestLogDetails(this)})
//         subDetail.id = e.requestId
//         subDetail.style.marginLeft = '10px'
//         let summary = document.createElement('summary')
//         summary.innerHTML=(formatDate.toMMDDHHMM(e.reqDate) +' ' + e.page )
//         console.log(summary)
//         subDetail.appendChild(summary)
//         subDetail.innerHTML='Loading...'
//         // o[date].details.innerHTML= '<details ontoggle=getRequestLogDetails(this) id="' + e.requestId + '" style="margin-left: 10px"><summary>' + formatDate.toMMDDHHMM(e.reqDate) +
//         //     ' ' + e.page + '</summary>' +
//         //     'Loading...</details>';
//         o[date].details.appendChild(subDetail)
//         ++o[date].count;
//
//     });
//
//
//     let v = '';
//     v += "<details><summary>" + formatDate.toMMDDHHMM(d[0].reqDate) + ' ' + d[0].page + "</summary>";
//     for (const e in o) {
//         //console.log(o[e])
//         return o[e].details
//         break;
//
//         v += '<details style="margin-left: 10px"><summary >' + e + ' (' + o[e].count + ')</summary>';
//         v += o[e].details;
//         v += '</details>';
//     }
//     v += "</details>";
//     return v;
// }
function nestedDetails(d) {
    let o = {};
    d.forEach((e) => {
        let date = formatDate.toMMDD(e.reqDate);
        if (!o[date]) {
            o[date] = {count: 0, details: ''};
        }
        o[date].details +=
            `<details ontoggle=getRequestLogDetails(this) id="${e.requestId}" style="margin-left: 10px"><summary>
            ${formatDate.toMMDDHHMM(e.reqDate)} ${e.page}</summary>
            <p>Loading...</p></details>`;
        ++o[date].count;
    });
    for (const e in o) {
    }
    let v = '';
    v += `<details><summary>${formatDate.toMMDDHHMM(d[0].reqDate)} ${d[0].page}</summary>`;
    for (const e in o) {
        v += `<details style="margin-left: 10px"><summary >${e}(${o[e].count})</summary>
        ${o[e].details}</details>`;
    }
    v += "</details>";
    return v;
}


window.getRequestLogDetails = function (e) {
    let details = e.children[1];
    if (e.open) {
        database.getRequestLogById(e.id).then((r) => {
            if (r) {
                details.innerHTML =
                    `RemoteAddress:${r.remoteAddress}<br>
Active: ${r.activeWebSocket}<br>
ConnectedTime: ${Number((r.activeWebSocket) ? ((new Date() - new Date(r.websocketOpenTime)) / 60000) : r.connectedTimeMinutes).toFixed(1)} Minutes <br>
userAgent: ${r.userAgent}`;
            } else {
                details.innerHTML + 'Data Not Available';
            }
        });
    } else {
        details.innerHTML = 'Loading...';
    }
};
document.getElementById('requestLogNextRecords').addEventListener('click', (e) => {
    requestLogSkip -= 20;
    if (requestLogSkip < 0) requestLogSkip = 0;
    database.getRequestLog(20, requestLogSkip, requestLogFilter).then(data => {
        requestLog = data;
        drawRequestTable();
    });
});
document.getElementById('requestLogPrevRecords').addEventListener('click', (e) => {
    requestLogSkip += 20;
    database.getRequestLog(20, requestLogSkip, requestLogFilter).then(data => {
        requestLog = data;
        drawRequestTable();
    });
});
document.getElementById('sessionNextRecords').addEventListener('click', (e) => {
    sessionSkip -= sessionHistoyDisplayLength;
    if (sessionSkip < 0) sessionSkip = 0;
    database.getSessionLog(sessionHistoyDisplayLength, sessionSkip).then(data => {
        sessionData = data;
        drawSessionTable();
    });
});
document.getElementById('sessionPrevRecords').addEventListener('click', (e) => {
    sessionSkip += sessionHistoyDisplayLength;
    database.getSessionLog(sessionHistoyDisplayLength, sessionSkip).then(data => {
        sessionData = data;
        drawSessionTable();
    });
});


function createFilterEventListeners() {
    document.getElementById('filterReset').addEventListener('click', (e) => {
        requestLogFilter = {};
        requestLogSkip = 0;
        document.getElementById('filterButtons').innerHTML = filterButtons;
        createFilterEventListeners();
        database.getRequestLog(20, requestLogSkip, requestLogFilter).then(data => {
            requestLog = data;
            drawRequestTable();
        });
    });
    document.getElementById('filterPage').addEventListener('click', (e) => {
        console.log(e, e.target.id, e.target.parentNode);
        let cell = e.target.parentNode;
        // scan each of the filter elements and disable any other filters so they cant change
        fitlerDisableOptions(cell, e);
        cell.removeChild(e.target.parentNode.firstChild);
        database.getRequestLogDistinct('req', requestLogFilter).then(data => {
            let select = document.createElement("select");
            data.sort(function (a, b) {
                if (a.toLowerCase() < b.toLowerCase()) return -1;
                if (a.toLowerCase() > b.toLowerCase()) return 1;
                return 0;
            });
            select.options.add(new Option('All Pages', ''));
            data.forEach((item) => {
                select.options.add(new Option(item, item));
            });
            select.addEventListener('change', (e) => {
                requestLogSkip = 0;
                if (e.target.value) {
                    requestLogFilter.req = e.target.value;
                } else {
                    delete requestLogFilter.req;
                }
                database.getRequestLog(20, requestLogSkip, requestLogFilter).then(data => {
                    requestLog = data;
                    drawRequestTable();
                });
                console.log(e.target.value);
            });
            cell.appendChild(select);
        });
    });
    document.getElementById('filterUser').addEventListener('click', (e) => {
        console.log(e, e.target.id, e.target.parentNode);
        let cell = e.target.parentNode;
        // scan each of the filter elements and disable any other filters so they cant change
        fitlerDisableOptions(cell, e);
        cell.removeChild(e.target.parentNode.firstChild);
        database.getRequestLogDistinct('userName', requestLogFilter).then(data => {
            let select = document.createElement("select");
            data.sort(function (a, b) {
                if (a.toLowerCase() < b.toLowerCase()) return -1;
                if (a.toLowerCase() > b.toLowerCase()) return 1;
                return 0;
            });
            let op = new Option();
            select.options.add(new Option('All Users', ''));
            data.forEach((item) => {
                select.options.add(new Option(item, item));
            });
            select.addEventListener('change', (e) => {
                requestLogSkip = 0;
                if (e.target.value) {
                    requestLogFilter.userName = e.target.value;
                } else {
                    delete requestLogFilter.userName;
                }
                database.getRequestLog(20, requestLogSkip, requestLogFilter).then(data => {
                    requestLog = data;
                    drawRequestTable();
                });
                console.log(e.target.value);
            });
            cell.appendChild(select);
        });
    });
    document.getElementById('filterIpAddress').addEventListener('click', (e) => {
        console.log(e, e.target.id, e.target.parentNode);
        let cell = e.target.parentNode;
        // scan each of the filter elements and disable any other filters so they cant change
        fitlerDisableOptions(cell, e);
        cell.removeChild(e.target.parentNode.firstChild);
        database.getRequestLogDistinct('remoteAddress', requestLogFilter).then(data => {
            let select = document.createElement("select");
            data.sort(function (a, b) {
                if (a.toLowerCase() < b.toLowerCase()) return -1;
                if (a.toLowerCase() > b.toLowerCase()) return 1;
                return 0;
            });
            select.options.add(new Option('All IP Addresses', ''));
            data.forEach((item) => {
                select.options.add(new Option(item, item));
            });
            select.addEventListener('change', (e) => {
                requestLogSkip = 0;
                if (e.target.value) {
                    requestLogFilter.remoteAddress = e.target.value;
                } else {
                    delete requestLogFilter.remoteAddress;
                }
                database.getRequestLog(20, requestLogSkip, requestLogFilter).then(data => {
                    requestLog = data;
                    drawRequestTable();
                });
                console.log(e.target.value);
            });
            cell.appendChild(select);
        });
    });
    // document.getElementById('filterActive').addEventListener('click', (e) => {
    //     console.log(e, e.target.id, e.target.parentNode);
    //     let cell = e.target.parentNode;
    //     cell.removeChild(e.target.parentNode.firstChild);
    //     let select = document.createElement("select");
    //     select.options.add(new Option('Active/Inactive', ''));
    //     select.options.add(new Option('Active', 'true'));
    //     select.value = 'true';
    //     select.dataset.doNotDisable = true;
    //     select.addEventListener('change', (e) => {
    //         requestLogSkip = 0;
    //         if (e.target.value) {
    //             requestLogFilter.activeWebSocket = ((e.target.value == 'true') ? true : false);
    //         } else {
    //             delete requestLogFilter.activeWebSocket;
    //         }
    //         database.getRequestLog(20, requestLogSkip, requestLogFilter).then(data => {
    //             requestLog = data;
    //             drawRequestTable();
    //         });
    //         console.log(e.target.value);
    //     });
    //     cell.appendChild(select);
    //     select.dispatchEvent(new Event('change'));
    // });
    // document.getElementById('filterActive').addEventListener('change', (e) => {
    //     requestLogSkip = 0;
    //     if (e.target.checked) {
    //         requestLogFilter.activeWebSocket = true;
    //     } else {
    //         delete requestLogFilter.activeWebSocket;
    //     }
    //     database.getRequestLog(20, requestLogSkip, requestLogFilter).then(data => {
    //         requestLog = data;
    //         drawRequestTable();
    //     });
    // });
    // document.getElementById('filterPageNotFound').addEventListener('change', (e) => {
    //     requestLogSkip = 0;
    //     if (e.target.checked) {
    //         requestLogFilter.pageNotFound = true;
    //     } else {
    //         delete requestLogFilter.pageNotFound;
    //     }
    //     database.getRequestLog(20, requestLogSkip, requestLogFilter).then(data => {
    //         requestLog = data;
    //         drawRequestTable();
    //     });
    // });
    // document.getElementById('filterPageNotFound').addEventListener('click', (e) => {
    //     console.log(e, e.target.id, e.target.parentNode);
    //     let cell = e.target.parentNode;
    //     cell.removeChild(e.target.parentNode.firstChild);
    //     let select = document.createElement("select");
    //     select.options.add(new Option('Found/Not Found', ''));
    //     select.options.add(new Option('Not Found', 'true',));
    //     select.value = 'true';
    //     select.dataset.doNotDisable = true;
    //     select.addEventListener('change', (e) => {
    //         requestLogSkip = 0;
    //         if (e.target.value) {
    //             requestLogFilter.pageNotFound = ((e.target.value == 'true') ? true : false);
    //         } else {
    //             delete requestLogFilter.pageNotFound;
    //         }
    //         database.getRequestLog(20, requestLogSkip, requestLogFilter).then(data => {
    //             requestLog = data;
    //             drawRequestTable();
    //         });
    //         console.log(e.target.value);
    //     });
    //     cell.appendChild(select);
    //     select.dispatchEvent(new Event('change'));
    // });
    // document.getElementById('filterNotAuthorized').addEventListener('click', (e) => {
    //     console.log(e, e.target.id, e.target.parentNode);
    //     let cell = e.target.parentNode;
    //     cell.removeChild(e.target.parentNode.firstChild);
    //     let select = document.createElement("select");
    //     select.options.add(new Option('Auth/Not Authorized', ''));
    //     select.options.add(new Option('Not Authorized', 'true'));
    //     select.value = 'true';
    //     select.dataset.doNotDisable = true;
    //     select.addEventListener('change', (e) => {
    //         requestLogSkip = 0;
    //         if (e.target.value) {
    //             requestLogFilter.notAuthorized = ((e.target.value == 'true') ? true : false);
    //         } else {
    //             delete requestLogFilter.notAuthorized;
    //         }
    //         database.getRequestLog(20, requestLogSkip, requestLogFilter).then(data => {
    //             requestLog = data;
    //             drawRequestTable();
    //         });
    //         console.log(e.target.value);
    //     });
    //     cell.appendChild(select);
    //     select.dispatchEvent(new Event('change'));
    // });
    document.getElementById('filterOptions').addEventListener('click', (e) => {
        console.log(e, e.target.id, e.target.parentNode);
        let cell = e.target.parentNode;
        cell.removeChild(e.target.parentNode.firstChild);
        let select = document.createElement("select");
        select.options.add(new Option('No Additional Filter', ''));
        select.options.add(new Option('Active Connections', 'activeWebSocket'));
        select.options.add(new Option('Not Authorized', 'notAuthorized'));
        select.options.add(new Option('Page Not Found', 'pageNotFound'));
        //select.value = 'activeWebSocket';
        select.dataset.doNotDisable = true;
        select.addEventListener('change', (e) => {
            requestLogSkip = 0;
            delete requestLogFilter.activeWebSocket;
            delete requestLogFilter.notAuthorized;
            delete requestLogFilter.pageNotFound;
            if (e.target.value) {
                requestLogFilter[e.target.value] = true;
            }
            database.getRequestLog(20, requestLogSkip, requestLogFilter).then(data => {
                requestLog = data;
                drawRequestTable();
            });
            console.log(e.target.value);
        });
        cell.appendChild(select);
        select.dispatchEvent(new Event('change'));
    });
}


function fitlerDisableOptions(cell, e) {
    for (let i = 0; i < cell.parentNode.childElementCount; ++i) {
        let element = cell.parentNode.children[i].firstElementChild;
        //console.log(element.dataset.doNotDisable);
        //console.log(element.nodeName, e.target, element == e.target);
        if (element.nodeName == 'SELECT' && element != e.target && !element.dataset.doNotDisable) {
            console.log('disable', element);
            element.disabled = true;
        }
    }
}


createFilterEventListeners();
