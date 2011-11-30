//
// Load Balancing DNS server
//

var dgram = require('dgram');
var ndns = require('../lib/ndns');
var util = require('util');
var p_type_syms = ndns.p_type_syms;


var BIND_PORT = 53;
var POLL_PORT = 5000;

// Zone file information
var zone = {}

// All domain names should be in lower case
addToTree(zone, ["in","aiesec"], 
                { '*' : [ 
                          { name: 'aiesec.in', rr: 'SOA', ttl: '86400', dclass: 'IN', value: 'ns1.bluehost.com. root.box481.bluehost.com. 2011031102 86400 7200 3600000 300'},
                          { name: 'aiesec.in', rr: 'TXT', ttl: '14400', dclass: 'IN', value: 'v=spf1 a mx ptr include:bluehost.com ?all' },
                          { name: 'aiesec.in', rr: 'NS', ttl: '86400', dclass: 'IN', value: 'ns1.bluehost.com.' },
                          { name: 'aiesec.in', rr: 'NS', ttl: '86400', dclass: 'IN', value: 'ns2.bluehost.com.' },
                          { name: 'aiesec.in', rr: 'MX', ttl: '14400', dclass: 'IN', value: '0 aiesec.in' },
                          { name: 'aiesec.in', rr: 'A', ttl: '14400', dclass: 'IN', value: ['74.220.219.81', '74.220.219.82','127.0.0.1','127.0.0.2'] , balance: 'dyn' },
                          { name: 'ns1.bluehost.com.', rr: 'A', ttl: '14400', dclass: 'IN', value: '127.0.0.1' },
                          { name: 'ns2.bluehost.com.', rr: 'A', ttl: '14400', dclass: 'IN', value: '127.0.0.2' },
                        ] } );
addToTree(zone, ["com","google"],
								{ '*' : [
													{ name: ['ns1.google.com',
                                   'ns2.google.com',
                                   'ns3.google.com',
                                   'ns4.google.com'], rr: 'NS', ttl: '14400', dclass: 'IN', value: ['216.239.32.10',
                                                                                                    '216.239.34.10',
                                                                                                    '216.239.36.10',
                                                                                                    '216.239.38.10'], index: 0, balance: 'rr' } 
												]
								} );									
addToTree(zone, ["in","ac","lnmiit","proxy"], 
                { '*' : [
                          { name: 'proxy.lnmiit.ac.in', rr:'A', ttl: '14400', dclass: 'IN', value: ['172.22.2.211','172.22.2.212'], index: 0, balance: 'rr' }
                        ] } );


// DNS Server implementation

var dns_server = ndns.createServer('udp4');

// Polling Server Startup
ndns.poller.server.createServer(POLL_PORT);
ndns.poller.client.startPoller('127.0.0.1', POLL_PORT, 'aiesec.in');

dns_server.on("request", function(req, res) {
  res.setHeader(req.header);
  for (var i = 0; i < req.q.length; i++)
    res.addQuestion(req.q[i]);
  if (req.q.length > 0) {
    var name = req.q[0].name;
    if (name == ".")
      name = "";
    var root = getRR(name);
   	if(root) 
	    createResponse(req, res, root, p_type_syms)
		else{
			res.header.rcode = 0x8;
			res.header.qr = 1;
			res.header.ra = 1;
			res.header.aa = 0;
			res.header.rd = 0;
			res.header.ancount = 0;
			res.header.nscount = 0;
			res.header.arcount = 0;
		}
  }
  res.send();
});

dns_server.bind(BIND_PORT);

