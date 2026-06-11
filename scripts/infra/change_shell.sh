#!/bin/bash
# description: EC2 Instance Prompt
# author: Miglen Evlogiev <github@miglen.com>
#
# deployment: copy this file into /etc/profile.d/ec2-instance-prompt.sh
# sudo wget https://gist.githubusercontent.com/miglen/e2e577b95acf1171a1853871737323ce/raw/ec2-instance-prompt.sh -P /etc/profile.d/
# sudo bash /etc/profile.d/ec2-instance-prompt.sh
#


# grey='\[\033[1;30m\]'
# red='\[\033[0;31m\]'
# RED='\[\033[1;31m\]'
# green='\[\033[0;32m\]'
# GREEN='\[\033[1;32m\]'
# yellow='\[\033[0;33m\]'
# YELLOW='\[\033[1;33m\]'
# purple='\[\033[0;35m\]'
# PURPLE='\[\033[1;35m\]'
# white='\[\033[0;37m\]'
# WHITE='\[\033[1;37m\]'
# blue='\[\033[0;34m\]'
# BLUE='\[\033[1;34m\]'
# cyan='\[\033[0;36m\]'
# CYAN='\[\033[1;36m\]'
# NC='\[\033[0m\]'

instance_data=169.254.169.254
TOKEN=`curl -X PUT "http://${instance_data}/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`

# Obtain information from EC2 Metadata (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html)
aws_account_id=$(wget -qO- --header="X-aws-ec2-metadata-token: $TOKEN" http://${instance_data}/latest/dynamic/instance-identity/document | sed -n 's/.*"accountId"\s*:\s*"\(.*\)".*/\1/p')
aws_instance_id=$(wget -qO- --header="X-aws-ec2-metadata-token: $TOKEN" http://${instance_data}/latest/meta-data/instance-id)
aws_public_ip=$(wget -qO- --header="X-aws-ec2-metadata-token: $TOKEN" http://${instance_data}/latest/meta-data/public-ipv4)
aws_private_ip=$(wget -qO- --header="X-aws-ec2-metadata-token: $TOKEN" http://${instance_data}/latest/meta-data/local-ipv4)
aws_region=$(wget -qO-  --header="X-aws-ec2-metadata-token: $TOKEN" http://${instance_data}/latest/meta-data/placement/availability-zone | sed 's/.$//')
aws_instance_arn="arn::ec2:${aws_region}:${aws_account_id}:instance/${aws_instance_id}"

# Uncomment the following block to add EC2 Name Tag to the prompt
# Prerequisites:
# 1. Ensure you have AWS cli installed https://aws.amazon.com/cli/
# 2. Ensure your instance has instance profile with at least ec2:DescribeTags action allowed.
#
aws_tag_name="Name"
aws_instance_name=$(aws ec2 describe-tags --region ${aws_region} --filter "Name=resource-id,Values=${aws_instance_id}" "Name=key,Values=Name" --output text | cut -f5)

# Export the prompt
# TODO: dynamically add colors depending if staging or prod
PS1="[${aws_instance_name}-${aws_instance_arn}]-[${aws_public_ip}-${aws_private_ip}]\n[${USER}:${PWD}]\$ "
