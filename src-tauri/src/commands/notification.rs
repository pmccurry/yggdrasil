use tauri_plugin_notification::NotificationExt;

#[tauri::command]
pub async fn request_notification_permission(app: tauri::AppHandle) -> Result<bool, String> {
    let notification = app.notification();
    match notification.request_permission() {
        Ok(perm) => Ok(perm == tauri_plugin_notification::PermissionState::Granted),
        Err(e) => Err(format!("Failed to request permission: {}", e)),
    }
}

#[tauri::command]
pub async fn send_os_notification(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    let notification = app.notification();
    notification
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| format!("Failed to send notification: {}", e))
}
