// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{State, Manager, AppHandle, Emitter};
use std::path::{Path, PathBuf};
use std::fs;
use std::thread;
use std::time::Duration;

struct BackendProcess {
    child: Mutex<Option<Child>>,
}

#[derive(Clone, serde::Serialize)]
struct SetupProgress {
    percent: f64,
    speed_mbps: f64,
    status: String,
}

// 가상환경 ZIP 프리셋 URL (실제 Hugging Face Dataset LFS 주소)
const NVIDIA_ENV_URL: &str = "https://huggingface.co/datasets/city96/FLUX.1-schnell-gguf/resolve/main/python_env_cuda.zip";
const CPU_ENV_URL: &str = "https://huggingface.co/datasets/city96/FLUX.1-schnell-gguf/resolve/main/python_env_cpu.zip";

// 예상 압축본 크기 (바이트 단위, 프로그레스 % 가이드용)
const NVIDIA_ENV_SIZE: u64 = 1_800_000_000; // ~1.8 GB
const CPU_ENV_SIZE: u64 = 450_000_000;     // ~450 MB

// GPU 감지 기능 (NVIDIA CUDA 유무 확인)
fn detect_gpu_type() -> String {
    // 1. nvidia-smi 명령으로 일차 감지
    if let Ok(output) = Command::new("nvidia-smi").arg("-L").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.to_uppercase().contains("NVIDIA") {
            println!("🔍 [GPU Profiler] nvidia-smi 감지: NVIDIA GPU 활성화");
            return "NVIDIA".to_string();
        }
    }
    // 2. wmic 쿼리로 이차 감지 (NVIDIA 계열 이름이 잡히는지 확인)
    if let Ok(output) = Command::new("wmic")
        .args(&["path", "win32_VideoController", "get", "name"])
        .output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.to_uppercase().contains("NVIDIA") {
            println!("🔍 [GPU Profiler] WMIC 감지: NVIDIA 계열 비디오 디바이스 확인");
            return "NVIDIA".to_string();
        }
    }
    println!("🔍 [GPU Profiler] NVIDIA GPU가 감지되지 않음. CPU 전용 모드로 셋업합니다.");
    "CPU".to_string()
}

// 재귀적 디렉토리 복사 함수
fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let file_name = entry.file_name();
        
        // 불필요하거나 대용량 폴더 동기화 방지
        if file_name == "__pycache__" || file_name == "outputs" || file_name == "models" {
            continue;
        }
        
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(file_name))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(file_name))?;
        }
    }
    Ok(())
}

// 번들 리소스의 파이썬 코드 (*.py)를 사용자 AppData 로컬 폴더로 동기화
fn sync_backend_sources(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_local_data_dir()
        .map_err(|e| format!("AppData 경로 획득 실패: {}", e))?;
    
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("AppData 폴더 생성 실패: {}", e))?;
        
    let target_backend_dir = app_data_dir.join("backend");
    
    // 리소스 폴더 속의 backend 소스 경로 획득
    let resource_backend = app.path().resource_dir()
        .map(|p| p.join("backend"))
        .unwrap_or_else(|_| PathBuf::from("backend"));
        
    if resource_backend.exists() {
        println!("🔄 [Tauri Core] 백엔드 코드 동기화 중: {:?} -> {:?}", resource_backend, target_backend_dir);
        copy_dir_all(&resource_backend, &target_backend_dir)
            .map_err(|e| format!("백엔드 코드 리소스 복사 실패: {}", e))?;
        println!("✅ [Tauri Core] 백엔드 코드 동기화 완료.");
    } else {
        println!("⚠️ [Tauri Core] 동봉된 backend 리소스 폴더를 찾을 수 없어 로컬 실행을 우회합니다.");
    }
    
    Ok(app_data_dir)
}

// 임베디드 백엔드 프로세스 구동 함수
fn start_embedded_backend(app: &AppHandle) -> Result<(), String> {
    // 1. 소스코드 복사 진행
    let app_data_dir = sync_backend_sources(app)?;
    
    let env_dir = app_data_dir.join("env");
    let python_exe = env_dir.join("Scripts").join("python.exe");
    
    if !python_exe.exists() {
        return Err("파이썬 가상 환경이 설치되어 있지 않습니다.".to_string());
    }
    
    println!("🚀 [Tauri Core] 로컬 AppData 백엔드 기동 시작: {:?}", python_exe);
    
    // AppData/backend/main.py 실행
    let child = Command::new(&python_exe)
        .arg("backend/main.py")
        .current_dir(&app_data_dir) // 가동 위치를 app_local_data_dir로 지정하여 상대 경로 호환 유지
        .spawn();
        
    match child {
        Ok(c) => {
            println!("✅ 임베디드 백엔드가 PID {}로 가동되었습니다.", c.id());
            let state: State<BackendProcess> = app.state();
            if let Ok(mut child_lock) = state.child.lock() {
                *child_lock = Some(c);
            }
            Ok(())
        }
        Err(e) => Err(format!("임베디드 Python 프로세스 기동 에러: {}", e)),
    }
}

#[tauri::command]
fn get_backend_status(app: AppHandle) -> String {
    let app_data_dir = match app.path().app_local_data_dir() {
        Ok(p) => p,
        Err(_) => return "PathError".to_string(),
    };
    
    let python_exe = app_data_dir.join("env").join("Scripts").join("python.exe");
    if !python_exe.exists() {
        return "NeedSetup".to_string();
    }
    
    let state: State<BackendProcess> = app.state();
    if let Ok(child_lock) = state.child.lock() {
        if child_lock.is_some() {
            return "Active".to_string();
        }
    }
    
    // 가상환경은 존재하나 기동이 안 된 상태라면 자동 기동 시도
    if start_embedded_backend(&app).is_ok() {
        "Active".to_string()
    } else {
        "FailedToStart".to_string()
    }
}

#[tauri::command]
async fn start_bootstrap_setup(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app.path().app_local_data_dir()
        .map_err(|e| format!("AppData 경로 획득 에러: {}", e))?;
        
    let env_dir = app_data_dir.join("env");
    if env_dir.exists() {
        return Ok("AlreadyInstalled".to_string());
    }
    
    let gpu_type = detect_gpu_type();
    let (download_url, expected_size) = if gpu_type == "NVIDIA" {
        (NVIDIA_ENV_URL, NVIDIA_ENV_SIZE)
    } else {
        (CPU_ENV_URL, CPU_ENV_SIZE)
    };
    
    let temp_zip = app_data_dir.join("temp_env.zip");
    if temp_zip.exists() {
        let _ = fs::remove_file(&temp_zip);
    }
    
    let app_clone = app.clone();
    let temp_zip_clone = temp_zip.clone();
    let env_dir_clone = env_dir.clone();
    let download_url_str = download_url.to_string();
    
    thread::spawn(move || {
        let _ = app_clone.emit("setup_progress", SetupProgress {
            percent: 0.0,
            speed_mbps: 0.0,
            status: format!("{} 가속화 전용 파이썬 환경 다운로드 시작...", gpu_type),
        });
        
        // Windows 내장 curl.exe를 활용하여 의존성 없는 안전한 대용량 다운로드 가동
        let curl_child = Command::new("curl")
            .arg("-L")
            .arg("-o")
            .arg(&temp_zip_clone)
            .arg(&download_url_str)
            .spawn();
            
        if let Ok(mut child) = curl_child {
            let start_time = std::time::Instant::now();
            
            // 프로세스가 실행 완료될 때까지 쓰기 중인 파일 크기를 폴링
            while child.try_wait().unwrap().is_none() {
                thread::sleep(Duration::from_millis(500));
                
                if let Ok(meta) = fs::metadata(&temp_zip_clone) {
                    let size = meta.len();
                    let elapsed = start_time.elapsed().as_secs_f64();
                    let speed = (size as f64 / (1024.0 * 1024.0)) / elapsed.max(0.1);
                    let percent = ((size as f64 / expected_size as f64) * 100.0).min(99.0);
                    
                    let _ = app_clone.emit("setup_progress", SetupProgress {
                        percent,
                        speed_mbps: speed,
                        status: format!("의존성 파일 다운로드 중... ({:.1} MB 수신 완료)", size as f64 / (1024.0 * 1024.0)),
                    });
                }
            }
            
            let status = child.wait().unwrap();
            if !status.success() {
                let _ = app_clone.emit("setup_progress", SetupProgress {
                    percent: 0.0,
                    speed_mbps: 0.0,
                    status: "FAILED: 다운로드 실패 (인터넷 망 연결 상태를 점검하십시오)".to_string(),
                });
                return;
            }
        } else {
            let _ = app_clone.emit("setup_progress", SetupProgress {
                percent: 0.0,
                speed_mbps: 0.0,
                status: "FAILED: curl.exe 실행 불가".to_string(),
            });
            return;
        }
        
        // 압축 풀기 작업
        let _ = app_clone.emit("setup_progress", SetupProgress {
            percent: 99.0,
            speed_mbps: 0.0,
            status: "가상환경 압축 파일 추출 중... (이 작업은 시스템 성능에 따라 최대 2분 소요될 수 있습니다)".to_string(),
        });
        
        // Windows 내장 PowerShell의 Expand-Archive 사용
        let unzip_status = Command::new("powershell")
            .arg("-Command")
            .arg(format!("Expand-Archive -Path '{}' -DestinationPath '{}' -Force", temp_zip_clone.display(), env_dir_clone.display()))
            .status();
            
        let success = match unzip_status {
            Ok(s) => s.success(),
            Err(_) => false,
        };
        
        // 임시 파일 클린업
        let _ = fs::remove_file(&temp_zip_clone);
        
        if success {
            let _ = app_clone.emit("setup_progress", SetupProgress {
                percent: 100.0,
                speed_mbps: 0.0,
                status: "COMPLETED".to_string(),
            });
            
            // 즉시 백엔드 엔진 웜업 기동
            if let Err(e) = start_embedded_backend(&app_clone) {
                println!("⚠️ [Tauri Core] 가상환경 해제 직후 자동 기동 실패: {}", e);
            }
        } else {
            let _ = app_clone.emit("setup_progress", SetupProgress {
                percent: 0.0,
                speed_mbps: 0.0,
                status: "FAILED: 가상 환경 압축 해제 처리 실패".to_string(),
            });
        }
    });
    
    Ok("BootstrapThreadStarted".to_string())
}

fn main() {
    // 앱 초기 가동 단계에서 설치 확인 후 자동 구동 시도
    let backend_child = Mutex::new(None);

    tauri::Builder::default()
        .manage(BackendProcess {
            child: backend_child,
        })
        .setup(|app| {
            let handle = app.handle();
            // 부팅 시점에 가상환경이 존재하는가?
            let app_data_dir = handle.path().app_local_data_dir().unwrap();
            let python_exe = app_data_dir.join("env").join("Scripts").join("python.exe");
            
            if python_exe.exists() {
                if let Err(e) = start_embedded_backend(handle) {
                    println!("⚠️ [Tauri Core] 최초 부팅 시 백엔드 구동 실패: {}", e);
                }
            } else {
                println!("💡 [Tauri Core] 가상환경 미설치 상태. 부트스트랩 트리거를 대기합니다.");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_backend_status, start_bootstrap_setup])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                println!("🛑 [Tauri Core] 데스크톱 앱 종료 요청 수신: 가동 중인 백그라운드 프로세스를 죽입니다.");
                let state: State<BackendProcess> = window.state();
                if let Ok(mut child_lock) = state.child.lock() {
                    if let Some(mut child) = child_lock.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                        println!("🔪 백엔드 Python 프로세스가 완전히 소멸(Kill)되었습니다.");
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

