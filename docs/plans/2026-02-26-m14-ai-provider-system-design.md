# M14 — AI Provider System Design

**Date:** 2026-02-26
**Status:** Approved
**Milestone:** M14

---

## Overview

Replace the hardcoded Claude panel with a generic AI provider system. Supports webview mode (embed any AI chat site) and API mode (native chat UI with streaming via OpenAI-compatible endpoints). Credentials stored securely in Windows Credential Manager — keys never reach the TypeScript frontend.

## Decisions

- **Credential crate:** `keyring` — cross-platform, well-maintained, uses Windows Credential Manager on Windows
- **HTTP crate:** `reqwest` with `stream` feature — async SSE streaming for API mode
- **Scope:** All at once (no sub-milestones)

## Section 1: Security Foundation (Credentials)

**File:** `src-tauri/src/commands/credentials.rs`

4 Tauri commands using the `keyring` crate:

| Command | Signature | Purpose |
|---------|-----------|---------|
| `store_api_key` | `(ref_name: String, key: String) -> Result<(), String>` | Store key in Windows Credential Manager |
| `delete_api_key` | `(ref_name: String) -> Result<(), String>` | Remove key from credential store |
| `get_key_masked` | `(ref_name: String) -> Result<String, String>` | Returns `"•••••••••{last4}"` only |
| `key_exists` | `(ref_name: String) -> Result<bool, String>` | Check if key is configured |

**No `get_api_key` command exists.** The only Rust function that retrieves the full key is `ai_chat_stream`, which uses it inline for the HTTP request and never returns it.

**File:** `src/shell/credentials.ts` — TypeScript wrappers for the 4 commands above.

Key flow: Settings input -> Rust `store_api_key` -> credential store. Input clears immediately. Frontend never holds the key in React state beyond the submit handler.

## Section 2: Types & Schema

**File:** `src/types/panels.ts` — new types:

```typescript
type AiProviderType = 'claude' | 'openai' | 'gemini' | 'custom';
type AiConnectionMode = 'webview' | 'api';

interface AiProvider {
  id: string;              // uuid
  name: string;            // "Claude", "My GPT-4"
  providerType: AiProviderType;
  mode: AiConnectionMode;
  webviewUrl?: string;     // webview mode URL
  apiEndpoint?: string;    // api mode base URL
  apiKeyRef?: string;      // credential store ref name, NOT the key
  model?: string;          // "gpt-4o", "claude-opus-4-6"
  enabled: boolean;
}

interface AiChatPanelSettings extends PanelSettings {
  providerId: string;      // references AiProvider.id
}

// PanelType.AiChat = 'ai-chat' added to enum
```

**File:** `src/types/workspace.ts` — extend AppConfig with `providers: AiProvider[]`.

## Section 3: AiChatPanel — Webview Mode

**File:** `src/panels/ai-chat/AiChatPanel.tsx`

When `provider.mode === 'webview'`:
- Reads `providerId` from settings, looks up `AiProvider` from `config.providers` via `useWorkspace()` context
- Creates Tauri child `Webview` at `provider.webviewUrl` (same pattern as existing ClaudePanel)
- ResizeObserver positioning, picker/drag/modal off-screen events
- No Claude Desktop detection logic — just loads the URL directly
- Empty state if provider not found: "No provider configured"

## Section 4: AiChatPanel — API Mode

**File:** `src-tauri/src/commands/ai.rs`

```rust
ai_chat_stream(
  provider_type: String,
  api_endpoint: String,
  api_key_ref: String,
  model: String,
  messages: Vec<AiMessage>
) -> Result<(), String>
```

Flow:
1. Retrieve key from credential store via `keyring`
2. Build HTTP request — OpenAI format for openai/gemini/custom, Anthropic format for claude
3. Stream SSE chunks via Tauri events (`ai-stream-{requestId}`)
4. Final `ai-stream-done-{requestId}` event on completion
5. Error: `ai-stream-error-{requestId}` with message

**Frontend components:**
- `AiChatMessages.tsx` — scrollable message list, real-time streaming updates, auto-scroll
- `AiChatInput.tsx` — textarea + send, Ctrl+Enter, disabled while streaming
- `AiChatPanel.tsx` (api branch) — manages `messages[]` state, invokes stream, listens for events

Messages live in component state only — no persistence. Closing panel clears conversation.

## Section 5: ProvidersTab in Settings

**File:** `src/workspace/Settings/ProvidersTab.tsx`

**Provider list:** Name, type badge, mode badge, enabled toggle, masked key for API providers, delete button.

**Add provider inline form:**
- Name, provider type selector, mode selector
- Webview: URL input (pre-filled by type)
- API: endpoint input (pre-filled) + model input + key input (type="password")
- Save: stores provider to config, calls `storeApiKey` for API mode, clears key input
- Cancel: discards form

Key input security: value cleared immediately after `storeApiKey` invoke. Masked display fetched fresh from Rust.

## Section 6: Config Migration

In `loadConfig()`:
1. If `providers` missing/empty: seed 3 defaults (claude.ai, chatgpt.com, gemini.google.com — all webview, no keys)
2. Remap all `PanelType.Claude` slots to `PanelType.AiChat` with `providerId` pointing to seeded claude.ai provider
3. Save migrated config

**Registry:** `PanelType.AiChat` registered with lazy import. `PanelType.Claude` stays in enum for migration but removed from registry. ClaudePanel files remain as dead code.

**Context actions:** `ADD_PROVIDER`, `UPDATE_PROVIDER`, `DELETE_PROVIDER`, `SET_PROVIDERS`.

## Files

| File | Action |
|------|--------|
| `src-tauri/src/commands/credentials.rs` | Create |
| `src-tauri/src/commands/ai.rs` | Create |
| `src-tauri/src/commands/mod.rs` | Edit — add modules |
| `src-tauri/src/lib.rs` | Edit — register commands |
| `src-tauri/Cargo.toml` | Edit — add keyring, reqwest |
| `src/shell/credentials.ts` | Create |
| `src/shell/ai.ts` | Create |
| `src/types/panels.ts` | Edit — AiProvider types, AiChat enum |
| `src/types/workspace.ts` | Edit — providers in AppConfig |
| `src/shell/workspace.ts` | Edit — config migration |
| `src/store/WorkspaceContext.tsx` | Edit — provider reducer actions |
| `src/panels/ai-chat/AiChatPanel.tsx` | Create |
| `src/panels/ai-chat/AiChatPanel.module.css` | Create |
| `src/panels/ai-chat/AiChatMessages.tsx` | Create |
| `src/panels/ai-chat/AiChatInput.tsx` | Create |
| `src/panels/registry.ts` | Edit — add AiChat, remove Claude |
| `src/workspace/Settings/ProvidersTab.tsx` | Edit — full implementation |
| `IMPLEMENTATION.md` | Edit — plan journal |
| `DECISIONS.md` | Edit — keyring + reqwest decisions |

## New Dependencies

- `keyring` (Rust crate) — credential storage
- `reqwest` with `stream` feature (Rust crate) — async HTTP + SSE streaming
