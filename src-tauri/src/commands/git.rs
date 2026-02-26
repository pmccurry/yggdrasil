use std::collections::HashMap;
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[tauri::command]
pub async fn get_git_status(repo_path: String) -> Result<HashMap<String, String>, String> {
    let mut cmd = Command::new("git");
    cmd.args(["status", "--porcelain"])
        .current_dir(&repo_path);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let output = cmd
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
        let status_code = line[..2].to_string();
        let file_path = line[3..].trim().to_string();
        if !file_path.is_empty() {
            statuses.insert(file_path, status_code);
        }
    }

    Ok(statuses)
}

#[tauri::command]
pub async fn git_stage(repo_path: String, files: Vec<String>) -> Result<(), String> {
    let mut cmd = Command::new("git");
    cmd.arg("add")
        .args(&files)
        .current_dir(&repo_path);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run git add: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("git add failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub async fn git_unstage(repo_path: String, files: Vec<String>) -> Result<(), String> {
    let mut cmd = Command::new("git");
    cmd.arg("reset")
        .arg("HEAD")
        .args(&files)
        .current_dir(&repo_path);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run git reset: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("git reset failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub async fn git_commit(repo_path: String, message: String) -> Result<(), String> {
    let mut cmd = Command::new("git");
    cmd.args(["commit", "-m", &message])
        .current_dir(&repo_path);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run git commit: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("git commit failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub async fn git_push(repo_path: String) -> Result<String, String> {
    let mut cmd = Command::new("git");
    cmd.arg("push")
        .current_dir(&repo_path);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run git push: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("git push failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    Ok(if stdout.is_empty() { stderr } else { stdout })
}

#[tauri::command]
pub async fn git_pull(repo_path: String) -> Result<String, String> {
    let mut cmd = Command::new("git");
    cmd.arg("pull")
        .current_dir(&repo_path);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run git pull: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("git pull failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    Ok(if stdout.is_empty() { stderr } else { stdout })
}

#[tauri::command]
pub async fn git_current_branch(repo_path: String) -> Result<String, String> {
    let mut cmd = Command::new("git");
    cmd.args(["branch", "--show-current"])
        .current_dir(&repo_path);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run git branch: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("git branch failed: {}", stderr));
    }

    let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(branch)
}
