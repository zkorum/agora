#!/bin/bash
# Check DNS propagation for all Agora domains
# Usage: ./check-dns-propagation.sh <expected-ip>
# Example: ./check-dns-propagation.sh 34.251.39.165

set -euo pipefail

EXPECTED_IP="${1:-}"

if [ -z "$EXPECTED_IP" ]; then
    echo "Usage: $0 <expected-elastic-ip>"
    echo "Example: $0 32.221.27.112"
    exit 1
fi

DOMAINS=(
    "agoracitizen.app"
    "www.agoracitizen.app"
    "probe.agoracitizen.network"
)

DNS_SERVERS=(
    "8.8.8.8" # Google
    "1.1.1.1" # Cloudflare
    "9.9.9.9" # Quad9
)

echo "============================================"
echo "DNS Propagation Check"
echo "Expected IP: $EXPECTED_IP"
echo "============================================"
echo ""

all_ready=true

for domain in "${DOMAINS[@]}"; do
    echo "--- $domain ---"
    domain_ready=true

    for dns in "${DNS_SERVERS[@]}"; do
        result=$(dig +short "$domain" @"$dns" A 2>/dev/null | head -1)

        if [ "$result" = "$EXPECTED_IP" ]; then
            printf "  %-12s -> %-16s  OK\n" "$dns" "$result"
        elif [ -z "$result" ]; then
            printf "  %-12s -> %-16s  MISSING\n" "$dns" "(no record)"
            domain_ready=false
            all_ready=false
        else
            printf "  %-12s -> %-16s  WRONG (expected %s)\n" "$dns" "$result" "$EXPECTED_IP"
            domain_ready=false
            all_ready=false
        fi
    done

    if $domain_ready; then
        echo "  => READY"
    else
        echo "  => NOT READY"
    fi
    echo ""
done

echo "============================================"
echo "Reverse DNS (PTR) for $EXPECTED_IP:"
ptr_result=$(dig +short -x "$EXPECTED_IP" 2>/dev/null | head -1)
if [ -n "$ptr_result" ]; then
    echo "  PTR -> $ptr_result"
else
    echo "  PTR -> (not set yet)"
fi
echo "============================================"
echo ""

if $all_ready; then
    echo "ALL DOMAINS READY - safe to associate Elastic IP with EC2"
else
    echo "NOT ALL DOMAINS READY - wait for propagation before associating EIP"
fi
