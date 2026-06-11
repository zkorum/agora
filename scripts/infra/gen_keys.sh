#!/bin/bash

stty -echo
zkli --pk ./public.prod.key | age -p > private.prod.key.age
stty echo
