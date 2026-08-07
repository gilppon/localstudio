// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{State, Manager};

struct BackendProcess {
    child: Mutex<Option<Child>>,
}

#[tauri::command]
fn get_backend_status() -> String {
    "Backend Orchestrator Process Active".to_string()
}

fn start_python_backend() -> Option<Child> {
    println!("🚀 [Tauri Shell] 백그라운드 FastAPI Python 서브엔진 프로세스를 가동합니다...");
    
    // Attempt to launch Python backend main.py
    let child = Command::new("python")
        .arg("backend/main.py")
        .spawn();

    match child {
        Ok(c) => {
            println!("✅ Python FastAPI 백엔드가 PID {}로 정상 구동되었습니다.", c.id());
            Some(c)
        }
        Err(e) => {
            println!("⚠️ Python 백엔드 직접 구동 실패 (환경변수 또는 묶음 바이너리 검토 필요): {}", e);
            None
        }
    }
}

fn main() {
    let backend_child = start_python_backend();

    tauri::Builder::default()
        .manage(BackendProcess {
            child: Mutex::new(backend_child),
        })
        .invoke_handler(tauri::generate_handler![get_backend_status])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                println!("🛑 [Tauri Shell] 앱 종료 요청 수신: 백그라운드 프로세스 살상(Kill)을 수행합니다.");
                let state: State<BackendProcess> = window.state();
                if let Ok(mut child_lock) = state.child.lock() {
                    if let Some(mut child) = child_lock.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                        println!("🔪 백엔드 Python 서버 프로세스가 완전히 살상(Kill) 되었습니다.");
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
