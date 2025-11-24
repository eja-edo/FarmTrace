#!/bin/bash
echo "=== GO CHAINCODE UNIT TESTS ==="
cd /opt/gopath/src/github.com/hyperledger/fabric/chaincode/go
go test -v -cover
