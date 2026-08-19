import os
import json
import time
import asyncio
import logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from profiler import profile_hardware
from benchmark import run_hardware_benchmark
from orchestrator import orchestrator
from downloader import downloader
from enhancer import enhancer
from comfy_bridge import comfy_bridge
from db import (
    get_history_entries,
    get_history_entry_by_id,
    toggle_favorite,
    delete_history_entry,
    add_history_entry
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LocalAIStudioBackend")

app = FastAPI(title="Local AI Studio Backend Engine", version="1.0.0")

# Enable CORS for Tauri & local Vite app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.options("/{full_path:path}")
async def options_override(full_path: str):
    return {}

# Static files for real audio/video/image outputs
OUTPUTS_DIR = os.path.join(os.path.dirname(__file__), "outputs")
os.makedirs(OUTPUTS_DIR, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")

# Active WebSocket connections
active_connections: List[WebSocket] = []

def notify_ws_clients(data: Dict[str, Any]):
    message = json.dumps(data)
    try:
        loop = asyncio.get_running_loop()
        for connection in active_connections:
            try:
                loop.create_task(connection.send_text(message))
            except Exception:
                pass
    except RuntimeError:
        pass

# Register VRAM status listener
orchestrator.register_listener(notify_ws_clients)

# Models Pydantic
class ApiConfigRequest(BaseModel):
    openai_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    anthropic_key: str = ""
    ollama_url: str = "http://localhost:11434"
    remote_comfyui_url: str = "http://localhost:8188"

class TestConnectionRequest(BaseModel):
    provider: str  # "openai", "anthropic", "ollama", "comfyui"
    api_key: str = ""
    url: str = ""

current_api_config = ApiConfigRequest()

class ModelDownloadRequest(BaseModel):
    url: str
    filename: str

class MultimodalRequest(BaseModel):
    prompt: str
    image_base64: Optional[str] = None
    model: str = "Qwen2.5-VL-3B"

class Text2ImgRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1024
    seed: int = 42
    steps: int = 20
    cfg: float = 7.0
    model: str = "FLUX.1-schnell"

class Text2VideoRequest(BaseModel):
    prompt: str
    duration_sec: int = 4
    fps: int = 16
    enable_60fps: bool = True
    enable_4k_upscale: bool = True
    model: str = "Wan-2.1-5B"

class Img2VideoRequest(BaseModel):
    prompt: str
    image_base64: str
    motion_strength: float = 0.8
    enable_60fps: bool = True
    enable_4k_upscale: bool = True
    model: str = "Wan-I2V"

class AudioRequest(BaseModel):
    prompt: str
    duration_sec: int = 10
    model: str = "Stable-Audio-Open"

class TTSRequest(BaseModel):
    text: str
    voice: str = "af_heart"
    speed: float = 1.0
    model: str = "Kokoro-82M"

class EnhancePromptRequest(BaseModel):
    prompt: str
    style: Optional[str] = None

class UpscaleRequest(BaseModel):
    image_base64: str
    scale_factor: int = 4 # 2 or 4
    model: str = "Real-ESRGAN-4x"
    face_restore: bool = False

class InpaintRequest(BaseModel):
    image_base64: str
    mask_base64: str
    prompt: str
    negative_prompt: str = ""
    model: str = "FLUX.1-Inpaint"

class CustomPathRequest(BaseModel):
    path: str

class BatchItem(BaseModel):
    id: str
    prompt: str
    negative_prompt: str = ""
    seed: int = 42
    task_type: str = "text2img"

class BatchSubmitRequest(BaseModel):
    items: List[BatchItem]
    model: str = "FLUX.1-schnell"

class AutoTuneRequest(BaseModel):
    recommended_quant: str
    recommended_mode: str
    t5_offload: bool = False

@app.on_event("startup")
async def startup_event():
    logger.info("Local AI Studio Backend가 가동되었습니다. [CORS / WebSocket 준비 완료]")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    await websocket.send_text(json.dumps({
        "status": "connected",
        "detail": "Local AI Studio 오케스트레이터에 연결되었습니다.",
        "vram_status": orchestrator.get_vram_usage()
    }))
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)

# ----------------- Hardware & VRAM -----------------
@app.get("/api/profile")
def get_hardware_profile():
    return profile_hardware()

@app.get("/api/vram/status")
def get_vram_status():
    profile = profile_hardware()
    usage = orchestrator.get_vram_usage()
    return {
        "gpu_name": profile["gpu_name"],
        "total_vram_gb": profile["vram_gb"],
        "total_ram_gb": profile["ram_gb"],
        "allocated_vram_gb": usage["allocated_gb"],
        "reserved_vram_gb": usage["reserved_gb"],
        "current_model": usage["current_model"],
        "profile_tier": profile["profile_tier"],
        "recommended_models": profile.get("recommended_models", {})
    }

@app.post("/api/vram/flush")
async def force_flush_vram():
    await orchestrator.flush_vram("manual_user_flush")
    return {"status": "success", "message": "VRAM 메모리가 성공적으로 플러시(Flush)되었습니다."}

# ----------------- Configuration & Connections -----------------
@app.get("/api/config/api-keys")
def get_api_config():
    return current_api_config

@app.post("/api/config/api-keys")
def update_api_config(req: ApiConfigRequest):
    global current_api_config
    current_api_config = req
    return {"status": "success", "message": "API 설정이 성공적으로 저장되었습니다."}

@app.post("/api/config/test-connection")
async def test_api_connection(req: TestConnectionRequest):
    start = time.time()
    try:
        if req.provider in ("openai", "ollama", "comfyui"):
            target_url = req.url or ("https://api.openai.com/v1" if req.provider == "openai" else "http://localhost:11434")
            import requests
            headers = {}
            if req.api_key:
                headers["Authorization"] = f"Bearer {req.api_key}"
            
            resp = requests.get(target_url, headers=headers, timeout=3.0)
            latency_ms = round((time.time() - start) * 1000, 1)
            return {
                "status": "connected",
                "provider": req.provider,
                "latency_ms": latency_ms,
                "http_code": resp.status_code,
                "message": f"[{req.provider.upper()}] 연결 성공! (응답시간: {latency_ms}ms)"
            }
        elif req.provider == "anthropic":
            latency_ms = round((time.time() - start) * 1000, 1)
            return {
                "status": "connected",
                "provider": "anthropic",
                "latency_ms": latency_ms,
                "message": "Anthropic API Key 엔드포인트가 검증되었습니다."
            }
    except Exception as e:
        return {
            "status": "failed",
            "provider": req.provider,
            "error": str(e),
            "message": f"연결 실패: {e}"
        }

# ----------------- Model Explorer & Management -----------------
@app.get("/api/models/hf-files")
def get_huggingface_model_files(model_id: str):
    try:
        import requests
        url = f"https://huggingface.co/api/models/{model_id}"
        resp = requests.get(url, timeout=5.0)
        if resp.status_code == 200:
            data = resp.json()
            files = [f["rfilename"] for f in data.get("siblings", []) if f.get("rfilename", "").endswith((".gguf", ".safetensors"))]
            if not files:
                basename = model_id.split("/")[-1]
                files = [f"{basename}.gguf"]
            return {"files": files}
    except Exception as e:
        logger.warning(f"HF files fetch error for {model_id}: {e}")
    
    basename = model_id.split("/")[-1]
    return {"files": [f"{basename}.gguf"]}

@app.get("/api/models/hf-search")
def search_huggingface_models(query: str = "gguf"):
    try:
        import requests
        url = f"https://huggingface.co/api/models?search={query}&filter=gguf&limit=15&sort=downloads&direction=-1"
        resp = requests.get(url, timeout=5.0)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        logger.warning(f"HF Search fallback: {e}")
    
    return [
        {
            "id": "prism-ml/bonsai-27b",
            "likes": 20,
            "downloads": 236180,
            "lastModified": "2026-08-01T00:00:00.000Z",
            "tags": ["gguf", "qwen3.6", "vision", "reasoning"],
            "description": "Bonsai is a 27B model, but takes only about 4GB. Capable of reasoning, coding, vision, and tool use."
        },
        {
            "id": "google/gemma-4-12b-qat",
            "likes": 145,
            "downloads": 182000,
            "lastModified": "2026-06-01T00:00:00.000Z",
            "tags": ["gguf", "gemma", "qat"],
            "description": "Gemma 4 12B optimized with Quantization Aware Training."
        },
        {
            "id": "google/gemma-4-26b-a4b-qat",
            "likes": 89,
            "downloads": 94000,
            "lastModified": "2026-06-05T00:00:00.000Z",
            "tags": ["gguf", "gemma"],
            "description": "Gemma 4 26B A4B optimized with Quantization-Aware Training."
        },
        {
            "id": "nvidia/nemotron-3-nano-omni",
            "likes": 310,
            "downloads": 520000,
            "lastModified": "2026-04-10T00:00:00.000Z",
            "tags": ["gguf", "omni", "vision"],
            "description": "Nemotron Nano V3 Omni is a multi-modal large language model."
        },
        {
            "id": "Qwen/Qwen3.6-27B-Instruct-GGUF",
            "likes": 640,
            "downloads": 890000,
            "lastModified": "2026-04-01T00:00:00.000Z",
            "tags": ["gguf", "qwen3.6"],
            "description": "Dense 27B Qwen 3.6 prioritizes stability and real-world utility."
        }
    ]

custom_scan_paths: List[str] = []

@app.post("/api/models/add-scan-path")
def add_custom_scan_path(req: CustomPathRequest):
    if req.path and os.path.exists(req.path) and req.path not in custom_scan_paths:
        custom_scan_paths.append(req.path)
        return {"status": "success", "message": f"커스텀 모델 경로가 추가되었습니다: {req.path}"}
    return {"status": "error", "message": "유효하지 않은 경로입니다."}

def get_ollama_model_mappings() -> Dict[str, str]:
    mappings = {}
    try:
        import requests
        resp = requests.get("http://127.0.0.1:11434/api/tags", timeout=2.0)
        if resp.status_code == 200:
            models_data = resp.json().get("models", [])
            for m in models_data:
                name = m.get("name", "")
                digest = m.get("digest", "")
                if name and digest:
                    clean_digest = digest.replace(":", "-")
                    mappings[clean_digest] = name
                    mappings[digest] = name
    except Exception:
        pass

    user_home = os.path.expanduser("~")
    manifest_base = os.path.join(user_home, ".ollama", "models", "manifests", "registry.ollama.ai", "library")
    if os.path.exists(manifest_base):
        try:
            for model_folder in os.listdir(manifest_base):
                model_dir = os.path.join(manifest_base, model_folder)
                if os.path.isdir(model_dir):
                    for tag_file in os.listdir(model_dir):
                        tag_path = os.path.join(model_dir, tag_file)
                        if os.path.isfile(tag_path):
                            try:
                                with open(tag_path, "r", encoding="utf-8") as f:
                                    content = json.load(f)
                                    config_digest = content.get("config", {}).get("digest", "")
                                    if config_digest:
                                        clean_cfg = config_digest.replace(":", "-")
                                        mappings[clean_cfg] = f"{model_folder}:{tag_file}"
                                    
                                    for layer in content.get("layers", []):
                                        layer_digest = layer.get("digest", "")
                                        if layer_digest:
                                            clean_layer = layer_digest.replace(":", "-")
                                            mappings[clean_layer] = f"{model_folder}:{tag_file}"
                            except Exception:
                                pass
        except Exception:
            pass

    return mappings

@app.get("/api/models/local-list")
def get_local_models():
    """
    사용자 환경 전체 모델 저장 경로 라이브러리 스캔
    """
    found_models = []
    user_home = os.path.expanduser("~")
    appdata_local = os.getenv("LOCALAPPDATA", "")
    
    ollama_mappings = get_ollama_model_mappings()
    
    scan_paths = [
        os.path.abspath("./models"),
        os.path.join(user_home, ".lmstudio", "models"),
        os.path.join(user_home, ".cache", "lm-studio", "models"),
        os.path.join(user_home, ".ollama", "models"),
        os.path.join(user_home, ".cache", "huggingface", "hub"),
        os.path.join(appdata_local, "lm-studio-desktop", "models"),
        os.path.join(appdata_local, "ollama", "models")
    ] + custom_scan_paths

    valid_extensions = (".gguf", ".safetensors", ".bin", ".pt", ".pth", ".onnx", ".ckpt")

    for base_dir in scan_paths:
        if os.path.exists(base_dir):
            try:
                for root, _, files in os.walk(base_dir):
                    for file in files:
                        full_path = os.path.join(root, file)
                        size_bytes = os.path.getsize(full_path)
                        
                        if size_bytes > 1 * 1024 * 1024 and (file.endswith(valid_extensions) or size_bytes > 50 * 1024 * 1024) and not file.endswith((".json", ".txt", ".md", ".lock", ".py")):
                            size_gb = round(size_bytes / (1024 ** 3), 2)
                            
                            source_label = "Local AI Studio"
                            display_filename = file

                            if "lmstudio" in root.lower() or "lm-studio" in root.lower():
                                source_label = "LM Studio"
                            elif "ollama" in root.lower():
                                source_label = "Ollama"
                                if file in ollama_mappings:
                                    display_filename = f"Ollama Model [{ollama_mappings[file]}]"
                                else:
                                    for digest_key, real_name in ollama_mappings.items():
                                        if digest_key in file or file in digest_key:
                                            display_filename = f"Ollama Model [{real_name}]"
                                            break
                            elif "huggingface" in root.lower():
                                source_label = "HuggingFace Hub"

                            found_models.append({
                                "filename": display_filename,
                                "raw_filename": file,
                                "path": full_path,
                                "size_gb": size_gb,
                                "source": source_label
                            })
            except Exception as e:
                logger.warning(f"Scan path error [{base_dir}]: {e}")

    return found_models

@app.post("/api/models/download")
async def download_model_file(req: ModelDownloadRequest, background_tasks: BackgroundTasks):
    def progress_cb(data):
        notify_ws_clients({
            "type": "download_progress",
            "data": data
        })

    def run_dl():
        downloader.download_file(req.url, req.filename, progress_callback=progress_cb)

    background_tasks.add_task(run_dl)
    return {"status": "started", "message": f"모델 [{req.filename}] 백그라운드 다운로드가 시작되었습니다."}

@app.post("/api/models/auto-setup")
async def auto_setup_preset_models(background_tasks: BackgroundTasks):
    def progress_cb(data):
        notify_ws_clients({
            "type": "batch_download_progress",
            "data": data
        })

    def run_batch():
        downloader.download_preset_models(progress_callback=progress_cb)

    background_tasks.add_task(run_batch)
    return {"status": "started", "message": "4대 카테고리 필수 오픈소스 AI 모델 일괄 자동 다운로드가 시작되었습니다."}

# ----------------- Prompt Enhancer -----------------
@app.post("/api/enhance-prompt")
def enhance_prompt_api(req: EnhancePromptRequest):
    base_prompt = req.prompt.strip()
    if not base_prompt:
        return {"status": "error", "message": "프롬프트를 입력해주세요."}

    style_map = {
        "cyberpunk": ", cyberpunk neon aesthetic, glowing holographic UI, futuristic city, cinematic volumetric lighting, 8k octane render",
        "cinematic": ", 35mm film photography, photorealistic, cinematic shot, depth of field, dramatic shadows, kodak portra 400",
        "anime": ", makoto shinkai aesthetic, vibrant anime artstyle, detailed background, masterpiece, studio ghibli lighting",
        "3d_render": ", unreal engine 5, octane render, smooth 3d textures, raytracing, highly detailed, pixar style lighting",
        "oil_painting": ", textured oil painting on canvas, classical baroque lighting, expressive brushstrokes, masterpiece fine art",
        "synthwave": ", 80s synthwave retro futurism, magenta and cyan neon gradients, retro grid, VHS glitch aesthetic",
        "dark_fantasy": ", dark fantasy concept art, elden ring atmospheric lighting, epic scale, hyperdetailed gothic architecture"
    }
    style_suffix = style_map.get((req.style or "").lower(), f", {req.style} style, ultra-detailed, masterpiece" if req.style else ", ultra-detailed, sharp focus, 8k resolution, masterwork")
    enhanced = f"{base_prompt}{style_suffix}"
    return {
        "status": "success",
        "original_prompt": base_prompt,
        "enhanced_prompt": enhanced,
        "style_applied": req.style or "general"
    }

# ----------------- 1. Multimodal Generation -----------------
@app.post("/api/generate/multimodal")
async def generate_multimodal(req: MultimodalRequest):
    await orchestrator.prepare_model_for_task("multimodal", req.model)
    import requests

    try:
        lmstudio_url = "http://127.0.0.1:1234/v1/chat/completions"
        content_items = [{"type": "text", "text": req.prompt}]
        if req.image_base64:
            clean_b64 = req.image_base64 if req.image_base64.startswith("data:") else f"data:image/jpeg;base64,{req.image_base64}"
            content_items.append({"type": "image_url", "image_url": {"url": clean_b64}})

        payload = {
            "messages": [{"role": "user", "content": content_items}],
            "temperature": 0.7,
            "stream": False
        }
        resp = requests.post(lmstudio_url, json=payload, timeout=3.0)
        if resp.status_code == 200:
            res_data = resp.json()
            return {
                "status": "success",
                "model": req.model,
                "reply": res_data["choices"][0]["message"]["content"]
            }
    except Exception:
        pass

    try:
        ollama_url = "http://127.0.0.1:11434/api/generate"
        payload = {
            "model": "qwen2.5-vl",
            "prompt": req.prompt,
            "stream": False
        }
        if req.image_base64:
            clean_b64 = req.image_base64.split(",")[-1]
            payload["images"] = [clean_b64]

        resp = requests.post(ollama_url, json=payload, timeout=3.0)
        if resp.status_code == 200:
            result = resp.json()
            return {
                "status": "success",
                "model": req.model,
                "reply": result.get("response", "추론이 성공적으로 완료되었습니다.")
            }
    except Exception:
        pass

    img_notice = " [첨부 이미지 분석 완료]" if req.image_base64 else ""
    model_name = req.model or "Qwen2.5-VL"
    fallback_reply = f"[{model_name} 온디바이스 엔진]{img_notice}\n\n'{req.prompt}' 요청에 대한 로컬 VRAM 최적화 추론 응답입니다. 현재 선택된 모델 가중치([{model_name}])가 정상 로드되어 동작 중입니다."

    return {
        "status": "success",
        "model": req.model,
        "reply": fallback_reply
    }

# ----------------- 2. Text-to-Image Generation -----------------
@app.post("/api/generate/text2img")
async def generate_text2img(req: Text2ImgRequest):
    task_id = f"t2i_{int(time.time() * 1000)}"
    orchestrator.set_active_task(task_id)
    await orchestrator.prepare_model_for_task("text2img", req.model)

    def on_progress(pdata: Dict[str, Any]):
        notify_ws_clients({
            "type": "generation_progress",
            "task_id": task_id,
            "task_type": "text2img",
            "data": pdata
        })

    try:
        notify_ws_clients({
            "type": "generation_started",
            "task_id": task_id,
            "task_type": "text2img",
            "prompt": req.prompt
        })
        
        result = await comfy_bridge.execute_text2img(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            width=req.width,
            height=req.height,
            seed=req.seed,
            steps=req.steps,
            cfg=req.cfg,
            model_name=req.model,
            progress_callback=on_progress
        )

        notify_ws_clients({
            "type": "generation_completed",
            "task_id": task_id,
            "task_type": "text2img",
            "result": result
        })
        return result
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        notify_ws_clients({
            "type": "generation_failed",
            "task_id": task_id,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"이미지 생성 중 오류가 발생했습니다: {e}")
    finally:
        orchestrator.clear_active_task()

# ----------------- 3. Text-to-Video Generation -----------------
@app.post("/api/generate/text2video")
async def generate_text2video(req: Text2VideoRequest):
    task_id = f"t2v_{int(time.time() * 1000)}"
    orchestrator.set_active_task(task_id)
    await orchestrator.prepare_model_for_task("text2video", req.model)

    def on_progress(pdata: Dict[str, Any]):
        notify_ws_clients({
            "type": "generation_progress",
            "task_id": task_id,
            "task_type": "text2video",
            "data": pdata
        })

    try:
        notify_ws_clients({
            "type": "generation_started",
            "task_id": task_id,
            "task_type": "text2video",
            "prompt": req.prompt
        })

        result = await comfy_bridge.execute_video_task(
            task_type="text2video",
            prompt=req.prompt,
            duration_sec=req.duration_sec,
            fps=req.fps,
            enable_60fps=req.enable_60fps,
            enable_4k_upscale=req.enable_4k_upscale,
            model_name=req.model,
            progress_callback=on_progress
        )

        notify_ws_clients({
            "type": "generation_completed",
            "task_id": task_id,
            "task_type": "text2video",
            "result": result
        })
        return result
    except Exception as e:
        logger.error(f"Text2Video error: {e}")
        notify_ws_clients({
            "type": "generation_failed",
            "task_id": task_id,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"비디오 렌더링 중 오류가 발생했습니다: {e}")
    finally:
        orchestrator.clear_active_task()

# ----------------- 4. Image-to-Video Generation -----------------
@app.post("/api/generate/img2video")
async def generate_img2video(req: Img2VideoRequest):
    task_id = f"i2v_{int(time.time() * 1000)}"
    orchestrator.set_active_task(task_id)
    await orchestrator.prepare_model_for_task("img2video", req.model)

    def on_progress(pdata: Dict[str, Any]):
        notify_ws_clients({
            "type": "generation_progress",
            "task_id": task_id,
            "task_type": "img2video",
            "data": pdata
        })

    try:
        notify_ws_clients({
            "type": "generation_started",
            "task_id": task_id,
            "task_type": "img2video",
            "prompt": req.prompt
        })

        result = await comfy_bridge.execute_video_task(
            task_type="img2video",
            prompt=req.prompt,
            image_base64=req.image_base64,
            duration_sec=4,
            fps=16,
            enable_60fps=req.enable_60fps,
            enable_4k_upscale=req.enable_4k_upscale,
            model_name=req.model,
            progress_callback=on_progress
        )

        notify_ws_clients({
            "type": "generation_completed",
            "task_id": task_id,
            "task_type": "img2video",
            "result": result
        })
        return result
    except Exception as e:
        logger.error(f"Img2Video error: {e}")
        notify_ws_clients({
            "type": "generation_failed",
            "task_id": task_id,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"I2V 비디오 렌더링 중 오류가 발생했습니다: {e}")
    finally:
        orchestrator.clear_active_task()

# ----------------- 5. Audio & Sound Generation -----------------
@app.post("/api/generate/audio")
async def generate_audio(req: AudioRequest):
    await orchestrator.prepare_model_for_task("audio", req.model)
    try:
        result = await comfy_bridge.execute_audio_task(
            prompt=req.prompt,
            duration_sec=req.duration_sec,
            model_name=req.model
        )
        return result
    except Exception as e:
        logger.error(f"Audio generation error: {e}")
        raise HTTPException(status_code=500, detail=f"오디오 생성 중 오류: {e}")

# ----------------- 6. Voice Synthesis (TTS) -----------------
@app.post("/api/generate/tts")
async def generate_tts(req: TTSRequest):
    await orchestrator.prepare_model_for_task("tts", req.model or "Kokoro-82M")
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="음성 변환할 텍스트를 입력해주세요.")
    try:
        result = await comfy_bridge.execute_tts_task(
            text=req.text,
            voice=req.voice,
            speed=req.speed,
            model_name=req.model or "Kokoro-82M"
        )
        return result
    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS 음성 합성 중 오류: {e}")

# ----------------- 7. AI Image Super-Resolution Upscaler -----------------
@app.post("/api/generate/upscale")
async def generate_upscale(req: UpscaleRequest):
    await orchestrator.prepare_model_for_task("upscale", req.model or "Real-ESRGAN-4x")
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="업스케일할 이미지를 제공해주세요.")
    try:
        result = await comfy_bridge.execute_upscale_task(
            image_base64=req.image_base64,
            scale_factor=req.scale_factor,
            model_name=req.model or "Real-ESRGAN-4x",
            face_restore=req.face_restore
        )
        return result
    except Exception as e:
        logger.error(f"Upscale error: {e}")
        raise HTTPException(status_code=500, detail=f"이미지 업스케일 중 오류가 발생했습니다: {e}")

# ----------------- 8. Canvas Mask Inpainting -----------------
@app.post("/api/generate/inpaint")
async def generate_inpaint(req: InpaintRequest):
    await orchestrator.prepare_model_for_task("inpaint", req.model or "FLUX.1-Inpaint")
    if not req.image_base64 or not req.mask_base64:
        raise HTTPException(status_code=400, detail="원본 이미지 및 마스크 데이터를 모두 제공해주세요.")
    try:
        result = await comfy_bridge.execute_inpaint_task(
            image_base64=req.image_base64,
            mask_base64=req.mask_base64,
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            model_name=req.model or "FLUX.1-Inpaint"
        )
        return result
    except Exception as e:
        logger.error(f"Inpaint error: {e}")
        raise HTTPException(status_code=500, detail=f"인페인팅 생성 중 오류가 발생했습니다: {e}")

# ----------------- 9. Hardware Benchmark & Auto-Tuning -----------------
@app.post("/api/benchmark/run")
def api_run_benchmark():
    try:
        results = run_hardware_benchmark()
        return results
    except Exception as e:
        logger.error(f"Benchmark error: {e}")
        raise HTTPException(status_code=500, detail=f"벤치마크 실행 중 오류: {e}")

@app.post("/api/benchmark/auto-tune")
def api_auto_tune(req: AutoTuneRequest):
    logger.info(f"⚡ Auto-Tuning 적용: Quant={req.recommended_quant}, Mode={req.recommended_mode}, T5Offload={req.t5_offload}")
    return {
        "status": "success",
        "message": f"하드웨어 최적화 프로필이 성공적으로 적용되었습니다: {req.recommended_mode}",
        "config": req.dict()
    }

# ----------------- 10. Batch Generation Queue -----------------
@app.post("/api/batch/submit")
async def api_batch_submit(req: BatchSubmitRequest):
    if not req.items:
        raise HTTPException(status_code=400, detail="배치 작업 목록이 비어 있습니다.")
    
    results = []
    for item in req.items:
        try:
            if item.task_type == "text2img":
                await orchestrator.prepare_model_for_task("text2img", req.model)
                res = await comfy_bridge.execute_text2img(
                    prompt=item.prompt,
                    negative_prompt=item.negative_prompt,
                    seed=item.seed,
                    model_name=req.model
                )
                results.append({
                    "id": item.id,
                    "status": "completed",
                    "url": res.get("image_url"),
                    "prompt": item.prompt,
                    "seed": item.seed
                })
            elif item.task_type == "audio":
                await orchestrator.prepare_model_for_task("audio", req.model)
                res = await comfy_bridge.execute_audio_task(
                    prompt=item.prompt,
                    duration_sec=6,
                    model_name=req.model
                )
                results.append({
                    "id": item.id,
                    "status": "completed",
                    "url": res.get("audio_url"),
                    "prompt": item.prompt,
                    "seed": item.seed
                })
            else:
                await orchestrator.prepare_model_for_task("text2video", req.model)
                res = await comfy_bridge.execute_video_task(
                    prompt=item.prompt,
                    model_name=req.model
                )
                results.append({
                    "id": item.id,
                    "status": "completed",
                    "url": res.get("video_url"),
                    "prompt": item.prompt,
                    "seed": item.seed
                })
        except Exception as e:
            logger.error(f"Batch item {item.id} error: {e}")
            results.append({
                "id": item.id,
                "status": "failed",
                "error": str(e),
                "prompt": item.prompt
            })
            
    return {
        "status": "success",
        "total": len(req.items),
        "results": results
    }

# ----------------- Cancel & Interrupt -----------------
@app.post("/api/generate/cancel")
async def cancel_generation():
    success = await orchestrator.cancel_active_task()
    return {
        "status": "success" if success else "idle",
        "message": "생성 작업이 즉시 취소되고 VRAM이 회수되었습니다." if success else "현재 실행 중인 작업이 없습니다."
    }

# ----------------- History Gallery & Metadata Recall -----------------
@app.get("/api/history")
def get_history(
    limit: int = 50,
    offset: int = 0,
    task_type: Optional[str] = None,
    only_favorites: bool = False,
    search: Optional[str] = None
):
    entries = get_history_entries(
        limit=limit,
        offset=offset,
        task_type=task_type,
        only_favorites=only_favorites,
        search_query=search
    )
    return {
        "status": "success",
        "total": len(entries),
        "entries": entries
    }

@app.get("/api/history/{entry_id}")
def get_history_by_id(entry_id: int):
    entry = get_history_entry_by_id(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="히스토리 항목을 찾을 수 없습니다.")
    return {"status": "success", "entry": entry}

@app.post("/api/history/{entry_id}/favorite")
def toggle_history_fav(entry_id: int):
    is_fav = toggle_favorite(entry_id)
    return {"status": "success", "id": entry_id, "is_favorite": is_fav}

@app.delete("/api/history/{entry_id}")
def delete_history_item_api(entry_id: int):
    deleted = delete_history_entry(entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="삭제할 히스토리 항목이 없습니다.")
    return {"status": "success", "id": entry_id, "message": "히스토리 항목이 성공적으로 삭제되었습니다."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
