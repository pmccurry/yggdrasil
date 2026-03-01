use serde::Serialize;
use std::fs;

#[derive(Serialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
}

#[tauri::command]
pub async fn read_directory(path: String) -> Result<Vec<FileNode>, String> {
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;

    let mut dirs: Vec<FileNode> = Vec::new();
    let mut files: Vec<FileNode> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and node_modules
        if file_name.starts_with('.') || file_name == "node_modules" {
            continue;
        }

        let file_path = entry.path().to_string_lossy().to_string();
        let is_dir = entry
            .file_type()
            .map(|ft| ft.is_dir())
            .unwrap_or(false);

        let node = FileNode {
            name: file_name,
            path: file_path,
            is_directory: is_dir,
        };

        if is_dir {
            dirs.push(node);
        } else {
            files.push(node);
        }
    }

    // Sort alphabetically within each group
    dirs.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    // Directories first, then files
    dirs.extend(files);
    Ok(dirs)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

#[tauri::command]
pub async fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, &contents)
        .map_err(|e| format!("Failed to write file '{}': {}", path, e))
}
