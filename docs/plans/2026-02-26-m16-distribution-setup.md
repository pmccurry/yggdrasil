# M16 — Distribution Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up GitHub Actions CI to build, sign, and release Yggdrasil for Windows on version tag push.

**Architecture:** Single workflow file using `tauri-apps/tauri-action@v0` handles build, signing, `latest.json` generation, and draft release creation. TESTER_GUIDE.md provides install/update instructions. Manual steps documented for repo secrets setup.

**Tech Stack:** GitHub Actions, tauri-apps/tauri-action@v0, pnpm, Rust stable, Node 20

---

## Task 1: Create GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1:** Create the directory structure and workflow file:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  release:
    runs-on: windows-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies
        run: pnpm install

      - name: Build and release
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Yggdrasil ${{ github.ref_name }}'
          releaseBody: 'See the assets to download and install this version.'
          releaseDraft: true
          prerelease: false
          updaterJsonPreferNsis: true
```

**Step 2:** Verify the YAML is valid (no syntax errors — check indentation).

---

## Task 2: Create TESTER_GUIDE.md

**Files:**
- Create: `TESTER_GUIDE.md`

**Step 1:** Create the tester guide at repo root:

```markdown
# Yggdrasil — Tester Guide

Yggdrasil is a developer workspace app that combines terminals, file trees, editors, AI chat, and git into a single configurable window.

## System Requirements

- Windows 10 or later
- Git installed and in PATH (for the Git panel)
- Docker installed (optional — only needed for Docker status widget)

## How to Install

1. Go to the [latest release](https://github.com/pmccurry/yggdrasil/releases/latest)
2. Download the `.exe` installer (NSIS)
3. Run the installer
4. **Windows SmartScreen warning**: The app is not code-signed yet. If you see "Windows protected your PC", click **More info** then **Run anyway**

## How to Update

Yggdrasil checks for updates automatically on startup. When an update is available:

1. A chip appears in the top status bar showing the new version
2. Click the chip to open Settings
3. Go to the **About** tab
4. Click **Install Update** — the app will download, install, and restart

You can also check manually: **Settings > About > Check for Updates**

## How to Report Issues

Open an issue at: https://github.com/pmccurry/yggdrasil/issues

Include:
- What you were doing
- What happened vs what you expected
- Screenshots if helpful

## Privacy

Yggdrasil collects zero telemetry. No data leaves your machine. All configuration, workspaces, and credentials are stored locally on your computer.
```

---

## Task 3: DECISIONS.md + IMPLEMENTATION.md + Verify

**Files:**
- Modify: `DECISIONS.md`
- Modify: `IMPLEMENTATION.md`

**Step 1:** Add D040 to DECISIONS.md:

```
## D040 — CI/CD: GitHub Actions with tauri-apps/tauri-action
**Date:** 2026-02-26
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Use GitHub Actions with `tauri-apps/tauri-action@v0` for CI/CD. Workflow triggers
on version tag push (`v*`), builds Windows installer, signs with Tauri updater key,
generates `latest.json`, and creates a draft GitHub release.

**Alternatives Considered:**
- Manual workflow steps (install Rust, Node, build, construct latest.json by hand) —
  more maintenance, error-prone latest.json generation. Rejected.
- Other CI systems (CircleCI, GitLab CI) — no advantage over GitHub Actions for a
  GitHub-hosted repo with free private repo minutes. Rejected.

**Rationale:**
The official tauri-action handles build, signing, latest.json, and release upload
in one step. It's maintained by the Tauri team and purpose-built for this workflow.
Draft releases allow review before publishing.

**Implications:**
- Two repo secrets required: TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD
- Version tags (v*) trigger builds — no builds on regular commits
- Releases are created as drafts — must be manually published
- Version must be bumped in package.json, tauri.conf.json, and Cargo.toml before tagging
```

**Step 2:** Update IMPLEMENTATION.md status snapshot: M16 → `[IN PROGRESS]`.

**Step 3:** Append M16 plan journal entry to IMPLEMENTATION.md under `### M16 — Plan Journal`.

**Step 4:** Verify: `pnpm tsc --noEmit` + `cargo check` + `pnpm build` — zero errors.

---

## Manual Steps (Not Automatable)

After all tasks are committed and pushed:

1. **Add repo secrets**: Go to `github.com/pmccurry/yggdrasil/settings/secrets/actions` and add:
   - `TAURI_SIGNING_PRIVATE_KEY` — paste contents of `~/.tauri/yggdrasil.key`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — leave empty (or set to empty string)

2. **First release**: Bump version in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` to `0.1.0`, commit, then:
   ```bash
   git tag v0.1.0
   git push origin main --tags
   ```

3. **Verify release**: Check GitHub Actions for successful build, then review draft release assets (NSIS .exe, MSI, .sig files, latest.json).

4. **Publish release**: Edit the draft release on GitHub, review assets, click "Publish release".

5. **Test on clean machine**: Download the NSIS installer from the release, install on a clean Windows machine, verify first-run experience and all panels work.

6. **Share with tester**: Send installer link from the published release.

---

## Files Summary

| File | Action |
|------|--------|
| `.github/workflows/release.yml` | Create: CI workflow |
| `TESTER_GUIDE.md` | Create: tester instructions |
| `DECISIONS.md` | Edit: D040 CI/CD decision |
| `IMPLEMENTATION.md` | Edit: plan journal + status |

## Verification

- `pnpm tsc --noEmit` + `cargo check` + `pnpm build` — zero errors
- `.github/workflows/release.yml` has valid YAML syntax
- TESTER_GUIDE.md has correct release URL, privacy statement, and SmartScreen instructions
- DECISIONS.md has D040 entry for CI/CD approach
- IMPLEMENTATION.md status snapshot updated, plan journal entry appended

## Estimated Scope

- **Automatable tasks:** 3 (workflow file, tester guide, doc updates)
- **Manual tasks:** 6 (repo secrets, version bump, tag push, verify build, test install, share with tester)
- **New files:** 2 (`.github/workflows/release.yml`, `TESTER_GUIDE.md`)
- **Modified files:** 2 (`DECISIONS.md`, `IMPLEMENTATION.md`)