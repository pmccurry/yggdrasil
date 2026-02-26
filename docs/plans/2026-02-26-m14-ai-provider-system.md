# M14 — AI Provider System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hardcoded Claude panel with a generic AI provider system supporting webview and API modes, with secure credential storage via Windows Credential Manager.

**Architecture:** Credentials stored in Windows Credential Manager via `keyring` crate — keys never reach TypeScript. AiChatPanel supports two modes: webview (Tauri child webview, reuses ClaudePanel pattern) and API (native chat UI with SSE streaming via `reqwest`). Providers configurable in Settings, stored in AppConfig. Config migration maps existing Claude panels to ai-chat seamlessly.

**Tech Stack:** keyring (Rust, credentials), reqwest with stream feature (Rust, HTTP/SSE), Tauri events (streaming), React (chat UI), CSS modules (styling)

---

## Task 1: Rust Dependencies

**Files:**
- Modify: `src-tauri/Cargo.toml`

**Step 1:** Add `keyring` and `reqwest` to `[dependencies]` in Cargo.toml:

```toml
keyring = { version = "3", features = ["windows-native"] }
reqwest = { version = "0.12", features = ["stream", "json"] }
futures-util = "0.3"
tokio = { version = "1", features = ["rt"] }
```

Notes:
- `keyring` v3 is the latest stable. The `windows-native` feature uses Windows Credential Manager directly.
- `reqwest` needs `stream` for SSE chunked responses and `json` for request body serialization.
- `futures-util` provides `StreamExt` for iterating over reqwest streaming responses.
- `tokio` is likely already pulled in by Tauri but we need `rt` explicitly for the async streaming in `ai.rs`.

**Step 2:** Run `cargo check` in `src-tauri/` — should compile (new deps downloaded, no code using them yet).

**Step 3:** Commit: `"M14 — add keyring, reqwest, futures-util dependencies"`

---

## Task 2: Credential Commands (Rust)

**Files:**
- Create: `src-tauri/src/commands/credentials.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1:** Create `src-tauri/src/commands/credentials.rs`:

```rust
use keyring::Entry;

const SERVICE_NAME: &str = "yggdrasil";

fn get_entry(ref_name: &str) -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, ref_name)
        .map_err(|e| format!("Credential store error: {}", e))
}

#[tauri::command]
pub async fn store_api_key(ref_name: String, key: String) -> Result<(), String> {
    let entry = get_entry(&ref_name)?;
    entry.set_password(&key)
        .map_err(|e| format!("Failed to store key: {}", e))
}

#[tauri::command]
pub async fn delete_api_key(ref_name: String) -> Result<(), String> {
    let entry = get_entry(&ref_name)?;
    entry.delete_credential()
        .map_err(|e| format!("Failed to delete key: {}", e))
}

#[tauri::command]
pub async fn get_key_masked(ref_name: String) -> Result<String, String> {
    let entry = get_entry(&ref_name)?;
    let key = entry.get_password()
        .map_err(|e| format!("Failed to read key: {}", e))?;
    let last4 = if key.len() >= 4 {
        &key[key.len() - 4..]
    } else {
        &key
    };
    Ok(format!("•••••••••{}", last4))
}

#[tauri::command]
pub async fn key_exists(ref_name: String) -> Result<bool, String> {
    let entry = get_entry(&ref_name)?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(format!("Credential check failed: {}", e)),
    }
}
```

**Step 2:** Add `pub mod credentials;` to `src-tauri/src/commands/mod.rs`.

**Step 3:** Register commands in `src-tauri/src/lib.rs` `generate_handler!`:

```rust
commands::credentials::store_api_key,
commands::credentials::delete_api_key,
commands::credentials::get_key_masked,
commands::credentials::key_exists,
```

**Step 4:** Run `cargo check` — zero errors.

---

## Task 3: AI Streaming Command (Rust)

**Files:**
- Create: `src-tauri/src/commands/ai.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1:** Create `src-tauri/src/commands/ai.rs`:

```rust
use serde::{Deserialize, Serialize};
use keyring::Entry;
use tauri::Emitter;
use futures_util::StreamExt;

const SERVICE_NAME: &str = "yggdrasil";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Clone)]
struct StreamChunk {
    content: String,
}

#[derive(Debug, Serialize, Clone)]
struct StreamError {
    error: String,
}

#[tauri::command]
pub async fn ai_chat_stream(
    app: tauri::AppHandle,
    request_id: String,
    provider_type: String,
    api_endpoint: String,
    api_key_ref: String,
    model: String,
    messages: Vec<AiMessage>,
) -> Result<(), String> {
    // Retrieve key from credential store — key never returned to frontend
    let entry = Entry::new(SERVICE_NAME, &api_key_ref)
        .map_err(|e| format!("Credential error: {}", e))?;
    let api_key = entry.get_password()
        .map_err(|e| format!("Failed to retrieve API key: {}", e))?;

    let client = reqwest::Client::new();

    let stream_event = format!("ai-stream-{}", request_id);
    let done_event = format!("ai-stream-done-{}", request_id);
    let error_event = format!("ai-stream-error-{}", request_id);

    let result = if provider_type == "claude" {
        stream_anthropic(&client, &api_endpoint, &api_key, &model, &messages, &app, &stream_event).await
    } else {
        stream_openai(&client, &api_endpoint, &api_key, &model, &messages, &app, &stream_event).await
    };

    match result {
        Ok(()) => {
            let _ = app.emit(&done_event, ());
        }
        Err(e) => {
            let _ = app.emit(&error_event, StreamError { error: e.clone() });
            return Err(e);
        }
    }

    Ok(())
}

async fn stream_openai(
    client: &reqwest::Client,
    api_endpoint: &str,
    api_key: &str,
    model: &str,
    messages: &[AiMessage],
    app: &tauri::AppHandle,
    stream_event: &str,
) -> Result<(), String> {
    let url = format!("{}/v1/chat/completions", api_endpoint.trim_end_matches('/'));

    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true,
    });

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, body));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        // Process complete SSE lines
        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer = buffer[line_end + 1..].to_string();

            if line.starts_with("data: ") {
                let data = &line[6..];
                if data == "[DONE]" {
                    return Ok(());
                }
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(content) = parsed["choices"][0]["delta"]["content"].as_str() {
                        let _ = app.emit(stream_event, StreamChunk { content: content.to_string() });
                    }
                }
            }
        }
    }

    Ok(())
}

async fn stream_anthropic(
    client: &reqwest::Client,
    api_endpoint: &str,
    api_key: &str,
    model: &str,
    messages: &[AiMessage],
    app: &tauri::AppHandle,
    stream_event: &str,
) -> Result<(), String> {
    let url = format!("{}/v1/messages", api_endpoint.trim_end_matches('/'));

    let body = serde_json::json!({
        "model": model,
        "max_tokens": 4096,
        "messages": messages,
        "stream": true,
    });

    let response = client
        .post(&url)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, body));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer = buffer[line_end + 1..].to_string();

            if line.starts_with("data: ") {
                let data = &line[6..];
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                    // Anthropic stream: content_block_delta events have delta.text
                    if parsed["type"] == "content_block_delta" {
                        if let Some(text) = parsed["delta"]["text"].as_str() {
                            let _ = app.emit(stream_event, StreamChunk { content: text.to_string() });
                        }
                    }
                }
            }
        }
    }

    Ok(())
}
```

**Step 2:** Add `pub mod ai;` to `src-tauri/src/commands/mod.rs`.

**Step 3:** Register in `src-tauri/src/lib.rs` `generate_handler!`:

```rust
commands::ai::ai_chat_stream,
```

**Step 4:** Run `cargo check` — zero errors.

**Step 5:** Commit: `"M14 — credential + AI streaming Rust commands"`

---

## Task 4: TypeScript Types + Shell Wrappers

**Files:**
- Modify: `src/types/panels.ts`
- Modify: `src/types/workspace.ts`
- Create: `src/shell/credentials.ts`
- Create: `src/shell/ai.ts`

**Step 1:** Add types to `src/types/panels.ts` — after existing `ClaudeSettings`:

```typescript
// --- V3 AI Provider System ---

export type AiProviderType = 'claude' | 'openai' | 'gemini' | 'custom';
export type AiConnectionMode = 'webview' | 'api';

export interface AiProvider {
  id:              string;
  name:            string;
  providerType:    AiProviderType;
  mode:            AiConnectionMode;
  webviewUrl?:     string;
  apiEndpoint?:    string;
  apiKeyRef?:      string;
  model?:          string;
  enabled:         boolean;
}

export interface AiChatPanelSettings extends PanelSettings {
  providerId: string;
}
```

Add `AiChat = 'ai-chat'` to the `PanelType` enum.

**Step 2:** Update `src/types/workspace.ts` — add `providers` and `updater` to AppConfig:

```typescript
import type { AiProvider } from './panels';

export interface AppConfig {
  version:           string;
  activeWorkspaceId: string;
  workspaces:        Workspace[];
  shortcuts:         KeyboardShortcut[];
  appearance:        AppearanceSettings;
  providers:         AiProvider[];
}
```

**Step 3:** Create `src/shell/credentials.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';

export async function storeApiKey(refName: string, key: string): Promise<void> {
  return invoke<void>('store_api_key', { refName, key });
}

export async function deleteApiKey(refName: string): Promise<void> {
  return invoke<void>('delete_api_key', { refName });
}

export async function getKeyMasked(refName: string): Promise<string> {
  return invoke<string>('get_key_masked', { refName });
}

export async function keyExists(refName: string): Promise<boolean> {
  return invoke<boolean>('key_exists', { refName });
}
```

**Step 4:** Create `src/shell/ai.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function aiChatStream(
  requestId: string,
  providerType: string,
  apiEndpoint: string,
  apiKeyRef: string,
  model: string,
  messages: AiMessage[],
): Promise<void> {
  return invoke<void>('ai_chat_stream', {
    requestId,
    providerType,
    apiEndpoint,
    apiKeyRef,
    model,
    messages,
  });
}
```

**Step 5:** Run `pnpm tsc --noEmit` — expect errors from AppConfig change (providers field missing in WorkspaceContext). That's fixed in Task 5.

---

## Task 5: WorkspaceContext + Config Migration

**Files:**
- Modify: `src/store/WorkspaceContext.tsx`
- Modify: `src/shell/workspace.ts`

**Step 1:** Update `WorkspaceState` in `WorkspaceContext.tsx` — add `providers`:

```typescript
interface WorkspaceState {
  loading: boolean;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  shortcuts: KeyboardShortcut[];
  appearance: AppearanceSettings;
  providers: AiProvider[];
}
```

Add import: `import type { AiProvider } from '../types/panels';`

**Step 2:** Add provider actions to the `WorkspaceAction` union:

```typescript
| { type: 'ADD_PROVIDER'; provider: AiProvider }
| { type: 'UPDATE_PROVIDER'; provider: AiProvider }
| { type: 'DELETE_PROVIDER'; providerId: string }
```

**Step 3:** Add reducer cases:

```typescript
case 'ADD_PROVIDER':
  return { ...state, providers: [...state.providers, action.provider] };
case 'UPDATE_PROVIDER':
  return {
    ...state,
    providers: state.providers.map(p => p.id === action.provider.id ? action.provider : p),
  };
case 'DELETE_PROVIDER':
  return {
    ...state,
    providers: state.providers.filter(p => p.id !== action.providerId),
  };
```

**Step 4:** Update the `LOADED` case to include `providers`:

```typescript
case 'LOADED': {
  // ... existing accent color logic ...
  return {
    loading: false,
    workspaces: action.config.workspaces,
    activeWorkspaceId: action.config.activeWorkspaceId,
    shortcuts: action.config.shortcuts,
    appearance: action.config.appearance,
    providers: action.config.providers,
  };
}
```

**Step 5:** Update initial state to include `providers: []`.

**Step 6:** Update the save effect's AppConfig construction:

```typescript
const config: AppConfig = {
  version: '1.0.0',
  activeWorkspaceId: state.activeWorkspaceId,
  workspaces: state.workspaces,
  shortcuts: state.shortcuts,
  appearance: state.appearance,
  providers: state.providers,
};
```

Add `state.providers` to the useEffect dependency array.

**Step 7:** Update `src/shell/workspace.ts` — add config migration in `loadConfig()`:

After the existing migration blocks (inside the `if (config)` block, before `if (migrated)`):

```typescript
// Migrate V3: add providers if missing
if (!config.providers || config.providers.length === 0) {
  const claudeId = `provider-${Date.now()}-claude`;
  const chatgptId = `provider-${Date.now()}-chatgpt`;
  const geminiId = `provider-${Date.now()}-gemini`;
  config.providers = [
    { id: claudeId, name: 'Claude', providerType: 'claude', mode: 'webview', webviewUrl: 'https://claude.ai', enabled: true },
    { id: chatgptId, name: 'ChatGPT', providerType: 'openai', mode: 'webview', webviewUrl: 'https://chatgpt.com', enabled: true },
    { id: geminiId, name: 'Gemini', providerType: 'gemini', mode: 'webview', webviewUrl: 'https://gemini.google.com', enabled: true },
  ];

  // Remap Claude panel slots to AiChat
  for (const ws of config.workspaces) {
    for (const panel of ws.layout.panels) {
      if (panel.type === PanelType.Claude || (panel.type as string) === 'claude') {
        panel.type = PanelType.AiChat;
        panel.settings = { providerId: claudeId };
      }
    }
  }
  migrated = true;
}
```

Add imports: `import type { AiProvider } from '../types/panels';`

Update `createDefaultConfig()` — add `providers` to the returned AppConfig:

```typescript
return {
  version: '1.0.0',
  activeWorkspaceId: id,
  workspaces: [defaultWorkspace],
  shortcuts: DEFAULT_SHORTCUTS,
  appearance: { terminalFontSize: 14, editorFontSize: 14 },
  providers: [
    { id: `provider-${Date.now()}-claude`, name: 'Claude', providerType: 'claude' as const, mode: 'webview' as const, webviewUrl: 'https://claude.ai', enabled: true },
    { id: `provider-${Date.now() + 1}-chatgpt`, name: 'ChatGPT', providerType: 'openai' as const, mode: 'webview' as const, webviewUrl: 'https://chatgpt.com', enabled: true },
    { id: `provider-${Date.now() + 2}-gemini`, name: 'Gemini', providerType: 'gemini' as const, mode: 'webview' as const, webviewUrl: 'https://gemini.google.com', enabled: true },
  ],
};
```

Also change the default Claude panel slot in `createDefaultConfig()` and `createNewWorkspace()` from `PanelType.Claude` to `PanelType.AiChat` with `settings: { providerId: claudeId }` (reference the first provider's id).

**Step 8:** Run `pnpm tsc --noEmit` — zero errors.

**Step 9:** Commit: `"M14 — types, shell wrappers, config migration, context providers"`

---

## Task 6: AiChatPanel — Webview Mode + CSS

**Files:**
- Create: `src/panels/ai-chat/AiChatPanel.module.css`
- Create: `src/panels/ai-chat/AiChatPanel.tsx`

**Step 1:** Create directory: `mkdir -p src/panels/ai-chat`

**Step 2:** Create `src/panels/ai-chat/AiChatPanel.module.css`:

CSS module with theme variables. Needs styles for:
- `.container` — full width/height, flex column, bg-surface
- `.webviewArea` — flex: 1, for Tauri child webview placeholder
- `.emptyState`, `.emptyIcon`, `.emptyLabel`, `.emptyHint` — standard empty state (match existing panels)
- `.statusBar` — top bar with connection status
- `.statusDot`, `.statusConnected`, `.statusDisconnected` — status indicators
- `.statusText` — status label
- `.chatContainer` — flex column for API mode chat
- `.messagesArea` — flex: 1, overflow-y auto, scrollable messages
- `.messageBubble` — message row with role indicator
- `.userMessage`, `.assistantMessage` — role-based styling
- `.roleLabel` — small label above message content
- `.messageContent` — message text, white-space pre-wrap
- `.inputArea` — bottom bar, border-top, flex row
- `.chatInput` — textarea, bg-elevated, monospace
- `.sendBtn` — accent-colored send button
- `.providerBadge` — small badge showing provider name in header

Follow patterns from existing panel CSS modules (filetree.module.css, editor.module.css, claude.module.css).

**Step 3:** Create `src/panels/ai-chat/AiChatPanel.tsx`:

This is the main component. It handles both webview and API modes.

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import type { PanelProps, AiChatPanelSettings, AiProvider } from '../../types/panels';
import { useWorkspaceContext } from '../../store/WorkspaceContext';
import { Webview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import { listen } from '@tauri-apps/api/event';
import type { AiMessage } from '../../shell/ai';
import { aiChatStream } from '../../shell/ai';
import styles from './AiChatPanel.module.css';
```

Component structure:
1. Look up provider from `state.providers` using `(settings as AiChatPanelSettings).providerId`
2. If no provider found → empty state: "No provider configured"
3. If provider disabled → empty state: "Provider disabled"
4. If `provider.mode === 'webview'` → render webview (same pattern as ClaudePanel: container div, useEffect creates Tauri Webview, ResizeObserver, picker/drag/modal off-screen handlers)
5. If `provider.mode === 'api'` → render native chat UI (AiChatMessages + AiChatInput inline — no separate files needed initially, can extract later)

**Webview mode** — port the following from ClaudePanel.tsx verbatim, changing only:
- Label: `ai-chat-${panelId}` instead of `claude-${panelId}`
- URL: `provider.webviewUrl` instead of hardcoded claude.ai
- Remove all Claude Desktop detection/launch logic
- Keep: webview creation, ResizeObserver, picker/drag/modal event handlers, cleanup

**API mode** — inline in the same component:
- State: `messages: AiMessage[]`, `streaming: boolean`, `inputValue: string`
- `handleSend`: push user message, generate requestId (`crypto.randomUUID()`), call `aiChatStream`, listen for stream/done/error events
- Stream events: append content chunks to the last assistant message
- Done event: set streaming = false, cleanup listeners
- Error event: show error, set streaming = false
- Auto-scroll messages div to bottom on new content
- Ctrl+Enter shortcut on textarea

**Step 4:** Run `pnpm tsc --noEmit` — zero errors.

---

## Task 7: Panel Registry Update

**Files:**
- Modify: `src/panels/registry.ts`

**Step 1:** Add lazy import for AiChatPanel:

```typescript
const AiChatPanel = lazy(() => import('./ai-chat/AiChatPanel'));
```

**Step 2:** Add registry entry:

```typescript
[PanelType.AiChat]: {
  type: PanelType.AiChat, label: 'AI Chat', icon: '✦',
  description: 'AI chat provider', component: AiChatPanel,
  defaults: { providerId: '' },
},
```

**Step 3:** Remove the `[PanelType.Claude]` entry from the registry. The Claude panel type stays in the enum (for migration compat) but is no longer selectable from the panel picker.

**Step 4:** Run `pnpm tsc --noEmit` — zero errors.

**Step 5:** Commit: `"M14 — AiChatPanel + registry, webview + API modes"`

---

## Task 8: ProvidersTab in Settings

**Files:**
- Modify: `src/workspace/Settings/ProvidersTab.tsx`

**Step 1:** Full rewrite of ProvidersTab. This replaces the placeholder with:

**Provider list:**
- Each provider row: name, type badge (`Claude`/`OpenAI`/`Gemini`/`Custom`), mode badge (`Webview`/`API`), enabled toggle, masked key indicator (API only), delete button
- Masked key: fetch from `getKeyMasked(provider.apiKeyRef)` on mount for each API provider
- Delete: confirm dialog, then dispatch `DELETE_PROVIDER` + `deleteApiKey` if API mode

**Add provider form** (inline, toggled by button):
- Name input
- Provider type select: claude, openai, gemini, custom
- Mode select: webview, api
- If webview: URL input (pre-filled by type: claude → claude.ai, openai → chatgpt.com, gemini → gemini.google.com, custom → empty)
- If API: endpoint input (pre-filled: claude → `https://api.anthropic.com`, openai → `https://api.openai.com`, gemini → `https://generativelanguage.googleapis.com`, custom → empty) + model input + key input (type="password")
- Save: generate id, construct AiProvider object, dispatch `ADD_PROVIDER`, if API mode call `storeApiKey(refName, key)` then clear key field, close form
- Cancel: close form

**Imports needed:**
```typescript
import { useWorkspaceContext } from '../../store/WorkspaceContext';
import type { AiProvider, AiProviderType, AiConnectionMode } from '../../types/panels';
import { storeApiKey, deleteApiKey, getKeyMasked } from '../../shell/credentials';
```

**Styling:** Use inline styles with CSS variables matching existing Settings tabs pattern (WorkspacesTab, ShortcutsTab use inline styles). Or use the shared `SettingsModal.module.css` if applicable.

**Step 2:** Run `pnpm tsc --noEmit` — zero errors.

**Step 3:** Commit: `"M14 — ProvidersTab full implementation"`

---

## Task 9: DECISIONS.md + IMPLEMENTATION.md + Final Verification

**Files:**
- Modify: `DECISIONS.md`
- Modify: `IMPLEMENTATION.md`

**Step 1:** Add two new decisions to DECISIONS.md:

**D0XX — keyring crate for credential storage:**
- Decision: Use `keyring` v3 crate for API key storage
- Alternatives: `windows-credentials` (Windows-only, thinner wrapper)
- Rationale: Cross-platform, well-maintained, uses Windows Credential Manager natively, future-proofs for potential macOS/Linux

**D0XX — reqwest for AI API streaming:**
- Decision: Use `reqwest` with `stream` feature for AI provider HTTP calls
- Alternatives: `ureq` (blocking, no async streaming), `tauri-plugin-http` (plugin dependency, unclear SSE support)
- Rationale: De facto Rust HTTP client, native async SSE streaming, widely used in Tauri ecosystem

**Step 2:** Append M14 plan journal entry to IMPLEMENTATION.md. Update status snapshot to `[IN PROGRESS]`.

**Step 3:** Run full verification:
- `pnpm tsc --noEmit` — zero errors
- `cargo check` in `src-tauri/` — zero errors
- `pnpm build` — zero errors

**Step 4:** After user verification:
- Update M14 status to `[COMPLETED]`
- Commit: `"M14 — AI provider system complete"`

---

## Files Summary

| File | Action |
|------|--------|
| `src-tauri/Cargo.toml` | Edit — add keyring, reqwest, futures-util |
| `src-tauri/src/commands/credentials.rs` | Create — 4 credential commands |
| `src-tauri/src/commands/ai.rs` | Create — ai_chat_stream with OpenAI + Anthropic |
| `src-tauri/src/commands/mod.rs` | Edit — add credentials, ai modules |
| `src-tauri/src/lib.rs` | Edit — register 5 new commands |
| `src/types/panels.ts` | Edit — AiProvider, AiChatPanelSettings, AiChat enum |
| `src/types/workspace.ts` | Edit — providers in AppConfig |
| `src/shell/credentials.ts` | Create — 4 credential wrappers |
| `src/shell/ai.ts` | Create — aiChatStream wrapper |
| `src/store/WorkspaceContext.tsx` | Edit — providers state, 3 actions, save |
| `src/shell/workspace.ts` | Edit — migration, default providers |
| `src/panels/ai-chat/AiChatPanel.module.css` | Create — panel styles |
| `src/panels/ai-chat/AiChatPanel.tsx` | Create — main panel, webview + API |
| `src/panels/registry.ts` | Edit — add AiChat, remove Claude entry |
| `src/workspace/Settings/ProvidersTab.tsx` | Edit — full rewrite |
| `DECISIONS.md` | Edit — keyring + reqwest decisions |
| `IMPLEMENTATION.md` | Edit — plan journal + status |

## Verification

- `pnpm tsc --noEmit` + `cargo check` + `pnpm build` — zero errors
- Open AI Chat panel in webview mode → loads claude.ai (or configured URL)
- Switch provider in panel picker → different AI chat site loads
- Add API provider in Settings with key → key stored, masked display shows
- Open AI Chat panel in API mode → native chat UI renders
- Send message → streamed response appears token by token
- Delete provider → panel shows empty state
- Restart app → providers persist, keys still work, migrated panels intact
- Git widget and all other panels unaffected
