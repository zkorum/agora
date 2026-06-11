#!/bin/bash

cd /home/ec2-user && docker run --log-driver=awslogs --log-opt awslogs-region=eu-west-1 --log-opt awslogs-group=agora-prod-docker --log-opt awslogs-stream=certbot-renew --rm --name certbot -v "./certbot/www/:/var/www/certbot/:rw" -v ."/certbot/conf/:/etc/letsencrypt/:rw" -v "./certbot/logs:/var/log/letsencrypt" certbot/certbot renew --non-interactive
