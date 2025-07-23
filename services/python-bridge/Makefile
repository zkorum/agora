all: dev

dev:
	flask --app main run
image-buildx:
	docker buildx build --platform linux/amd64 -t quay.io/zkorum/agora-python-bridge:latest .

# image-tag:
# 	docker tag quay.io/zkorum/agora-python-bridge:latest zkorum/agora-python-bridge:<some_version>

# image-push:
# 	docker push quay.io/zkorum/agora-python-bridge:<some_version>

