#!/bin/sh

# Merge new assets from the image into the persistent volume.
# Old assets from previous deployments are preserved so users
# with cached index.html can still load stale chunk hashes.
cp -r /app/new-assets/* /usr/share/nginx/html/assets/

# Remove assets older than 7 days to prevent disk bloat
find /usr/share/nginx/html/assets -mtime +7 -type f -delete 2>/dev/null || true

# Start nginx
exec nginx -g 'daemon off;'
