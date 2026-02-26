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
