#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

REPO_DIR="$CLAUDE_PROJECT_DIR"

# ── 1. Restore global settings.json + CLAUDE.md ──────────────────────────────
mkdir -p "$HOME/.claude/hooks"
cp "$REPO_DIR/config/global-settings.json" "$HOME/.claude/settings.json"
[ -f "$REPO_DIR/config/global-claude.md" ] && cp "$REPO_DIR/config/global-claude.md" "$HOME/.claude/CLAUDE.md"

# ── 2. Restore global session-start.sh hook ─────────────────────────────────
cat > "$HOME/.claude/hooks/session-start.sh" << 'HOOK'
#!/bin/bash
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then exit 0; fi

# Install superpowers skills
SUPERPOWERS_DIR="$HOME/.claude/plugins/superpowers"
if [ -d "$SUPERPOWERS_DIR/skills" ]; then
  for skill_dir in "$SUPERPOWERS_DIR/skills/"/*/; do
    skill_name=$(basename "$skill_dir")
    dest="$HOME/.claude/skills/$skill_name"
    mkdir -p "$dest"
    cp -r "$skill_dir"* "$dest/"
  done
else
  git clone --depth=1 https://github.com/obra/superpowers "$SUPERPOWERS_DIR" 2>/dev/null || true
  if [ -d "$SUPERPOWERS_DIR/skills" ]; then
    for skill_dir in "$SUPERPOWERS_DIR/skills/"/*/; do
      skill_name=$(basename "$skill_dir")
      dest="$HOME/.claude/skills/$skill_name"
      mkdir -p "$dest"
      cp -r "$skill_dir"* "$dest/"
    done
  fi
fi
echo "Superpowers skills installed"
HOOK
chmod +x "$HOME/.claude/hooks/session-start.sh"

# ── 3. Install pip dependencies ──────────────────────────────────────────────
pip install -q opendataloader-pdf mcp 2>/dev/null || true
pip install -q git+https://github.com/safishamsi/graphify.git 2>/dev/null || true
command -v graphify &>/dev/null && graphify install --platform claude 2>/dev/null || true

# ── 4. Deploy pdf_reader MCP server ─────────────────────────────────────────
mkdir -p "$HOME/.claude/mcp-servers"
cp "$REPO_DIR/mcp-servers/pdf_reader.py" "$HOME/.claude/mcp-servers/pdf_reader.py"

# ── 5. Register MCP servers (idempotent) ────────────────────────────────────
register_mcp() {
  local name="$1"; shift
  claude mcp list 2>/dev/null | grep -q "^$name:" && return 0
  claude mcp add --scope user "$name" "$@" 2>/dev/null || true
}

register_mcp pdf-reader      -- python "$HOME/.claude/mcp-servers/pdf_reader.py"
register_mcp playwright      -- npx @playwright/mcp@latest
register_mcp chrome-devtools -- npx chrome-devtools-mcp@latest
register_mcp n8n-mcp \
  -e MCP_MODE=stdio -e LOG_LEVEL=error -e DISABLE_CONSOLE_OUTPUT=true \
  -- npx n8n-mcp

claude mcp list 2>/dev/null | grep -q "^higgsfield:" || \
  claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp 2>/dev/null || true
claude mcp list 2>/dev/null | grep -q "^metricool:" || \
  claude mcp add --transport http --scope user metricool https://ai.metricool.com/mcp 2>/dev/null || true

# Supabase needs SUPABASE_ACCESS_TOKEN from ~/.secrets/env
if [ -f "$HOME/.secrets/env" ]; then
  # shellcheck disable=SC1090
  source "$HOME/.secrets/env" 2>/dev/null || true
fi
if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  register_mcp supabase -- npx @supabase/mcp-server-supabase@latest \
    --access-token "$SUPABASE_ACCESS_TOKEN"
fi

echo "MCP servers registered"

# ── 6. Install custom skills from repo/skills/ ──────────────────────────────
if [ -d "$REPO_DIR/skills" ]; then
  for skill_dir in "$REPO_DIR/skills/"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name=$(basename "$skill_dir")
    dest="$HOME/.claude/skills/$skill_name"
    mkdir -p "$dest"
    cp -r "$skill_dir"* "$dest/"
  done
  echo "Custom skills installed"
fi

# ── 7. Ensure ~/.secrets exists ──────────────────────────────────────────────
mkdir -p "$HOME/.secrets"
touch "$HOME/.secrets/env"
chmod 600 "$HOME/.secrets/env"

# ── 8. Plugins: install + enable ─────────────────────────────────────────────
# ruflo (multi-agent swarm)
claude plugin marketplace list 2>/dev/null | grep -q "ruflo" || \
  claude plugin marketplace add ruvnet/ruflo 2>/dev/null || true

for p in ruflo-core ruflo-swarm ruflo-autopilot ruflo-federation; do
  claude plugin list 2>/dev/null | grep -q "^  > ${p}" || \
    claude plugin install "${p}@ruflo" 2>/dev/null || true
  claude plugin enable "${p}@ruflo" 2>/dev/null || true
done

# ui-ux-pro-max
claude plugin list 2>/dev/null | grep -q "ui-ux-pro-max" || {
  claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill 2>/dev/null || true
  claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill 2>/dev/null || true
}
claude plugin enable "ui-ux-pro-max@ui-ux-pro-max-skill" 2>/dev/null || true

# claude-for-legal
claude plugin marketplace list 2>/dev/null | grep -q "claude-for-legal" || \
  claude plugin marketplace add anthropics/claude-for-legal 2>/dev/null || true

for p in commercial-legal corporate-legal privacy-legal product-legal \
          employment-legal ip-legal ai-governance-legal litigation-legal \
          regulatory-legal; do
  claude plugin list 2>/dev/null | grep -q "^  > ${p}" || \
    claude plugin install "${p}@claude-for-legal" 2>/dev/null || true
  claude plugin enable "${p}@claude-for-legal" 2>/dev/null || true
done
echo "Plugins ready"

# ── 9. Install agency-agents ─────────────────────────────────────────────────
chmod +x "$REPO_DIR/scripts/"*.sh
cd "$REPO_DIR"
./scripts/install.sh --tool claude-code --no-interactive
