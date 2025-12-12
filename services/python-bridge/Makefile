all: dev

# Run with Flask development server (single-threaded, for simple debugging only)
dev-simple:
	flask --app main run

# Run with Gunicorn (multi-worker, production-like, handles concurrent requests) -- caution on macOS doesnt' work
dev:
	gunicorn -c gunicorn.conf.py main:app
image-buildx:
	docker buildx build --platform linux/amd64 -t quay.io/zkorum/agora-python-bridge:latest .

# image-tag:
# 	docker tag quay.io/zkorum/agora-python-bridge:latest zkorum/agora-python-bridge:<some_version>

# image-push:
# 	docker push quay.io/zkorum/agora-python-bridge:<some_version>

