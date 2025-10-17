#!/bin/sh
# simple wait script
host=localhost
port=8004
count=0
until nc -z $host $port; do
  count=$((count+1))
  if [ $count -gt 30 ]; then
    echo "timeout waiting for $host:$port"
    exit 1
  fi
  sleep 1
done
exit 0
