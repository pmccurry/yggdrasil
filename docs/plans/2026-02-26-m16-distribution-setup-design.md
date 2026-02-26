# M16 — Distribution Setup Design

## Overview

Set up GitHub Actions CI to build, sign, and release Yggdrasil for Windows. Creates a draft GitHub release with NSIS/MSI installers and `latest.json` for the updater on each version tag push. Includes a tester guide.

## Section 1: GitHub Actions Workflow

Single workflow `.github/workflows/release.yml`:

- **Trigger**: Tag push `v*` + manual `workflow_dispatch`
- **Runner**: `windows-latest`
- **Steps**: checkout, setup pnpm, setup Node 20, setup Rust stable, pnpm install, `tauri-apps/tauri-action@v0`
- **tauri-action config**: `tagName`, `releaseName`, `uploadUpdaterJson: true`, `updaterJsonPreferNsis: true`, `releaseDraft: true`
- **Env vars**: `GITHUB_TOKEN` (auto), `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` from repo secrets
- **Output**: Draft release with NSIS + MSI installers, `.sig` files, `latest.json`

## Section 2: Repository Secrets

Two secrets in GitHub repo settings:

- `TAURI_SIGNING_PRIVATE_KEY` — contents of `~/.tauri/yggdrasil.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — empty string

No Windows code signing certificate — SmartScreen warning is acceptable for private testing phase.

## Section 3: TESTER_GUIDE.md

Repo root markdown file:

- What Yggdrasil is (one sentence)
- System requirements: Windows 10+, git in PATH, Docker optional
- Install: download `.exe` from GitHub Releases, SmartScreen workaround note
- Update: automatic check on startup, status bar chip, install from About tab
- Report issues: GitHub Issues
- Privacy: zero telemetry, all data local

## Section 4: Version Bump Convention

Versions in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` must stay in sync. To release: bump all three, commit, `git tag v{version} && git push --tags`. No automated tooling (YAGNI).

## Files

| File | Action |
|------|--------|
| `.github/workflows/release.yml` | Create: CI workflow |
| `TESTER_GUIDE.md` | Create: tester instructions |
| `DECISIONS.md` | Edit: log CI approach decision |
| `IMPLEMENTATION.md` | Edit: plan journal + status |
