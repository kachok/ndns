ndns -- dns client/server library for nodejs
==============================

## Synposis

An example DNS server written with node which responds 'Hello World':

	var ndns = require('ndns');

	ndns.createServer('udp4', function (req, res) {
	        res.setHeader(req.header);
	        res.header.qr = 1;
	    res.header.aa = 1;
	    res.header.rd = 0;
	    res.header.ra = 0;
	    res.header.ancount = 0;
	    for (var i = 0; i < req.q.length; i++) {
	  res.q.add(req.q[i]);
	  res.addRR(req.q[i].name, 3600, ndns.ns_t.txt, "hello, world");
	  res.header.ancount++;
	    }
	    res.send();
	}).bind(5300);

	console.log("Server running at 0.0.0.0:5300")

To run the server, put the code into a file called example.js and execute it
with the node program:

	\> node example.js
	Server running at 0.0.0.0:5300

All of the examples in the documentation can be run similarly.

## ndns

To use the ndns server and client one must require('ndns').

DNS request messages are represented by an object like this:

	{ header:
	  { id: 39545
	    , qr: 0
	    , opcode: 0
	    , aa: 0
	    , tc: 0
	    , rd: 1
	    , ra: 0
	    , z: 0
	    , ad: 0
	    , cd: 0
	    , rcode: 0
	    , qdcount: 1
	    , ancount: 0
	    , nscount: 0
	    , arcount: 0
	  }
	  , q: 
	  { '0': 
	    { name: 'example.com'
	      , type: 1
	      , class: 1
	    }
	    , length: 1
	  }
	  , rr: 
	  { '0': 
	    { name: 'example.com'
	      , ttl: 3600
	      , class: 1
	      , type: 1
	      , rdata: '127.0.0.1'
	    }
	    '1': 
	    { name: 'example.com'
	      , ttl: 3600
	      , class: 1
	      , type: 1
	      , rdata: '127.0.0.2'
	    }
	    , length: 2
	  }
	}

## ndns.Server

This is a dgram.Socket with the following events:

### Event: 'request'
function (request, response) {}

request is an instance of ndns.ServerRequest and response is an instance of
ndns.ServerResponse

### ndns.createServer(type, requestListener)
Return a new dns server object

The requestListener is a function which is automatially added to the 'request'
event.

For documentation on dgram.Socket, see http://nodejs.org/api.html#dgram-267

## ndns.ServerRequest

This object is created internally by a DNS-server, not by the user, and passed
as the first argument to a 'request' listener

## ndns.ServerResponse

This object is created internally by a DNS-server, not by the user. It is
passed as the second argument to the 'request' event.

### response.setHeader(headers)
Sets the response header to the request.

Example #1:
	response.setHeader(request.header);
	response.header.qr = 1;
	response.header.qa = 1;

Example #2:
	response.setHeader({
	    id: 0,
	    qr: 0,
	    rd: 1,
	    qdcount: 1});

Valid keys `id`, `qr`, `opcode`, `aa`, `tc`, `rd`, `ra`, `z`, `ad`, `cd`,
`rcode`, `qdcount`, `ancount`, `nscount` and `arcount`.

This method can be called any number of times and must be called before
`response.send()` is called;

### response.addQuestion(name, class, type)
Sets the question on the response 

# Load Balancing

## Running examples
The example code for running a load-balancing DNS server can be found at `/example/load-balance`.

The file `loadbalancing-dns.js` contains an implementation of a basic DNS nameserver which listens
on port 53 and replies to DNS queries with DNS responses following the DNS protocol
specification.
It also runs an instance of `ndns.poller.server` and `ndns.poller.client` on localhost

### Zone files
Zone files are presently coded into the `loadbalancing-nameserver.js` file in a variable called 'zone'.v
The Zone files are implemented using a tree structure and can be written to using addToTree(tree, branch, records ).
All RR records are stored as an array under a `*` key in the final leaf of the domain tree.

Example #1:
	
	ndns.nameserver.addToTree(zone, ["in","aiesec"],
	    { '*' : [
	    { name: 'aiesec.in', rr: 'SOA', ttl: '86400', dclass: 'IN', value: 'ns1.bluehost.com. root.box481.bluehost.com. 2011031102 86400 7200 3600000 300'},
	    { name: 'aiesec.in', rr: 'TXT', ttl: '14400', dclass: 'IN', value: 'v=spf1 a mx ptr include:bluehost.com ?all' },
	    { name: 'aiesec.in', rr: 'NS', ttl: '86400', dclass: 'IN', value: 'ns1.bluehost.com.' },
	    { name: 'aiesec.in', rr: 'NS', ttl: '86400', dclass: 'IN', value: 'ns2.bluehost.com.' },
	    { name: 'aiesec.in', rr: 'MX', ttl: '14400', dclass: 'IN', value: '0 aiesec.in' },
	    { name: 'aiesec.in', rr: 'A', ttl: '14400', dclass: 'IN', value: '74.220.219.81' },
	    { name: 'ns1.bluehost.com.', rr: 'A', ttl: '14400', dclass: 'IN', value: '127.0.0.1' },
	    { name: 'ns2.bluehost.com.', rr: 'A', ttl: '14400', dclass: 'IN', value: '127.0.0.2' },
	    ] } );

### Round Robin Load Balancing
Round Robin load balancing is achieved by adding the `index` = 0 and `balance` = 'rr' keys to the A record in a domain.
The `value` key should store an array of IPs among which the load will be balanced.
The `name` key can also be a array to facilitate round robin load balancing between nameservers.

Example #1 - Load balancing A records with a constant name:

	ndns.nameserver.addToTree(zone, ["ac","in","lnmiit","proxy"],
	    { '*' : [
	    { name: 'proxy.lnmiit.ac.in', rr: 'A', ttl: '14400', dclass: 'IN' value: ['172.22.2.211', '172.22.2.212'], index: 0, balance: 'rr' }
	    ]});

Example #2 - Load balancing NS records with different names:

	ndns.nameserver.addToTree(zone, ["com","google"],
	    { '*' : [
	    { name: ['ns1.google.com',
	    'ns2.google.com',
	    'ns3.google.com',
	    'ns4.google.com'], rr: 'NS', ttl: '14400', dclass: 'IN', value: ['216.239.32.10',
	                                                                     '216.239.34.10',
	                                                                     '216.239.36.10',
	                                                                     '216.239.38.10'], index: 0, balance: 'rr' }]});

### Dynamic Load Balancing
Dynamic load balancing is achieved by adding the `balance` = 'dyn' key to the A record in a domain.
The `value` key should store an array of IPs among which the load will be balanced.

Note : The servers whose IPs are mentioned should be running an instance of `ndns.poller.client` or the load balancing 
will default to round robin.

Example #1:

	ndns.nameserver.addToTree(zone, ["in","aiesec"],
	              { '*' : [
	                        { name: 'aiesec.in', rr: 'SOA', ttl: '86400', dclass: 'IN', value: 'ns1.bluehost.com. root.box481.bluehost.com. 2011031102 86400 7200 3600000 300'},
	                        { name: 'aiesec.in', rr: 'TXT', ttl: '14400', dclass: 'IN', value: 'v=spf1 a mx ptr include:bluehost.com ?all' },
	                        { name: 'aiesec.in', rr: 'NS', ttl: '86400', dclass: 'IN', value: 'ns1.bluehost.com.' },
	                        { name: 'aiesec.in', rr: 'NS', ttl: '86400', dclass: 'IN', value: 'ns2.bluehost.com.' },
	                        { name: 'aiesec.in', rr: 'MX', ttl: '14400', dclass: 'IN', value: '0 aiesec.in' },
	                        { name: 'aiesec.in', rr: 'A', ttl: '14400', dclass: 'IN', value: ['74.220.219.81', 
	                                                                                          '74.220.219.82',
	                                                                                          '127.0.0.1',
	                                                                                          '127.0.0.2'] , balance: 'dyn' }, // Dynamic Load Balancingi
	                        { name: 'ns1.bluehost.com.', rr: 'A', ttl: '14400', dclass: 'IN', value: '127.0.0.1' },
	                        { name: 'ns2.bluehost.com.', rr: 'A', ttl: '14400', dclass: 'IN', value: '127.0.0.2' },
	                      ] } );


## ndns.nameserver.getRR ( NAME )
This function retieves RR records from the tree that was created previously to store the zone file.
This returns a node in the tree of the zone file which can act as a root for the domain `name`.

Example #1:

	var root = ndns.nameserver.getRR (5000);


## ndns.nameserver.createResponse ( REQ, RES, ROOT, P_TYPE_SYMS )
This function creates a `DNS` reply, `RES` for a request `REQ` given the root node of the relevan part of the zone
file is `ROOT`. The field `p_type_syms` generally refers to `ndns.p_type_syms`, but it can point to a user implementation as well.

Example #1:

	ndns.nameserver.createResponse (req, res, root, ndns.p_type_syms);


## ndns.poller.server.createServer ( POLL_PORT, POLL_IP )
This function creates a server which listens on a port (default 5000) for UDP packets from `ndns.poller.client`.
It maintains a list of the IP addresses of the fastest webservers within a particular domain. The `POLL_IP` refers 
to the interface on which the poller server is created.

Example #1:

	var ndns = require('../lib/ndns');
	ndns.poller.server.createServer (5000);


## ndns.poller.client.startPoller ( server_host, server_port, domain_name)
This function create a client which sends UDP packet updates to `ndns.poller.server`. 
	
Example #1:

	var ndns = require('../lib/ndns');
	ndns.poller.client.startPoller ( '127.0.0.1', 5000, 'google.com' );

