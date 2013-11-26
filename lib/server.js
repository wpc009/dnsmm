'use strict';
var dns = require('native-dns'),
	dnsClient = require('dns'),
	util = require('util'),
	Consts = require('native-dns-packet').consts,
	log4js = require('log4js'),
	_ = require('underscore'),
	fs = require('fs');

///etc/dnsmm/
var config = JSON.parse(fs.readFileSync('/etc/dnsmm/conf/dnsmm.json'));

config || process.exit(1);
log4js.configure(config.logging);

var logger = log4js.getLogger('DNS-SERVER');
logger.setLevel(config.logging.level || 'INFO');
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

var ttl = config.ttl || 600;

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
			dnsAnswer(res,[dns.A({type:Consts.NAME_TO_QTYPE.A,address:c.value,name:name,ttl:ttl,})]);
		}
	};

/**
 *	res Object
 *	name String
 *	value Array[String]
 */
var dnsAnswer = function(res, value,authority,additional) {
	logger.debug('value',util.inspect(value));
	if(util.isArray(value)){
		res.answer = value;
	}
	if(util.isArray(authority)){
		res.authority = authority;
	}
	if(util.isArray(additional)){
		res.additional = additional;
	}
	/*logger.debug('ans:',util.inspect(res.answer));
	logger.debug('authority:',util.inspect(res.authority));
	logger.debug('additional:',util.inspect(res.additional));*/
	res.send();
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
	//	res.cancel();
		res = null;
	});
	req.on('message',function(err,ans){
		if(err){
			logger.error(err.stack);
			res=null;
		}else{
/*
			var addresses = _.map(ans.answer,function(a){
				logger.debug('%s, %s -> %s',Consts.QTYPE_TO_NAME[a.type],a.name,a.address);
				 return {a.type,a.name,a.address};
			});*/
			dnsAnswer(res,ans.answer,ans.authority,ans.additional);
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
	//logger.debug(util.inspect(req));
	logger.debug('[%s] got query %s',req.address.address,Consts.QTYPE_TO_NAME[q.type]);
	if(q.type === Consts.NAME_TO_QTYPE.PTR){
		dnsAnswer(res,[dns.PTR({data:'ns.dnsmm.relay',ttl:ttl})]);
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

server.serve(config.port || 8053);
logger.info('dns server start on '+ config.port);
