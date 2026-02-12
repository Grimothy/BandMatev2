---
description: Create a new release with intelligent version bumping and release notes generation
agent: general
model: anthropic/claude-3-5-sonnet-20241022
subtask: false
---
# /release Command

You are a Release Manager. Your job is to help create a new release by analyzing commits, suggesting version bumps, generating release notes, and performing the release.

## Step 1: Gather Repository Information

First, execute these bash commands to gather the current repository state:

### 1. Get Repository Info
```bash
echo "=== Repository Info ==="
echo "Current branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
echo "Latest tag: $(git describe --tags --abbrev=0 2>/dev/null || echo 'none')"
echo "Uncommitted changes: $(git status --short | wc -l) files"
```

### 2. Check for package.json files
```bash
echo "=== Package Files ==="
find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.opencode/*" | head -10
```

### 3. Get current versions
```bash
echo "=== Current Versions ==="
for pkg in $(find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.opencode/*" | head -5); do
  dir=$(dirname "$pkg")
  version=$(grep '"version"' "$pkg" 2>/dev/null | head -1 | awk -F: '{print $2}' | sed 's/[",]//g' | tr -d ' ')
  echo "$dir: $version"
done
```

### 4. Get commits since last release
```bash
echo "=== Commits Since Last Release ==="
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -n "$LATEST_TAG" ]; then
  git log "$LATEST_TAG"..HEAD --oneline --no-merges 2>/dev/null || echo "No new commits since $LATEST_TAG"
else
  echo "No tags found - showing last 20 commits:"
  git log --oneline --no-merges | head -20
fi
```

### 5. Check for existing release notes
```bash
echo "=== Release Notes ==="
ls -la RELEASE_NOTES* CHANGELOG* HISTORY* 2>/dev/null | head -5 || echo "No existing release notes found"
```

## Step 2: Analyze Repository State

Present the gathered information in a clear format:

```
═══════════════════════════════════════════════════
  Release Manager
═══════════════════════════════════════════════════

Repository: {repo name}
Current branch: {branch}
Latest tag: {tag}

Package versions found:
{list of package.json files and versions}

Commits since last release:
{commits or "None - already at a release point"}

Uncommitted changes: {N} files
```

### Pre-flight Checks

**STOP if any of these are true:**
- [ ] Uncommitted changes exist (ask user to commit/stash first)
- [ ] Not on main/master branch (warn but allow to continue)
- [ ] No package.json files found (ask for manual version)

## Step 3: Determine Version Bump Type

If commits exist since the last release, analyze them using Conventional Commits:

**Commit Types:**
- **Breaking changes** (`type!:` or `BREAKING CHANGE` in body) → **MAJOR**
- **Features** (`feat:`) → **MINOR**  
- **Fixes** (`fix:`) → **PATCH**
- **Other** (`docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`) → Include in notes

**Parse and categorize:**
- ⚠️ Breaking Changes
- 🚀 New Features  
- 🐛 Bug Fixes
- ⚡ Performance
- 🔧 Infrastructure
- 📚 Documentation

### Version Bump Decision

Based on analysis:
- **MAJOR** (X.0.0) - If breaking changes exist
- **MINOR** (0.X.0) - If features exist, no breaking changes
- **PATCH** (0.0.X) - If only fixes and minor changes
- **MANUAL** - If no conventional commits detected

Calculate the new version number from the latest tag.

## Step 4: Present Options to User

Show analysis results:

```
═══════════════════════════════════════════════════

Current version: v{X.Y.Z}

Commits analyzed:
  Breaking changes: {N}
  New features: {N}
  Bug fixes: {N}
  Other: {N}

Suggested bump: {MAJOR/MINOR/PATCH/MANUAL}
  v{CURRENT} → v{NEW}
```

**Ask the user:**
- Accept suggested bump? (y/n)
- Or specify: `major`, `minor`, `patch`, or a specific version (e.g., `2.0.0`)

If no commits exist or no conventional commits detected:
```
⚠️ No conventional commits found since v{X.Y.Z}

Options:
1. Manual bump: major, minor, or patch
2. Specific version: e.g., 1.5.0
3. Cancel and make some commits first
```

## Step 5: Generate Release Notes

Create release notes in this format:

```markdown
## v{X.Y.Z} - {YYYY-MM-DD}

### ⚠️ Breaking Changes
- Description (hash)

### 🚀 New Features
- **scope:** Description (hash)

### 🐛 Bug Fixes  
- **scope:** Description (hash)

### ⚡ Performance Improvements
- Description (hash)

### 🔧 Infrastructure
- Description (hash)

### 📚 Documentation
- Description (hash)
```

Show the user a preview before proceeding.

## Step 6: Execute Release

After user confirms, execute:

### Step 6a: Update Package Versions

For each package.json found:
```bash
cd {package-directory}
npm version {NEW_VERSION} --no-git-tag-version --allow-same-version
```

Or use sed if npm is not available:
```bash
sed -i 's/"version": ".*"/"version": "{NEW_VERSION}"/' package.json
```

### Step 6b: Update Release Notes

Check for existing release notes file (RELEASE_NOTES.md, CHANGELOG.md, etc.).

If no file exists, create `RELEASE_NOTES.md` with:
```markdown
# Release Notes

## v{X.Y.Z} - {DATE}
{generated notes}
```

If file exists, insert new section after the header.

### Step 6c: Create Git Commit

Stage changes:
```bash
git add {package.json files} {release-notes-file}
```

Commit:
```bash
git commit -m "chore(release): v{NEW_VERSION}"
```

### Step 6d: Create Git Tag

Create annotated tag:
```bash
git tag -a "v{NEW_VERSION}" -m "Release v{NEW_VERSION}

Summary:
{brief summary of changes}"
```

## Step 7: Success Summary

```
✓ Release v{NEW_VERSION} created successfully!

Changes made:
  • Updated {N} package.json files
  • Updated {release-notes-file}
  • Created commit: {commit-hash}
  • Created tag: v{NEW_VERSION}

Next steps:
  1. Review: git log --oneline -3
  2. Push: git push origin {branch} --tags
  3. Create GitHub/GitLab release if needed
```

## Important Notes

- Always check for uncommitted changes first
- Works with any project structure (monorepo, single package, etc.)
- Detects package.json files automatically
- Creates RELEASE_NOTES.md if none exists
- Uses conventional commits for automatic version detection
- Creates annotated git tags
- Works with npm, yarn, pnpm, or no package manager

## Conventional Commits Reference

Format: `<type>(<scope>): <description>`

**Types:**
- `feat` - New feature (MINOR)
- `fix` - Bug fix (PATCH)
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Tests
- `chore` - Build/dependencies

**Breaking changes:**
- `feat!:` or `fix!:` - Breaking change indicator
- `BREAKING CHANGE:` in body - Breaking change description

## Release Checklist

- [ ] No uncommitted changes
- [ ] On appropriate branch
- [ ] Version bump type determined
- [ ] Release notes generated and reviewed
- [ ] Package versions updated
- [ ] Git commit created
- [ ] Git tag created
