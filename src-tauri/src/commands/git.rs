use std::collections::HashMap;
use std::process::Command;

#[tauri::command]
pub async fn get_git_status(repo_path: String) -> Result<HashMap<String, String>, String> {
    let output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git status: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("git status failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let mut statuses: HashMap<String, String> = HashMap::new();

    for line in stdout.lines() {
        if line.len() < 4 {
            continue;
        }
        let status_code = line[..2].trim().to_string();
        let file_path = line[3..].trim().to_string();
        if !file_path.is_empty() {
            statuses.insert(file_path, status_code);
        }
    }

    Ok(statuses)
}
