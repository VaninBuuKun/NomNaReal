#!/usr/bin/env bash
# ==============================================================================
# NomNa Git Worktree Orchestrator (Multi-Branch Parallel Development Hub)
# ==============================================================================
# Helps create, inspect, and clean up isolated git worktree folders so you can
# open multiple Antigravity IDE windows in parallel without conflicts.
#
# Usage:
#   ./scripts/worktree-hub.sh status
#   ./scripts/worktree-hub.sh init-wave1 [base_branch]
#   ./scripts/worktree-hub.sh init-wave2 [base_branch]
#   ./scripts/worktree-hub.sh init-wave3 [base_branch]
#   ./scripts/worktree-hub.sh remove <worktree_folder_name>
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS_DIR="$(dirname "$REPO_ROOT")"
BASE_BRANCH="${2:-HEAD}"

create_worktree() {
    local folder_name="$1"
    local branch_name="$2"
    local target_path="${PROJECTS_DIR}/${folder_name}"

    if [ -d "$target_path" ]; then
        echo "  [SKIP] Folder already exists: $target_path"
        return 0
    fi

    if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/${branch_name}"; then
        echo "  [ADD]  Attaching existing branch '$branch_name' -> $target_path"
        git -C "$REPO_ROOT" worktree add "$target_path" "$branch_name"
    else
        echo "  [NEW]  Creating branch '$branch_name' (from $BASE_BRANCH) -> $target_path"
        git -C "$REPO_ROOT" worktree add -b "$branch_name" "$target_path" "$BASE_BRANCH"
    fi

    # Symlink client/node_modules if available in main repo to save disk space and npm install time
    if [ -d "${REPO_ROOT}/client/node_modules" ] && [ ! -e "${target_path}/client/node_modules" ]; then
        ln -s "${REPO_ROOT}/client/node_modules" "${target_path}/client/node_modules"
        echo "         Linked client/node_modules -> instant frontend build ready!"
    fi
}

show_status() {
    echo "=============================================================================="
    echo " NomNa Active Git Worktrees"
    echo "=============================================================================="
    git -C "$REPO_ROOT" worktree list
    echo "------------------------------------------------------------------------------"
    echo " Master Plan & Prompts: plans/multi-branch-worktree-scaling-master-plan.md"
    echo "=============================================================================="
}

case "${1:-status}" in
    status)
        show_status
        ;;
    init-wave1)
        echo "==> Initializing Wave 1 Worktrees (Performance Hot-Path, Security Hardening, FE Design System)..."
        create_worktree "NomNaReal-perf-hotpath"     "perf/hotpath-and-db-tuning"
        create_worktree "NomNaReal-sec-hardening"    "sec/rate-limit-and-auth-guard"
        create_worktree "NomNaReal-fe-design-system" "refactor/fe-design-tokens-and-split"
        echo ""
        show_status
        ;;
    init-wave2)
        echo "==> Initializing Wave 2 Worktrees (Distributed SignalR, Moderation & Audit, Testcontainers)..."
        create_worktree "NomNaReal-scale-realtime"   "feat/distributed-signalr-and-calls"
        create_worktree "NomNaReal-feat-moderation"  "feat/moderation-audit-and-unread"
        create_worktree "NomNaReal-test-foundation"  "test/testcontainers-and-arch-tests"
        echo ""
        show_status
        ;;
    init-wave3)
        echo "==> Initializing Wave 3 Worktrees (WebRTC TURN & Logs, Multi-Party Voice, Observability)..."
        create_worktree "NomNaReal-feat-webrtc-prod"  "feat/webrtc-turn-and-call-logs"
        create_worktree "NomNaReal-feat-voice-rooms"  "feat/multi-party-voice-channels"
        create_worktree "NomNaReal-ops-observability" "ops/otel-prometheus-grafana"
        echo ""
        show_status
        ;;
    init-wave4)
        echo "==> Initializing Wave 4 Worktrees (Async Outbox Pipeline, Threads/Slowmode/ReadReceipts)..."
        create_worktree "NomNaReal-perf-outbox"       "perf/async-channel-pipeline-and-outbox"
        create_worktree "NomNaReal-feat-rich-chat"    "feat/threads-slowmode-and-read-receipts"
        echo ""
        show_status
        ;;
    remove)
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 remove <worktree_folder_name>"
            exit 1
        fi
        TARGET="${PROJECTS_DIR}/${2}"
        echo "==> Removing worktree: $TARGET"
        git -C "$REPO_ROOT" worktree remove "$TARGET"
        show_status
        ;;
    *)
        echo "Usage: $0 {status|init-wave1|init-wave2|init-wave3|remove <folder_name>} [base_branch]"
        exit 1
        ;;
esac
