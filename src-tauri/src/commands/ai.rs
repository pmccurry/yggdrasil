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
        .map_err(|_| "Could not access credential store — is an API key saved for this provider?".to_string())?;
    let api_key = entry.get_password()
        .map_err(|_| "No API key found — add one in Settings > Providers.".to_string())?;

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
        .map_err(|e| {
            if e.is_connect() {
                format!("Connection failed — check that the endpoint URL is correct and reachable.")
            } else if e.is_timeout() {
                "Request timed out — the provider may be unavailable. Try again.".to_string()
            } else {
                format!("Network error: {}", e)
            }
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        return Err(format_api_error(status.as_u16(), &body_text));
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
        .map_err(|e| {
            if e.is_connect() {
                format!("Connection failed — check that the endpoint URL is correct and reachable.")
            } else if e.is_timeout() {
                "Request timed out — the provider may be unavailable. Try again.".to_string()
            } else {
                format!("Network error: {}", e)
            }
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        return Err(format_api_error(status.as_u16(), &body_text));
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

/// Parse API error responses into human-readable messages.
/// Handles OpenAI format: { "error": { "message": "...", "type": "...", "code": "..." } }
/// Handles Anthropic format: { "error": { "message": "...", "type": "..." } }
/// Falls back to status code description for unparseable bodies.
fn format_api_error(status: u16, body: &str) -> String {
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(body) {
        if let Some(message) = parsed["error"]["message"].as_str() {
            let code = parsed["error"]["code"].as_str().unwrap_or("");

            return match (status, code) {
                (401, _) => "Authentication failed — check your API key.".to_string(),
                (403, _) => "Access denied — your API key doesn't have permission for this resource.".to_string(),
                (429, "insufficient_quota") => "Quota exceeded — check your plan and billing at your provider's dashboard.".to_string(),
                (429, "rate_limit_exceeded") => "Rate limited — too many requests. Try again in a moment.".to_string(),
                (429, _) => format!("Rate limited — {}", message),
                (404, "model_not_found") => format!("Model not found — check your model setting. ({})", message),
                (404, _) => format!("Not found — verify your endpoint configuration. ({})", message),
                (500..=599, _) => format!("Provider server error ({}). Try again later.", status),
                _ => message.to_string(),
            };
        }
    }

    match status {
        401 => "Authentication failed (401) — check your API key.".to_string(),
        403 => "Access denied (403) — check API key permissions.".to_string(),
        429 => "Rate limited (429) — try again in a moment.".to_string(),
        404 => "Not found (404) — check endpoint and model configuration.".to_string(),
        500..=599 => format!("Provider server error ({}). Try again later.", status),
        _ => format!("Request failed with status {}.", status),
    }
}
