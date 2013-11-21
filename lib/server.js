'use strict';
var dns = require('native-dns'),
	dnsClient = require('dns'),
	util = require('util'),
	Consts = require('native-dns-packet').consts,
	logger = require('log4js').getLogger('DNS-SERVER'),
	_ = require('underscore'),
	fs = require('fs');


var config = JSON.parse(fs.readFileSync('../conf/dnsmm.json'));

config || process.exit(1);

var upstream = config.upstream;

upstream || logger.error('you must specific an upstream server');
/*
{
	address: '202.120.2.101',
	port: 53,
	type: 'udp'
};
*/
upstream.port = upstream.port || 53;
upstream.type = upstream.type || 'udp';

var server = dns.createServer();

var mappings = config.mappings || [];

for(var i = 0; i< mappings.length;i++){
	var mapping = mappings[i];
	mapping.regx = new RegExp(mapping.regx);
}
/*
[
{
	regx: /[\w]+\.google\.com/,
	type: 'redirect',
	value: 'www.google.cn'
},
{
	regx: /somedomain.com/,
	type: 'address',
	value: '192.168.1.3'
}
];
*/

var getValue = function(name, c, res) {
		if (c.type === 'redirect') {
			forward(res, c.value,'A');
		} else {
			dnsAnswer(res, name, [c.value]);
		}
	};

/**
 *	res Object
 *	name String
 *	value Array[String]
 */
var dnsAnswer = function(res, name, value) {
		if (util.isArray(value)) {
			value.forEach(function(v) {
				res.answer.push(dns.A({
					name: name,
					address: v,
					ttl: 600
				}));
			});
			res.send();
		}
	};

var forward = function(res, name,qtype) {
	var req = dns.Request({
		question: dns.Question({
			name:name,
			type : qtype
		}),
		server : upstream,
		timeout : 1000,
	});
	req.on('timeout',function(){
		logger.error('query %s to upstream timeout', name);
		res.cancel();
	});
	req.on('message',function(err,ans){
		if(err){
			logger.error(err.stack);
			res.cancel();
		}else{
			var addresses = _.map(ans.answer,function(a){ return a.address;});
			if(addresses && util.isArray(addresses)){
				dnsAnswer(res,name,addresses);
			}
		}
	});
	req.on('end',function(){
		logger.debug('req end for ',name);
		req = null;
	});
	req.send();
};

server.on('request', function(req, res) {
	var q = req.question && req.question[0];
	var name = q.name;
	logger.debug('got query %s',Consts.QTYPE_TO_NAME[q.type]);
	if(q.type === Consts.NAME_TO_QTYPE.PTR){
		dnsAnswer(res,name,['127.0.0.1']);
		return;
	}
	
	logger.debug('got query for %s', name);
	var match = false;
	for (var i = 0; i < mappings.length; i++) {
		var c = mappings[i];
		if (c.regx.test(name)) {
			logger.debug('got a match! ');
			getValue(name, c, res);
			match = true;
			break;
		}
	}
	if (!match) {
		logger.debug('no match forward to upstream');
		forward(res, name,Consts.QTYPE_TO_NAME[q.type]);
	}
});

server.on('error', function(err, buff, req, res) {
	logger.error(err.stack);
});

server.serve(53);