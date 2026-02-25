use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[tauri::command]
pub async fn http_poll_endpoint(url: String, timeout_secs: u64) -> Result<u16, String> {
    let timeout = timeout_secs.to_string();

    let mut cmd = Command::new("curl");
    cmd.args(["-o", "/dev/null", "-s", "-w", "%{http_code}", "--max-time", &timeout, &url]);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let output = match cmd.output() {
        Ok(o) => o,
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("not found") || msg.contains("No such file") || msg.contains("program not found") {
                return Err(format!("curl_not_found: {}", msg));
            }
            return Err(format!("http_unreachable: {}", msg));
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // curl returns "000" when the host is unreachable / connection refused
    match stdout.parse::<u16>() {
        Ok(0) => Err(format!("http_unreachable: curl returned 000 for {}", url)),
        Ok(code) => Ok(code),
        Err(_) => Err(format!("http_unreachable: unexpected curl output: {}", stdout)),
    }
}
