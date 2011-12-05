//
// POLLER SERVER FOR THE NDNS LOAD BALANCER
//
// Provides server side API for accessing polling information from
// all clients that are to be load balanced amongst.
//

var dgram = require('dgram');
var util = require('util');
var SERVER_BRING_ONLINE_THRESH = 0.5; // Load more than this implies bring one more server online
var SERVER_PUT_OFFLINE_THRESH = 0.3; // Load less than this means take one server offline

var clientList = new Object();
var activeList = new Object();
var min = new Object();
var servSocket;

//
// Create a server to listen for clients
//
exports.createServer = function(inerfaceIp, portNumber) {
  servSocket = dgram.createSocket('udp4');
  servSocket.on('message', function(msg, rinfo) {
    console.log(util.inspect(rinfo));
		message = eval('('+msg.toString('utf8')+')');
    data = {
      'Hostname'        : message['Hostname'],
      'IP'              : rinfo.address,
      'LoadMetric'      : message['LoadMetric']
    };
    updateClientList(data);
  });
  servSocket.bind(portNumber, interfaceIp)
};


function addToTree(tree, array , value){
  for(var i = 0, length = array.length; i < length; i++) {
    tree = tree[array[i]] = ((i == length-1)? value : (tree[array[i]] || {}));
  }
}

//
// Update data of some client in the clientList. Messages are expected in the format
// { 'Hostname' : <>, 'IP': <>, 'LoadMetric' : <> }
//
function updateClientList(data) {
  addToTree(clientList, [data['Hostname'],data['IP'],'LoadMetric'], data['LoadMetric']);
	console.log("Client List:\n"+util.inspect(clientList)+"\n----");
  for(var domain in clientList) {
    if((domain in activeList)==false) {
      activeList[domain] = [];
    }
  }
	if(activeList[data['Hostname']].length < 1 || data['IP'] in activeList[data['Hostname']]) {
    recalculateActiveList();
  }
  recalculateMinLoad();
};
exports.updateClientList = updateClientList; 

//
// Add entries to the active list
//
function recalculateActiveList() {
	console.log("Active List:\n" + util.inspect(activeList)+"\n------");
	for(var eachDomain in activeList) {
		var bringUpNewServer = false;
		for(var i=0;i<activeList[eachDomain].length;i++) {
			if(clientList[activeList[eachDomain][i]]['LoadMetric'] >= SERVER_BRING_ONLINE_THRESH) {
				bringUpNewServer = true;
				break;
			}
		}
		if(bringUpNewServer || activeList[eachDomain].length<1) {
			tmpMin = {'IP':'', 'Load':1000000};
			for(var j in clientList[eachDomain]) {
				if(clientList[eachDomain][j]['LoadMetric'] <= tmpMin['Load']) {
					tmpMin['IP'] = j;
					tmpMin['Load'] = clientList[eachDomain][j]['LoadMetric'];
				}
			}
		}
		if(tmpMin['IP']) {
			activeList[eachDomain].push(tmpMin['IP']);
		}
	}
}

//
// Calculate the name of the server with the minimum load
// in the activeList. If there is a server in the active list with load less
// than threshold then remove it.
//
function recalculateMinLoad() {
  tmpMinLoad = 100000000;
  for(var activeDomain in activeList) {
    for(var i=0;i<activeList[activeDomain].length;i++) {
      // Delete inactive entries from activeDomain
      if(clientList[activeDomain][activeList[activeDomain][i]]['LoadMetric'] < SERVER_PUT_OFFLINE_THRESH) {
        activeList[activeDomain].splice(i,i);
      }
    }
    for(var i=0;i<activeList[activeDomain].length;i++) {
      // Find min in the activeDomain
			if(clientList[activeDomain][activeList[activeDomain][i]]['LoadMetric'] <= tmpMinLoad) {
        tmpMinLoad = clientList[activeDomain][activeList[activeDomain][i]]['LoadMetric'];
        min[activeDomain] = activeList[activeDomain][i];
      }
    }
  }
};

//
// Get server with minimum load
//
exports.getServerWithMinLoad = function(hostname) {
  return min[hostname];
};
