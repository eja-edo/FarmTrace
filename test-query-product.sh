#!/bin/bash

peer chaincode query \
  -C supplychain-channel \
  -n supplychain_cc \
  -c '{"Args":["GetProduct","PROD001"]}'
