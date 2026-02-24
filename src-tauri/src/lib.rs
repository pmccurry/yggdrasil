mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(commands::shell::PtyStore::new())
        .invoke_handler(tauri::generate_handler![
            commands::shell::spawn_shell,
            commands::shell::write_to_shell,
            commands::shell::resize_shell,
            commands::shell::kill_shell,
            commands::filesystem::read_directory,
            commands::filesystem::read_file,
            commands::git::get_git_status,
            commands::claude::detect_claude_desktop,
            commands::claude::launch_claude_desktop,
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
