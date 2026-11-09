# 맥 공통 환경 — ~/.zshrc 와 launchd 작업(job.sh)이 둘 다 source 한다. 경로는 모두 $HOME 기준.
export SIDE="$HOME/workspace/side_project"
export AZ="$SIDE/aztomz"
export HERMES_HOME="$SIDE/hermes"
# Homebrew(Apple Silicon /opt/homebrew, Intel /usr/local; node@24 는 keg-only 라 opt 경로) · uv tool/hermes(~/.local/bin) · npm 전역(claude)
export PATH="/opt/homebrew/opt/node@24/bin:/usr/local/opt/node@24/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$HOME/.local/bin:$HERMES_HOME/bin:$PATH"
if command -v npm >/dev/null 2>&1; then export PATH="$(npm prefix -g)/bin:$PATH"; fi
export DDGS_EXE="$HOME/.local/bin/ddgs"
HERMES_BIN="$(command -v hermes 2>/dev/null)"; export HERMES_BIN
export PYTHONIOENCODING=utf-8 PYTHONUTF8=1
