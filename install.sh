#!/bin/sh

if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

DNSMM_HOME=/usr/local/lib

mkdir $DNSMM_HOME/dnsmm

cp -R lib  $DNSMM_HOME/dnsmm/

cp -R node_modules $DNSMM_HOME/dnsmm/

mkdir /etc/dnsmm
cp -R conf /etc/dnsmm/

cp dnsmm.conf /etc/init/dnsmm.conf

# make logging dir
mkdir /var/log/dnsmm
chown www-data /var/log/dnsmm

