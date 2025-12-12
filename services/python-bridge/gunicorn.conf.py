"""
Gunicorn configuration file for Flask app
Enables concurrent request handling with multiple worker processes
"""

import multiprocessing
import os
import platform

# Bind to all interfaces on port 5001
bind = "0.0.0.0:5001"

# Number of worker processes
# Auto-calculated from TOTAL_VCPUS environment variable (infrastructure-level config)
# Each worker can handle one CPU-intensive math calculation concurrently
# For CPU-bound work, this bypasses Python's GIL by using separate processes
#
# Calculation: workers = TOTAL_VCPUS (use all vCPUs for CPU-intensive math)
# Math-updater will send slightly more concurrent requests (workers + buffer)
# which Gunicorn queues in backlog (2048 slots) for immediate processing
#
# Examples:
#   TOTAL_VCPUS=2 (t3.medium)  → workers=2, math-updater sends 3 concurrent
#   TOTAL_VCPUS=4 (t3.xlarge)  → workers=4, math-updater sends 5 concurrent
#   TOTAL_VCPUS=8 (t3.2xlarge) → workers=8, math-updater sends 10 concurrent
#
# Fallback: Can override with GUNICORN_WORKERS env var
total_vcpus = int(os.getenv("TOTAL_VCPUS", "2"))
workers = int(os.getenv("GUNICORN_WORKERS", str(total_vcpus)))

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
# Disabled on macOS due to fork() + Objective-C runtime conflict (SIGKILL on worker spawn)
preload_app = platform.system() != "Darwin"

# Number of pending connections (queued when all workers busy)
# Set to 2048 (Gunicorn default), but actual limit depends on system's net.core.somaxconn:
#   - Older Linux kernels: 128 (backlog silently truncated)
#   - Kernel 5.4+: 4096
# This allows math-updater to send slightly more concurrent requests than workers
# without connection rejections
backlog = 2048

print(f"Starting Gunicorn with {workers} workers, timeout={timeout}s")
