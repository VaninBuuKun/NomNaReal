#!/bin/bash
set -e

SCENARIO=${1:-http}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.bench.yml"

echo "=========================================================="
echo " NomNa k6 Benchmarking Suite (Isolated Docker Container)  "
echo "=========================================================="
echo "Scenario: $SCENARIO"
echo "Compose File: $COMPOSE_FILE"
echo ""

# 1. Select scenario file
if [ "$SCENARIO" == "realistic" ] || [ "$SCENARIO" == "real" ]; then
    TARGET_SCRIPT="/benchmark/scenarios/01_realistic_chat.js"
    RESULT_FILE="/results/realistic_chat_$(date +%s).json"
elif [ "$SCENARIO" == "http" ]; then
    TARGET_SCRIPT="/scripts/01_http_message_load.js"
    RESULT_FILE="/results/baseline_http_$(date +%s).json"
elif [ "$SCENARIO" == "ws" ] || [ "$SCENARIO" == "signalr" ]; then
    TARGET_SCRIPT="/scripts/02_signalr_realtime.js"
    RESULT_FILE="/results/baseline_signalr_$(date +%s).json"
elif [ "$SCENARIO" == "fanout" ]; then
    TARGET_SCRIPT="/scripts/03_signalr_fanout_matrix.js"
    RESULT_FILE="/results/fanout_matrix_$(date +%s).json"
else
    echo "Unknown scenario: $SCENARIO. Use 'realistic', 'http', 'ws', or 'fanout'."
    exit 1
fi

# 2. Spin up backend cluster (Postgres, Redis, WebAPI, Nginx)
echo "==> Ensuring Backend Cluster is healthy and ready..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis webapi-1 nginx

# Wait for Nginx to respond on port 5050
echo "==> Waiting for Nginx gateway on http://localhost:5050/health..."
until curl -s http://localhost:5050/health > /dev/null 2>&1; do
    sleep 2
    echo "    Waiting for services to become ready..."
done
echo "==> Backend Cluster is UP and HEALTHY!"
echo ""

# 3. Run k6 in dedicated container
echo "==> Launching k6 load testing container..."
docker compose -f "$COMPOSE_FILE" run --rm \
    k6 run "$TARGET_SCRIPT" --summary-export "$RESULT_FILE"

echo ""
echo "=========================================================="
echo " Benchmark run complete! Result exported to: $RESULT_FILE "
echo "=========================================================="
