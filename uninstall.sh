#!/bin/sh
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

rm -rf /usr/local/lib/dnsmm
rm -rf /etc/init/dnsmm.conf
rm -rf /var/log/dnsmm
rm -rf /etc/dnsmm
