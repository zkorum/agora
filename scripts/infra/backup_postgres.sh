#!/usr/bin/env bash

CURRENT_DATETIME=`date +"%Y-%m-%d.%H-%M-%S"`
FILENAME="agora.$CURRENT_DATETIME.dump"
FILEPATH="/home/ubuntu/backup/postgres/$FILENAME"
BUCKET_NAME="agora-postgres-backup"
S3_LOCATION="s3://$BUCKET_NAME/$FILENAME"

sudo docker exec agora_postgres pg_dump -U postgres -Fc agora > "$FILEPATH"

sudo chown ubuntu:ubuntu $FILEPATH
sudo chmod 400 $FILEPATH

aws s3 cp "$FILEPATH" "$S3_LOCATION"
