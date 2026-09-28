#!/usr/bin/env bash

set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 1

mkdir -p .codex
mkdir -p .palermo-overnight/checkpoints

PROMPT_FILE=".codex/overnight-ui-prompt.md"
STATE_FILE=".palermo-overnight/state.md"

EVENT_LOG=".codex/overnight-ui-events.jsonl"
RUN_LOG=".codex/overnight-ui-run.log"
LAST_EVENTS=".palermo-overnight/last-events.jsonl"

MODEL="gpt-5.6-terra"
EFFORT="medium"

INITIAL_THREAD_ID="${INITIAL_THREAD_ID:-}"

MAX_CONTINUATIONS=12
ERROR_RESUME_SLEEP=3600
NORMAL_CONTINUE_SLEEP=5

COMMON_ARGS=(
  --json
  --model "$MODEL"
  --sandbox workspace-write
  -c 'approval_policy="never"'
  -c "model_reasoning_effort=\"$EFFORT\""
  -c 'features.multi_agent_v2.enabled=true'
  -c 'features.multi_agent_v2.max_concurrent_threads_per_session=2'
  -C "$ROOT"
)

state_status() {
  if [[ ! -f "$STATE_FILE" ]]; then
    printf '%s' "missing"
    return
  fi

  sed -nE \
    's/^- status:[[:space:]]*(running|blocked|complete|not-started)[[:space:]]*$/\1/p' \
    "$STATE_FILE" \
    | head -n 1
}

event_thread_id() {
  local file="$1"

  python3 - "$file" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
thread_id = ""

if path.exists():
    for line in path.read_text(errors="replace").splitlines():
        try:
            item = json.loads(line)
        except Exception:
            continue

        if item.get("type") == "thread.started" and item.get("thread_id"):
            thread_id = item["thread_id"]

if thread_id:
    print(thread_id)
PY
}

run_fresh() {
  : > "$LAST_EVENTS"

  set +e

  codex exec \
    "${COMMON_ARGS[@]}" \
    "$(cat "$PROMPT_FILE")" \
    2>>"$RUN_LOG" \
    | tee -a "$EVENT_LOG" \
    | tee "$LAST_EVENTS"

  local rc=${PIPESTATUS[0]}

  set -e
  return "$rc"
}

run_resume() {
  local thread_id="$1"
  local prompt="$2"

  : > "$LAST_EVENTS"

  set +e

  codex exec \
    "${COMMON_ARGS[@]}" \
    resume "$thread_id" "$prompt" \
    2>>"$RUN_LOG" \
    | tee -a "$EVENT_LOG" \
    | tee "$LAST_EVENTS"

  local rc=${PIPESTATUS[0]}

  set -e
  return "$rc"
}

verify_resumed_thread() {
  local expected="$1"
  local emitted

  emitted="$(event_thread_id "$LAST_EVENTS")"

  if [[ -z "$emitted" ]]; then
    printf '\nNo thread.started event was emitted; refusing unsafe resume.\n' \
      | tee -a "$RUN_LOG"
    return 1
  fi

  if [[ "$emitted" != "$expected" ]]; then
    printf '\nResume safety failure: expected thread %s but Codex emitted %s.\n' \
      "$expected" "$emitted" \
      | tee -a "$RUN_LOG"

    printf 'Stopping rather than silently continuing in a new conversation.\n' \
      | tee -a "$RUN_LOG"

    return 1
  fi

  return 0
}

printf '\n===== PALERMO OVERNIGHT START %s =====\n' "$(date -Is)" \
  | tee -a "$RUN_LOG"

ACTIVE_THREAD_ID="$INITIAL_THREAD_ID"

if [[ -n "$ACTIVE_THREAD_ID" ]]; then
  printf 'Resuming existing UI orchestration thread: %s\n' \
    "$ACTIVE_THREAD_ID" \
    | tee -a "$RUN_LOG"

  RECOVERY_PROMPT='Resume the authorised Palermo overnight UI remediation.

The previous stop was caused only by orchestration configuration and is now resolved.

Important corrections:
- AGENTS.md and CLAUDE.md are known expected local-only files. Ignore them when assessing dirty state and never modify them.
- recovery state now lives at .palermo-overnight/state.md.
- checkpoint snapshots live under .palermo-overnight/checkpoints/.
- workspace-write intentionally prevents writing .git, so do not create commits or stage files.
- after each package save a cumulative git diff patch and update the recovery state.

Read:
1. .palermo-overnight/state.md
2. docs/ui/final-ui-remediation-plan.md

Then begin/resume Wave 1 and continue autonomously through every authorised wave under the original orchestration instructions. Do not stop after a single package or wave unless a genuine stop condition is reached.'

  run_resume "$ACTIVE_THREAD_ID" "$RECOVERY_PROMPT"
  rc=$?

  if ! verify_resumed_thread "$ACTIVE_THREAD_ID"; then
    exit 20
  fi
else
  printf 'Starting fresh UI orchestration thread.\n' \
    | tee -a "$RUN_LOG"

  run_fresh
  rc=$?

  ACTIVE_THREAD_ID="$(event_thread_id "$LAST_EVENTS")"

  if [[ -z "$ACTIVE_THREAD_ID" ]]; then
    printf '\nNo resumable thread ID was emitted; stopping safely.\n' \
      | tee -a "$RUN_LOG"
    exit 21
  fi

  printf 'Captured orchestration thread: %s\n' "$ACTIVE_THREAD_ID" \
    | tee -a "$RUN_LOG"
fi

continuation=0

while true; do
  status="$(state_status)"

  printf '\nState after turn: %s | exit=%s | %s\n' \
    "$status" "$rc" "$(date -Is)" \
    | tee -a "$RUN_LOG"

  if [[ "$status" == "complete" ]]; then
    printf '\n===== PALERMO OVERNIGHT COMPLETE %s =====\n' "$(date -Is)" \
      | tee -a "$RUN_LOG"
    exit 0
  fi

  if [[ "$status" == "blocked" ]]; then
    printf '\n===== PALERMO OVERNIGHT BLOCKED %s =====\n' "$(date -Is)" \
      | tee -a "$RUN_LOG"
    exit 2
  fi

  continuation=$((continuation + 1))

  if (( continuation > MAX_CONTINUATIONS )); then
    printf '\nMaximum continuation count reached. State preserved at %s.\n' \
      "$STATE_FILE" \
      | tee -a "$RUN_LOG"
    exit 3
  fi

  if [[ "$rc" -ne 0 ]]; then
    printf '\nCodex exited %d. Sleeping %ds before resume attempt %d/%d.\n' \
      "$rc" \
      "$ERROR_RESUME_SLEEP" \
      "$continuation" \
      "$MAX_CONTINUATIONS" \
      | tee -a "$RUN_LOG"

    sleep "$ERROR_RESUME_SLEEP"
  else
    printf '\nTurn ended cleanly but remediation state is not complete; continuing same thread.\n' \
      | tee -a "$RUN_LOG"

    sleep "$NORMAL_CONTINUE_SLEEP"
  fi

  CONTINUE_PROMPT='Continue the authorised Palermo overnight UI remediation.

Read .palermo-overnight/state.md first and resume from its exact checkpoint.

Do not redo completed packages.
Do not stop merely because one package is gated if independent authorised work remains.
Continue through the remaining authorised waves until status can truthfully be set to complete, or a genuine stop condition requires status blocked.

Remember:
- no git commit/stage/push/merge;
- AGENTS.md and CLAUDE.md are known local-only files;
- checkpoint using cumulative patches under .palermo-overnight/checkpoints/;
- preserve all protected functional authorities.'

  run_resume "$ACTIVE_THREAD_ID" "$CONTINUE_PROMPT"
  rc=$?

  if ! verify_resumed_thread "$ACTIVE_THREAD_ID"; then
    exit 22
  fi
done
