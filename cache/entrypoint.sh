#!/usr/bin/env bash
set -x

CACHE_SIZE=${CACHE_SIZE:-1G}
CACHE_TYPE=${CAHCE_TYPE:-malloc}
GETH_HTTP_HOST=${GETH_HTTP_HOST:-localhost}
GETH_HTTP_PORT=${GETH_HTTP_PORT:-8545}
VARNISH_PORT=${VARNISH_PORT:-6081}

pid=0

# SIGTERM-handler
term_handler() {
  if [ $pid -ne 0 ]; then
    kill -SIGTERM "$pid"
    wait "$pid"
  fi
  exit 143; # 128 + 15 -- SIGTERM
}

# setup handlers
# on callback, kill the last background process, and execute the specified handler
trap 'kill ${!}; term_handler' SIGTERM

sed -i "s/localhost/${GETH_HTTP_HOST}/g" /etc/varnish/default.vcl
sed -i "s/8545/${GETH_HTTP_PORT}/g" /etc/varnish/default.vcl

exec varnishd -a :${VARNISH_PORT} -f /etc/varnish/default.vcl -s ${CACHE_TYPE},${CACHE_SIZE} -p nuke_limit=9999999 -F & varnishncsa -F "%{%H:%M:%S}t - %U - %{X-Custom-Method}i - %{X-Custom-Block-Number}i - %{X-Custom-Update-Cache}i - %{Varnish:hitmiss}x - %D usec - %O bytes" #tail -f /dev/null 
