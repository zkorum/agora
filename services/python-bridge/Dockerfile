# Start with a lightweight Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install git and build tools
RUN apt-get update && \
	apt-get install -y --no-install-recommends \
	git \
	build-essential \
	python3-dev \
	&& rm -rf /var/lib/apt/lists/*

# Install dependencies
RUN pip install --no-cache-dir .

# Expose the port you want waitress to serve on
EXPOSE 8004

# Run the app using waitress
CMD ["waitress-serve", "--host", "0.0.0.0", "--port", "8004", "main:app"]
