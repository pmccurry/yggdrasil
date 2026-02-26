use keyring::Entry;

const SERVICE_NAME: &str = "yggdrasil";

fn get_entry(ref_name: &str) -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, ref_name)
        .map_err(|e| format!("Credential store error: {}", e))
}

#[tauri::command]
pub async fn store_api_key(ref_name: String, key: String) -> Result<(), String> {
    let entry = get_entry(&ref_name)?;
    entry.set_password(&key)
        .map_err(|e| format!("Failed to store key: {}", e))
}

#[tauri::command]
pub async fn delete_api_key(ref_name: String) -> Result<(), String> {
    let entry = get_entry(&ref_name)?;
    entry.delete_credential()
        .map_err(|e| format!("Failed to delete key: {}", e))
}

#[tauri::command]
pub async fn get_key_masked(ref_name: String) -> Result<String, String> {
    let entry = get_entry(&ref_name)?;
    let key = entry.get_password()
        .map_err(|e| format!("Failed to read key: {}", e))?;
    let last4 = if key.len() >= 4 {
        &key[key.len() - 4..]
    } else {
        &key
    };
    Ok(format!("\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}{}", last4))
}

#[tauri::command]
pub async fn key_exists(ref_name: String) -> Result<bool, String> {
    let entry = get_entry(&ref_name)?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(format!("Credential check failed: {}", e)),
    }
}
