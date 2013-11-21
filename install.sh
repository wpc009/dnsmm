#!/bin/sh

if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

DNSMM_HOME=/usr/local/lib

mkdir $DNSMM_HOME/dnsmm

cp ./lib/server.js $DNSMM_HOME/dnsmm/server.js

mkdir $DNSMM_HOME/dnsmm/conf

cp ./conf/* $DNSMM_HOME/conf/

cp dnsmm.conf /etc/init/dnsmm.conf
