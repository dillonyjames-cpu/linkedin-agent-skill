#!/usr/bin/env bash
# Installs the li-* skills into ~/.claude/skills. No git needed.
# Run in a terminal (macOS / Linux / WSL):
#   curl -fsSL https://raw.githubusercontent.com/dillonyjames-cpu/linkedin-agent-skill/main/install.sh | bash
set -euo pipefail

repo="dillonyjames-cpu/linkedin-agent-skill"
branch="${LI_BRANCH:-main}"
skills_dir="$HOME/.claude/skills"
voice_dir="$HOME/.claude/linkedin"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$skills_dir" "$voice_dir"

echo "Downloading $repo ($branch)..."
curl -fsSL "https://github.com/$repo/archive/refs/heads/$branch.tar.gz" | tar -xz -C "$tmp"
src="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -n1)"

count=0
for s in "$src"/skills/li-*/; do
  name="$(basename "$s")"
  rm -rf "${skills_dir:?}/$name"
  cp -R "$s" "$skills_dir/$name"
  echo "  installed /$name"
  count=$((count + 1))
done

# Never overwrite a voice.md the user already filled in.
if [ ! -f "$voice_dir/voice.md" ]; then
  cp "$src/templates/voice.md" "$voice_dir/voice.md"
  echo "  created $voice_dir/voice.md (fill this in)"
else
  echo "  kept your existing $voice_dir/voice.md"
fi

echo
echo "Done: $count skills in $skills_dir"
echo "Start Claude Code with 'claude' and type /li- to see them."
