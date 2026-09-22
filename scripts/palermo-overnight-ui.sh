#!/usr/bin/env bash
set -u

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 1

mkdir -p .codex

PROMPT_FILE=".codex/overnight-ui-prompt.md"
EVENT_LOG=".codex/overnight-ui-events.jsonl"
RUN_LOG=".codex/overnight-ui-run.log"

MODEL="gpt-5.6-terra"
EFFORT="medium"
MAX_RESUMES=6
RESUME_SLEEP=3600

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

thread_id() {
  python3 - "$EVENT_LOG" <<'PY'
import json
import pathlib
import sys

p = pathlib.Path(sys.argv[1])
if not p.exists():
    raise SystemExit(0)

for line in p.read_text(errors="replace").splitlines():
    try:
        obj = json.loads(line)
    except Exception:
        continue
    if obj.get("type") == "thread.started" and obj.get("thread_id"):
        print(obj["thread_id"])
        break
PY
}

printf '\n===== START %s =====\n' "$(date -Is)" | tee -a "$RUN_LOG"

set +e
codex exec "${COMMON_ARGS[@]}" "$(cat "$PROMPT_FILE")" \
  2>>"$RUN_LOG" | tee -a "$EVENT_LOG"
rc=${PIPESTATUS[0]}
set -e

if [[ $rc -eq 0 ]]; then
  printf '\n===== COMPLETE %s =====\n' "$(date -Is)" | tee -a "$RUN_LOG"
  exit 0
fi

THREAD_ID="$(thread_id)"

if [[ -z "$THREAD_ID" ]]; then
  printf '\nNo resumable thread ID was emitted; stopping safely.\n' | tee -a "$RUN_LOG"
  exit "$rc"
fi

printf '\nInitial run exited %d; resumable thread: %s\n' \
  "$rc" "$THREAD_ID" | tee -a "$RUN_LOG"

for ((attempt=1; attempt<=MAX_RESUMES; attempt++)); do
  printf '\n===== RESUME %d/%d after %ds =====\n' \
    "$attempt" "$MAX_RESUMES" "$RESUME_SLEEP" | tee -a "$RUN_LOG"

  sleep "$RESUME_SLEEP"

  set +e
  codex exec "${COMMON_ARGS[@]}" \
    resume "$THREAD_ID" \
    "Continue the authorised overnight remediation. Read .git/palermo-overnight-state.md first and resume from its exact checkpoint. Do not redo completed packages. Continue autonomously under the original instructions." \
    2>>"$RUN_LOG" | tee -a "$EVENT_LOG"

  rc=${PIPESTATUS[0]}
  set -e

  if [[ $rc -eq 0 ]]; then
    printf '\n===== COMPLETE AFTER RESUME %s =====\n' "$(date -Is)" \
      | tee -a "$RUN_LOG"
    exit 0
  fi

  printf '\nResume %d exited %d at %s\n' \
    "$attempt" "$rc" "$(date -Is)" | tee -a "$RUN_LOG"
done

printf '\nMaximum resume attempts reached; leaving checkpoint intact.\n' \
  | tee -a "$RUN_LOG"

exit "$rc"
