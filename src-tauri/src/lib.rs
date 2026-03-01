mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .manage(commands::shell::PtyStore::new())
        .invoke_handler(tauri::generate_handler![
            commands::shell::spawn_shell,
            commands::shell::write_to_shell,
            commands::shell::resize_shell,
            commands::shell::kill_shell,
            commands::filesystem::read_directory,
            commands::filesystem::read_file,
            commands::git::get_git_status,
            commands::git::git_stage,
            commands::git::git_unstage,
            commands::git::git_commit,
            commands::git::git_push,
            commands::git::git_pull,
            commands::git::git_current_branch,
            commands::docker::docker_inspect,
            commands::docker::docker_ps,
            commands::claude::detect_claude_desktop,
            commands::claude::launch_claude_desktop,
            commands::http::http_poll_endpoint,
            commands::credentials::store_api_key,
            commands::credentials::delete_api_key,
            commands::credentials::get_key_masked,
            commands::credentials::key_exists,
            commands::ai::ai_chat_stream,
            commands::notification::request_notification_permission,
            commands::notification::send_os_notification,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
