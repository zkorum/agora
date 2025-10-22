"""
Gunicorn configuration file for Flask app
Enables concurrent request handling with multiple worker processes
"""

import multiprocessing
import os

# Bind to all interfaces on port 5001
bind = "0.0.0.0:5001"

# Number of worker processes
# Match math-updater's MATH_UPDATER_JOB_CONCURRENCY (default: 10)
# Each worker can handle one CPU-intensive math calculation concurrently
# For CPU-bound work, this bypasses Python's GIL by using separate processes
workers = int(os.getenv("GUNICORN_WORKERS", "10"))

# Worker class - sync is best for CPU-bound tasks like math calculations
# Use 'gthread' for I/O-bound workloads (not our case)
worker_class = "sync"

# Timeout for workers (in seconds)
# Math calculations take 50-85s for 113K votes, buffer for larger conversations
timeout = int(os.getenv("GUNICORN_TIMEOUT", "240"))

# Graceful timeout (in seconds)
graceful_timeout = 30

# Keep-alive connections
keepalive = 5

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stdout
loglevel = "info"

# Restart workers after this many requests (helps prevent memory leaks)
max_requests = 1000
max_requests_jitter = 50

# Pre-load the application in the master process
# This shares memory between workers (reduces memory footprint)
preload_app = True

# Number of pending connections
backlog = 2048

print(f"Starting Gunicorn with {workers} workers, timeout={timeout}s")
