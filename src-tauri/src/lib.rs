use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::thread;
use tauri::{Emitter, Manager};

#[tauri::command]
fn read_script(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))
}

#[tauri::command]
fn write_script(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| format!("写入文件失败: {}", e))
}

#[tauri::command]
fn delete_script(path: String) -> Result<(), String> {
    std::fs::remove_file(&path).map_err(|e| format!("删除文件失败: {}", e))
}

#[tauri::command]
fn list_scripts(folder: String) -> Result<Vec<String>, String> {
    let mut result = Vec::new();
    let dir = std::fs::read_dir(&folder).map_err(|e| format!("读取目录失败: {}", e))?;
    for entry in dir {
        let entry = entry.map_err(|e| format!("读取条目失败: {}", e))?;
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "bat") {
            result.push(path.to_string_lossy().to_string());
        }
    }
    Ok(result)
}

/// 写 BAT 到临时文件后执行（支持多行脚本，输出会实时传回前端）
#[tauri::command]
fn execute_bat(content: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    // 创建临时 BAT 文件
    let temp_dir = std::env::temp_dir();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let bat_path = temp_dir.join(format!("bat_preview_{}.bat", timestamp));
    let bat_path_str = bat_path.to_string_lossy().to_string();

    // 写入 BAT 内容
    std::fs::write(&bat_path, &content)
        .map_err(|e| format!("写入临时文件失败: {}", e))?;

    let app_handle_clone = app_handle.clone();

    thread::spawn(move || {
        // 发送启动信息
        let _ = app_handle_clone.emit("cmd-output", format!("[执行] {}", bat_path_str));

        let child = Command::new("cmd")
            .args(["/C", &bat_path_str])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn();

        match child {
            Ok(mut child) => {
                let stdout = child.stdout.take().unwrap();
                let stderr = child.stderr.take().unwrap();

                let h1 = app_handle_clone.clone();
                let t1 = thread::spawn(move || {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines() {
                        if let Ok(line) = line {
                            let _ = h1.emit("cmd-output", line);
                        }
                    }
                });

                let h2 = app_handle_clone.clone();
                let t2 = thread::spawn(move || {
                    let reader = BufReader::new(stderr);
                    for line in reader.lines() {
                        if let Ok(line) = line {
                            let _ = h2.emit("cmd-output", format!("[错误] {}", line));
                        }
                    }
                });

                t1.join().unwrap();
                t2.join().unwrap();

                let status = child.wait().unwrap();
                let _ = app_handle_clone.emit("cmd-complete", status.success());

                // 清理临时文件
                let _ = std::fs::remove_file(&bat_path);
            }
            Err(e) => {
                let _ = app_handle_clone.emit("cmd-output", format!("[错误] 无法启动进程: {}", e));
                let _ = app_handle_clone.emit("cmd-complete", false);
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn get_app_data_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = app_handle.path().app_data_dir()
        .map_err(|e| format!("获取数据目录失败: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
        .invoke_handler(tauri::generate_handler![
            read_script,
            write_script,
            delete_script,
            list_scripts,
            execute_bat,
            get_app_data_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}