#!/usr/bin/env bash
set -eu
set -o pipefail
cd "$(dirname "$0")/../.."
root="$(pwd -P)"
endpoint="${DOCKER_HOST:-$(docker context inspect --format '{{.Endpoints.docker.Host}}')}"
case "$endpoint" in unix://*) ;; *) echo "Use a local Docker Unix socket for this private audit." >&2; exit 2;; esac
phase="${AUDIT_PHASE:-final}"
case "$phase" in baseline|trial|final);; *) exit 2;; esac
out="$root/work/release-audit/$(date -u +%Y%m%dT%H%M%SZ)-$phase-$$"
mkdir -p "$out"
box="forju-audit-$$"
trap 'docker rm -f "$box" >/dev/null 2>&1 || true' EXIT
pf='ghcr.io/promptfoo/promptfoo@sha256:3ddd7be2b8b043a5c48f0df048b074396de8e60282b0a3b392c299c430b74134'
k6='grafana/k6@sha256:3e4186aea62e11a45560bfc51e19eeafe82fc07ce069c78aff44b7ff893d9a5e'
zap='ghcr.io/zaproxy/zaproxy@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af'
echo "Evidence: $out"
git rev-parse HEAD > "$out/base-commit.txt"
# Bootstrap downloads only public toolchains/locked dependencies. No visitor fixtures run here.
docker build -t forju-release-tools:local -f tools/release/Dockerfile . >"$out/bootstrap.log" 2>&1 || { tail -25 "$out/bootstrap.log"; exit 1; }
images=("$pf"); if [ "$phase" != baseline ]; then images+=("$k6" "$zap"); fi
for image in "${images[@]}"; do
  docker image inspect "$image" >/dev/null 2>&1 || docker pull "$image"
  docker image inspect "$image" --format '{{json .RepoDigests}}' >> "$out/images.txt"
done
docker run -d --name "$box" --network none --shm-size=1g -v "$out:/out" \
  -e COMPASS_LOCAL_ONLY=true -e COMPASS_EMBED_ORIGINS=https://forju.at,https://www.forju.at,https://127.0.0.1:4201 \
  -e COMPASS_QUOTA_DB=/tmp/compass-check-release/quota.sqlite -e COMPASS_CLIENT_IP_HEADER=x-audit-client \
  -e RESEND_API_KEY=re_local_fixture -e RESEND_BASE_URL=http://127.0.0.1:4204 \
  -e FEEDBACK_IP_HEADER=x-audit-feedback-ip -e FEEDBACK_FROM_EMAIL=compass@example.test -e FEEDBACK_TO_EMAIL=adam.maskini@forju.at \
  -e PROJECT_FROM_EMAIL=onboarding@resend.dev -e RENDER_EXTERNAL_URL=https://127.0.0.1:4203 \
  -e COMPASS_TEST_QUOTA=/tmp/compass-check-release/quota.sqlite forju-release-tools:local sleep infinity >/dev/null
# Only app source, approved assets and test programs enter the isolated machine.
git ls-files -co --exclude-standard -z -- app lib public tests knowledge/catalog.json knowledge/language scripts \
  tools/knowledge-checks/'*.json' tools/visitor-checks/'*.mjs' tools/visitor-checks/package.json tools/release \
  tsconfig.json proxy.ts next.config.ts eslint.config.mjs postcss.config.mjs package.json .node-version \
  | COPYFILE_DISABLE=1 tar -cf - --null -T - | docker exec -i "$box" tar --warning=no-unknown-keyword -xf - -C /app
inside(){ docker exec "$box" "$@"; }
failed=0
stage(){
  local name="$1"; shift
  echo "Running $name"
  if "$@" >"$out/$name.log" 2>&1; then printf '%s\tPASS\n' "$name"; else
    failed=1; tail -14 "$out/$name.log" >&2; printf '%s\tFAIL\n' "$name"
  fi >>"$out/status.tsv"
}
inside sh -c 'mkdir -p /tmp/compass-check-release && openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=localhost -addext subjectAltName=IP:127.0.0.1 -keyout /tmp/release.key -out /tmp/release.crt 2>/dev/null'
stage unit inside env -u RENDER_EXTERNAL_URL npm test
stage lint inside npm run lint
stage build inside npm run build
if ! grep -q $'build\tPASS' "$out/status.tsv"; then exit 1; fi
docker exec -d "$box" sh -c 'node tools/release/fixtures.mjs >/out/fixtures.log 2>&1'
docker exec -d "$box" sh -c 'NODE_OPTIONS=--require=/app/tools/release/server-observer.cjs npm start -- -H 127.0.0.1 -p 4196 >/out/app.log 2>&1'
inside node -e '(async()=>{for(let i=0;i<80;i++){try{if((await fetch("http://127.0.0.1:4196/embed")).ok)return}catch{}await new Promise(r=>setTimeout(r,250))}process.exit(1)})()'
share=(--rm --network "container:$box" --user 0:0 -v "$out:/out")
quality(){
 docker run "${share[@]}" -v "$root/tools/release/quality:/quality:ro" -w /quality \
  -e PROMPTFOO_DISABLE_TELEMETRY=1 -e PROMPTFOO_DISABLE_UPDATE=1 -e PROMPTFOO_DISABLE_WAL_MODE=1 \
  -e PROMPTFOO_CONFIG_DIR=/tmp/promptfoo -e AUDIT_PHASE="$phase" --entrypoint promptfoo "$pf" \
  eval -c config.cjs --no-cache --max-concurrency 1 --no-progress-bar -o /out/promptfoo.json
}
stage quality quality
if [ "$phase" != baseline ]; then
  stage project-inbox inside node tools/release/project-mail.mjs
  stage security inside node tools/release/security.mjs
  if [ "$phase" = trial ]; then
    stage browser inside sh -c 'cd tools/visitor-checks && node node_modules/@playwright/test/cli.js test -c release.config.mjs release.spec.mjs'
  else
    stage browser inside sh -c 'cd tools/visitor-checks && node node_modules/@playwright/test/cli.js test -c release.config.mjs'
  fi
  inside node tools/release/quota-reset.mjs
  stage load docker run "${share[@]}" -e K6_NO_USAGE_REPORT=true -v "$root/tools/release/load.js:/load.js:ro" "$k6" run --quiet --summary-export=/out/load.json /load.js
  # ZAP's baseline only spiders and passively scans. No active attacks or real deliveries.
  zap_scan(){
    local code=0
    docker run "${share[@]}" -v "$out:/zap/wrk:rw" -v "$root/tools/release/zap-hook.py:/audit/hook.py:ro" "$zap" zap-baseline.py -t http://127.0.0.1:4196 -m 1 -T 5 -J zap.json -r zap.html -I --autooff --hook=/audit/hook.py || code=$?
    [ "$code" = 0 ] && [ -s "$out/zap.json" ]
  }
  stage zap zap_scan
  stage zap-findings inside node tools/release/zap-grade.mjs
  stage server-egress test ! -s "$out/server-egress.jsonl"
fi
cat "$out/status.tsv"
inside node tools/release/summary.mjs /out
exit "$failed"
