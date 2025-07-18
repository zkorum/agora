all: dev

dev:
	flask --app main run
image-build:
	docker build -t quay.io/zkorum/agora-python-bridge:latest .

# image-tag:
# 	docker tag quay.io/zkorum/agora-python-bridge:latest zkorum/agora-python-bridge:<some_version>

# image-push:
# 	docker push quay.io/zkorum/agora-python-bridge:<some_version>

