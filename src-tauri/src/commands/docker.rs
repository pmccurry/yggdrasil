use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[tauri::command]
pub async fn docker_inspect(container_name: String) -> Result<String, String> {
    let mut cmd = Command::new("docker");
    cmd.args(["inspect", &container_name, "--format={{.State.Status}}"]);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let output = match cmd.output() {
        Ok(o) => o,
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("not found") || msg.contains("No such file") || msg.contains("program not found") {
                return Err(format!("docker_not_installed: {}", msg));
            }
            return Err(format!("docker_error: {}", msg));
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        if stderr.contains("not found") || stderr.contains("not recognized") {
            return Err(format!("docker_not_installed: {}", stderr));
        }
        return Err(format!("docker_error: {}", stderr));
    }

    let status = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(status)
}
