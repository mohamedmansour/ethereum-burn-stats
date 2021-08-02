#!/usr/bin/env bash
set -x

GETH_HTTP_HOST=${GETH_HTTP_HOST:-localhost}
GETH_HTTP_PORT=${GETH_HTTP_PORT:-8545}
CACHE_SIZE=${CACHE_SIZE:-1G}
CACHE_TYPE=${CAHCE_TYPE:-malloc}

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

exec varnishd -a :6081 -f /etc/varnish/default.vcl -s ${CACHE_TYPE},${CACHE_SIZE} -F & varnishncsa -F "%{%H:%M:%S}t - %U - %{X-Custom-Method}i - %{Varnish:hitmiss}x - %D usec - %O bytes" #tail -f /dev/null 
