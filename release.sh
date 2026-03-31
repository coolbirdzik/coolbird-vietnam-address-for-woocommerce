#!/usr/bin/env bash
# ==============================================================================
# Release Script - Vietnam Address WooCommerce Plugin
# Usage: ./release.sh
# ==============================================================================

set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()  { echo -e "${GREEN}✔${RESET}  $1"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $1"; }
err()  { echo -e "${RED}✖${RESET}  $1" >&2; exit 1; }
step() { echo -e "\n${CYAN}▸${RESET}  ${BOLD}$1${RESET}"; }

# ─── Detect plugin root ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$SCRIPT_DIR"
SVN_PATH=""

# ─── Read current version ────────────────────────────────────────────────────
get_current_version() {
  grep -m1 '^ \* Version:' "$PLUGIN_ROOT/coolbird-vietnam-address.php" \
    | sed 's/.*Version: *//' \
    | tr -d ' \r'
}

# ─── Bump version ────────────────────────────────────────────────────────────
bump_version() {
  local current="$1"
  local type="$2"

  local major minor patch
  IFS='.' read -r major minor patch <<< "$current"
  patch=${patch:-0}

  case "$type" in
    major) ((major++)); minor=0; patch=0 ;;
    minor) ((minor++)); patch=0 ;;
    patch) ((patch++)) ;;
    *) err "Unknown bump type: $type (use major|minor|patch)" ;;
  esac

  echo "${major}.${minor}.${patch}"
}

# ─── Update version in a file ────────────────────────────────────────────────
update_version_in_file() {
  local file="$1"
  local new_ver="$2"

  if [[ ! -f "$file" ]]; then
    warn "File not found, skipping: $file"
    return
  fi

  # PHP files: " * Version: X.Y.Z"
  if [[ "$file" == *.php ]]; then
    sed -i '' "s/^\( \* Version:\) *.*/\1 $new_ver/" "$file"
  # Shell/scripts: "VERSION=X.Y.Z"
  elif [[ "$file" == *.sh ]] || [[ "$file" == *.json ]]; then
    sed -i '' "s/^\(VERSION=\)\(.*\)/\1$new_ver/" "$file"
  fi

  log "Updated $file → $new_ver"
}

# ─── Update Stable tag in readme.txt ────────────────────────────────────────
update_readme_stable_tag() {
  local file="$1"
  local new_ver="$2"

  if [[ ! -f "$file" ]]; then
    warn "readme.txt not found: $file"
    return
  fi

  sed -i '' "s/^Stable tag:.*/Stable tag: $new_ver/" "$file"
  log "Updated Stable tag in $file → $new_ver"
}

# ─── SVN: sync source to trunk ──────────────────────────────────────────────
svn_sync_trunk() {
  cd "$SVN_PATH"
  svn update

  rm -rf "$SVN_PATH/trunk"

  rsync -a \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.svn' \
    --exclude='dist' \
    --exclude='release.sh' \
    --exclude='.gitignore' \
    --exclude='.DS_Store' \
    "$PLUGIN_ROOT/" "$SVN_PATH/trunk/"

  find "$SVN_PATH/trunk" -name '.gitignore' -delete 2>/dev/null || true

  log "Synced source → SVN trunk"
}

# ─── SVN: add/remove files in trunk ─────────────────────────────────────────
svn_add_remove_trunk() {
  while IFS= read -r f; do svn add "$f"; done < <(svn status --depth=infinity "$SVN_PATH/trunk" | grep '^?' | awk '{print $2}')
  while IFS= read -r f; do svn delete --force "$f"; done < <(svn status --depth=infinity "$SVN_PATH/trunk" | grep '^!' | awk '{print $2}')
}

# ─── SVN: commit trunk ───────────────────────────────────────────────────────
svn_commit_trunk() {
  local msg="$1"
  svn_add_remove_trunk
  svn commit -m "$msg" --quiet
  log "SVN trunk committed"
}

# ─── SVN: prepare tag from ZIP ────────────────────────────────────────────────
svn_prepare_tag() {
  local new_ver="$1"
  local zip_path="$PLUGIN_ROOT/dist/coolbird-vietnam-address-${new_ver}.zip"
  local tmp_tag_dir="$PLUGIN_ROOT/.svn-tag-tmp"

  if [[ ! -f "$zip_path" ]]; then
    warn "ZIP not found: $zip_path — skipping tag"
    warn "Tip: run ./build.sh first"
    return
  fi

  rm -rf "$tmp_tag_dir"
  mkdir -p "$tmp_tag_dir"
  unzip -q "$zip_path" -d "$tmp_tag_dir"
  mv "$tmp_tag_dir/coolbird-vietnam-address"/* "$tmp_tag_dir/"
  rmdir "$tmp_tag_dir/coolbird-vietnam-address"

  mkdir -p "$SVN_PATH/tags"
  rm -rf "$SVN_PATH/tags/${new_ver}"
  mkdir -p "$SVN_PATH/tags/${new_ver}"
  cp -r "$tmp_tag_dir/"* "$SVN_PATH/tags/${new_ver}/"

  rm -rf "$tmp_tag_dir"

  log "Tag prepared: tags/${new_ver}/"
}

# ─── SVN: add & commit tag ───────────────────────────────────────────────────
svn_commit_tag() {
  local new_ver="$1"
  svn add --parents "$SVN_PATH/tags/${new_ver}"
  while IFS= read -r f; do svn delete --force "$f"; done < <(svn status --depth=infinity "$SVN_PATH/tags/${new_ver}" | grep '^!' | awk '{print $2}')
  svn commit -m "Tag v${new_ver}" --quiet
  log "SVN tag committed: tags/${new_ver}/"
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo "╔══════════════════════════════════════════════╗"
  echo "║   Vietnam Address WooCommerce — Release Tool  ║"
  echo "╚══════════════════════════════════════════════╝"
  echo ""

  # 1. Ask SVN path
  read -rp "SVN path [/Users/hung/SVN]: " input_svn
  SVN_PATH="${input_svn:-/Users/hung/SVN}"
  SVN_PATH="${SVN_PATH/#\~/$HOME}"

  if [[ ! -d "$SVN_PATH" ]]; then
    err "SVN path does not exist: $SVN_PATH"
  fi
  if [[ ! -d "$SVN_PATH/.svn" ]]; then
    err "Not an SVN checkout: $SVN_PATH"
  fi

  # 2. Show current version
  CURRENT_VERSION=$(get_current_version)
  echo ""
  log "Current version: $CURRENT_VERSION"

  # 3. Choose bump type
  echo ""
  echo "Bump type:"
  echo "  ${BOLD}patch${RESET}  — bug fixes (${CURRENT_VERSION} → $(bump_version "$CURRENT_VERSION" patch))"
  echo "  ${BOLD}minor${RESET}  — new features (${CURRENT_VERSION} → $(bump_version "$CURRENT_VERSION" minor))"
  echo "  ${BOLD}major${RESET}  — breaking changes (${CURRENT_VERSION} → $(bump_version "$CURRENT_VERSION" major))"
  echo ""
  read -rp "Select bump type [patch]: " bump_type
  bump_type="${bump_type:-patch}"

  if [[ ! "$bump_type" =~ ^(major|minor|patch)$ ]]; then
    err "Invalid bump type: $bump_type"
  fi

  NEW_VERSION=$(bump_version "$CURRENT_VERSION" "$bump_type")
  echo ""
  log "New version: ${CYAN}${NEW_VERSION}${RESET}"

  # 4. Ask Git options
  echo ""
  read -rp "Git commit? [y/N]: " do_git_commit
  do_git_commit="${do_git_commit:-n}"

  if [[ "$do_git_commit" =~ ^[Yy]$ ]]; then
    read -rp "Git commit message: " git_msg
    git_msg="${git_msg:-Release v${NEW_VERSION}}"
    read -rp "Git push? [y/N]: " do_git_push
    do_git_push="${do_git_push:-n}"
  fi

  # 5. Ask SVN commit option
  echo ""
  read -rp "SVN commit? [y/N]: " do_svn_commit
  do_svn_commit="${do_svn_commit:-n}"

  if [[ "$do_svn_commit" =~ ^[Yy]$ ]]; then
    read -rp "SVN commit message: " svn_msg
    svn_msg="${svn_msg:-Release v${NEW_VERSION}}"
  fi

  # 6. Show steps & confirm
  echo ""
  echo "─── Steps ───────────────────────────────────────"
  echo "  ${GREEN}1${RESET}.  Update version in source files"
  echo "  ${GREEN}2${RESET}.  Run build.sh (frontend + ZIP)"
  if [[ "$do_git_commit" =~ ^[Yy]$ ]]; then
    echo "  ${GREEN}3${RESET}.  Git commit"
    if [[ "$do_git_push" =~ ^[Yy]$ ]]; then
      echo "  ${GREEN}4${RESET}.  Git push"
      echo "  ${GREEN}5${RESET}.  SVN trunk: sync source → trunk"
      echo "  ${GREEN}6${RESET}.  SVN tag: extract ZIP → tags/${NEW_VERSION}/"
      if [[ "$do_svn_commit" =~ ^[Yy]$ ]]; then
        echo "  ${GREEN}7${RESET}.  SVN commit (trunk + tag)"
        echo "  ${GREEN}8${RESET}.  Done"
      else
        echo "  ${GREEN}7${RESET}.  Done"
      fi
    else
      echo "  ${GREEN}4${RESET}.  SVN trunk: sync source → trunk"
      echo "  ${GREEN}5${RESET}.  SVN tag: extract ZIP → tags/${NEW_VERSION}/"
      if [[ "$do_svn_commit" =~ ^[Yy]$ ]]; then
        echo "  ${GREEN}6${RESET}.  SVN commit (trunk + tag)"
        echo "  ${GREEN}7${RESET}.  Done"
      else
        echo "  ${GREEN}6${RESET}.  Done"
      fi
    fi
  else
    echo "  ${GREEN}3${RESET}.  SVN trunk: sync source → trunk"
    echo "  ${GREEN}4${RESET}.  SVN tag: extract ZIP → tags/${NEW_VERSION}/"
    if [[ "$do_svn_commit" =~ ^[Yy]$ ]]; then
      echo "  ${GREEN}5${RESET}.  SVN commit (trunk + tag)"
      echo "  ${GREEN}6${RESET}.  Done"
    else
      echo "  ${GREEN}5${RESET}.  Done"
    fi
  fi
  echo "──────────────────────────────────────────────────"
  echo ""
  echo "Summary:"
  echo "  Version:       ${CYAN}${NEW_VERSION}${RESET}"
  echo "  Git commit:    ${do_git_commit:-n} $([[ "$do_git_commit" =~ ^[Yy]$ ]] && echo "— \"$git_msg\"")"
  echo "  Git push:      ${do_git_push:-n}"
  echo "  SVN commit:    ${do_svn_commit:-n} $([[ "$do_svn_commit" =~ ^[Yy]$ ]] && echo "— \"$svn_msg\"")"
  echo ""
  read -rp "Proceed? [y/N]: " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi

  # 7. Run steps
  step "Updating version in source files..."
  update_version_in_file "$PLUGIN_ROOT/coolbird-vietnam-address.php" "$NEW_VERSION"
  update_readme_stable_tag "$PLUGIN_ROOT/readme.txt" "$NEW_VERSION"

  step "Running build.sh..."
  if "$PLUGIN_ROOT/build.sh"; then
    log "build.sh completed"
  else
    err "build.sh failed — cannot extract ZIP for SVN tag"
  fi

  if [[ "$do_git_commit" =~ ^[Yy]$ ]]; then
    step "Committing to git..."
    git add -A
    git commit -m "$git_msg"
    log "Git committed: $git_msg"

    if [[ "$do_git_push" =~ ^[Yy]$ ]]; then
      step "Pushing to remote..."
      git push
      log "Git pushed"
    else
      warn "Git push skipped"
    fi
  else
    warn "Git commit skipped"
  fi

  # SVN sync + extract always run
  step "SVN trunk: sync source → trunk..."
  svn_sync_trunk

  step "SVN tag: extract ZIP → tags/${NEW_VERSION}/..."
  svn_prepare_tag "$NEW_VERSION"

  if [[ "$do_svn_commit" =~ ^[Yy]$ ]]; then
    step "SVN committing..."
    svn_commit_trunk "$svn_msg"
    svn_commit_tag "$NEW_VERSION"
    log "SVN committed"
  else
    warn "SVN commit skipped"
  fi

  echo ""
  echo "╔══════════════════════════════════════════════╗"
  echo "║           🎉 Release v${NEW_VERSION} complete!            ║"
  echo "╚══════════════════════════════════════════════╝"
  echo ""
}

main "$@"
