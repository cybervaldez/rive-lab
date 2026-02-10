#!/bin/bash
# tests/lib/test_utils.sh — Shared e2e test utilities
# Source this from every test file: source "$SCRIPT_DIR/lib/test_utils.sh"

PASS_COUNT=0
FAIL_COUNT=0
TEST_NAME=""

pass() {
    PASS_COUNT=$((PASS_COUNT + 1))
    echo "  [PASS] $1"
}

fail() {
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "  [FAIL] $1"
}

log_test() {
    echo "  [TEST] $1"
}

# Evaluate JS in browser and strip surrounding quotes from string results
browser_eval() {
    local raw
    raw=$(agent-browser eval "$1" 2>/dev/null)
    # Strip surrounding double quotes if present
    raw="${raw%\"}"
    raw="${raw#\"}"
    echo "$raw"
}

wait_for_server() {
    local url="$1"
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null | grep -qE '(200|30[1-8])'; then
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    return 1
}

setup_cleanup() {
    cleanup() {
        agent-browser close 2>/dev/null || true
    }
    trap cleanup EXIT
}

print_header() {
    echo ""
    echo "=== $1 ==="
    echo ""
}

print_summary() {
    echo ""
    echo "---"
    echo "Results: $PASS_COUNT passed, $FAIL_COUNT failed"
    if [ "$FAIL_COUNT" -gt 0 ]; then
        echo "FAIL"
        exit 1
    else
        echo "PASS"
        exit 0
    fi
}
