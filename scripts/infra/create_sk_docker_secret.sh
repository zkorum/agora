#!/bin/bash

# Avoid echoing the secret key
stty -echo
secretKey=$(age -d private.prod.key.age)
echo "$secretKey" | sudo docker secret create iss_sk_v2 -
# Securely erase the secretKey from memory
unset secretKey
stty echo
