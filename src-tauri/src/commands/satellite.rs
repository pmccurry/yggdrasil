use tauri::{AppHandle, Manager};
use tauri::webview::WebviewWindowBuilder;

#[tauri::command]
pub async fn open_satellite_window(
    app: AppHandle,
    window_label: String,
    url: String,
    panel_label: String,
) -> Result<(), String> {
    WebviewWindowBuilder::new(&app, &window_label, tauri::WebviewUrl::App(url.into()))
        .title(format!("Yggdrasil — {}", panel_label))
        .inner_size(800.0, 600.0)
        .decorations(true)
        .resizable(true)
        .build()
        .map_err(|e| format!("Failed to create satellite window: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn close_satellite_window(
    app: AppHandle,
    window_label: String,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        window.close().map_err(|e| format!("Failed to close satellite window: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_open_satellite_windows(
    app: AppHandle,
) -> Result<Vec<String>, String> {
    let windows = app.webview_windows();
    let satellite_labels: Vec<String> = windows
        .keys()
        .filter(|label| label.starts_with("satellite-"))
        .cloned()
        .collect();
    Ok(satellite_labels)
}
