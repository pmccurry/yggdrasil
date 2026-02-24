use portable_pty::{native_pty_system, CommandBuilder, PtySize, MasterPty, Child};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

struct PtyInstance {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
    child: Box<dyn Child + Send>,
}

pub struct PtyStore {
    inner: Mutex<HashMap<String, PtyInstance>>,
}

impl PtyStore {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub async fn spawn_shell(
    state: State<'_, PtyStore>,
    app: AppHandle,
    cwd: String,
    shell: String,
) -> Result<String, String> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let mut cmd = CommandBuilder::new(&shell);
    cmd.cwd(&cwd);

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    // Drop slave after spawning — only the master side is needed
    drop(pair.slave);

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get PTY reader: {}", e))?;

    let pty_id = uuid::Uuid::new_v4().to_string();
    let pty_id_clone = pty_id.clone();

    // Background thread reads PTY output and emits Tauri events to frontend
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let event_name = format!("shell-output-{}", pty_id_clone);
                    let _ = app.emit(&event_name, data);
                }
                Err(_) => break,
            }
        }
    });

    let instance = PtyInstance {
        writer,
        master: pair.master,
        child,
    };

    let mut store = state
        .inner
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    store.insert(pty_id.clone(), instance);

    Ok(pty_id)
}

#[tauri::command]
pub async fn write_to_shell(
    state: State<'_, PtyStore>,
    pty_id: String,
    data: String,
) -> Result<(), String> {
    let mut store = state
        .inner
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    let instance = store
        .get_mut(&pty_id)
        .ok_or_else(|| format!("PTY not found: {}", pty_id))?;

    instance
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Write error: {}", e))?;
    instance
        .writer
        .flush()
        .map_err(|e| format!("Flush error: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn resize_shell(
    state: State<'_, PtyStore>,
    pty_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let store = state
        .inner
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    let instance = store
        .get(&pty_id)
        .ok_or_else(|| format!("PTY not found: {}", pty_id))?;

    instance
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Resize error: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn kill_shell(
    state: State<'_, PtyStore>,
    pty_id: String,
) -> Result<(), String> {
    let mut store = state
        .inner
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    if let Some(mut instance) = store.remove(&pty_id) {
        let _ = instance.child.kill();
        let _ = instance.child.wait();
        // writer and master are dropped here, closing the PTY
    }

    Ok(())
}
