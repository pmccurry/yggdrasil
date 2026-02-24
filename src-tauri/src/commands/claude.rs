#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[tauri::command]
pub async fn detect_claude_desktop() -> Result<bool, String> {
    // Both Claude Desktop and Claude Code CLI run as "claude.exe".
    // Distinguish by checking if any claude process runs from WindowsApps (Store app).
    let output = std::process::Command::new("powershell")
        .args([
            "-WindowStyle", "Hidden",
            "-Command",
            r#"Get-Process -Name claude -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*WindowsApps*' } | Select-Object -First 1 | ForEach-Object { $_.Id }"#,
        ])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
        .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(!stdout.is_empty())
}

#[tauri::command]
pub async fn launch_claude_desktop() -> Result<(), String> {
    // Claude Desktop on Windows installs as a Windows Store (MSIX) app.
    // The correct way to launch Store apps is via Get-AppxPackage + shell:AppsFolder AUMID.
    let output = std::process::Command::new("powershell")
        .args([
            "-WindowStyle", "Hidden",
            "-Command",
            r#"$pkg = Get-AppxPackage | Where-Object { $_.Name -eq 'Claude' } | Select-Object -First 1; if ($pkg) { Start-Process "shell:AppsFolder\$($pkg.PackageFamilyName)!App" } else { exit 1 }"#,
        ])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
        .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

    if output.status.success() {
        return Ok(());
    }

    Err("Claude Desktop not found. Is it installed from the Microsoft Store?".to_string())
}
