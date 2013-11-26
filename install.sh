#!/bin/sh

if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

DNSMM_HOME=/usr/local/lib

if [ ! -d '$DNSMM_HOME/dnsmm' ]; then
	 mkdir $DNSMM_HOME/dnsmm
fi

cp -R lib  $DNSMM_HOME/dnsmm/

cp -R node_modules $DNSMM_HOME/dnsmm/

if [ ! -d '/etc/dnsmm' ]; then
	mkdir /etc/dnsmm
fi

if [ ! -f '/etc/dnsmm/conf/dnsmm.json' ]; then 
	cp -R conf /etc/dnsmm/
fi

if [ ! -f '/etc/init/dnsmm.conf' ]; then 
	cp dnsmm.conf /etc/init/dnsmm.conf
fi

# make logging dir
if [ ! -d '/var/log/dnsmm' ]; then
	mkdir /var/log/dnsmm
	chown www-data /var/log/dnsmm
fi

