#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# deploy-taraaz.sh — Deploy Agora to taraaz.jomhoor.org
# Run from the server: /opt/agora/
# ============================================================

DOMAIN="taraaz.jomhoor.org"
DEPLOY_DIR="/opt/agora"
COMPOSE_FILE="docker-compose.yml"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@jomhoor.org}"

echo "=== Agora deployment to $DOMAIN ==="

# ── 0. Pre-flight checks ────────────────────────────────────
command -v docker >/dev/null 2>&1 || { echo "❌ docker not found"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "❌ docker compose not found"; exit 1; }

if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo "❌ Missing $DEPLOY_DIR/.env — copy from .env.example and fill in secrets"
    exit 1
fi

# ── 1. DNS check ─────────────────────────────────────────────
echo "Checking DNS for $DOMAIN..."
SERVER_IP=$(curl -s ifconfig.me)
DNS_IP=$(dig +short "$DOMAIN" | head -1)
if [ "$DNS_IP" != "$SERVER_IP" ]; then
    echo "⚠️  DNS mismatch: $DOMAIN resolves to '$DNS_IP', server IP is '$SERVER_IP'"
    echo "   Make sure the A record points to $SERVER_IP before obtaining SSL cert."
    read -p "   Continue anyway? [y/N] " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

# ── 2. SSL certificate ──────────────────────────────────────
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "Obtaining SSL certificate for $DOMAIN..."
    mkdir -p /var/www/certbot

    # Temporary nginx config for ACME challenge
    cat > /etc/nginx/sites-available/"$DOMAIN" <<NGINX_TEMP
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 444; }
}
NGINX_TEMP
    ln -sf /etc/nginx/sites-available/"$DOMAIN" /etc/nginx/sites-enabled/
    nginx -t && nginx -s reload

    certbot certonly --webroot --webroot-path=/var/www/certbot \
        --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email \
        -d "$DOMAIN" -d "www.$DOMAIN"

    echo "✅ SSL certificate obtained"
fi

# ── 3. Install nginx vhost ───────────────────────────────────
echo "Installing nginx config..."
cp "$DEPLOY_DIR/taraaz.jomhoor.org.nginx.conf" /etc/nginx/sites-available/"$DOMAIN"
ln -sf /etc/nginx/sites-available/"$DOMAIN" /etc/nginx/sites-enabled/
nginx -t
echo "✅ Nginx config installed"

# ── 4. Update verificator config with DB password ────────────
source "$DEPLOY_DIR/.env"
sed -i "s|postgres://agora:CHANGEME@|postgres://agora:${AGORA_DB_PASSWORD}@|g" \
    "$DEPLOY_DIR/rarimo/config.yaml"

# ── 5. Run verificator DB migration ─────────────────────────
echo "Starting database..."
cd "$DEPLOY_DIR"
docker compose -f "$COMPOSE_FILE" up -d agora-postgres
echo "Waiting for PostgreSQL to be ready..."
sleep 5

echo "Running verificator DB migration..."
docker run --rm --network agora-network \
    -e KV_VIPER_FILE=/config/config.yaml \
    -v "$DEPLOY_DIR/rarimo:/config" \
    ghcr.io/rarimo/verificator-svc:v0.2.13 migrate up || true

# ── 6. Start all services ───────────────────────────────────
echo "Starting all Agora services..."
docker compose -f "$COMPOSE_FILE" up -d

# ── 7. Reload nginx ─────────────────────────────────────────
nginx -s reload
echo "✅ Nginx reloaded"

# ── 8. Verify ────────────────────────────────────────────────
echo ""
echo "=== Deployment complete ==="
echo ""
echo "Services:"
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Health check:"
curl -sk "https://$DOMAIN/health" && echo ""
echo ""
echo "Port mapping on this server:"
echo "  8100 → agora-verificator (Rarimo ZK verification)"
echo "  8180 → agora-api         (Fastify backend)"
echo "  8190 → agora-app         (SvelteKit frontend)"
echo ""
echo "Next steps:"
echo "  1. Visit https://$DOMAIN/feed/"
echo "  2. Check logs: cd $DEPLOY_DIR && docker compose logs -f"
echo "  3. Set up Certbot auto-renewal: certbot renew --dry-run"
