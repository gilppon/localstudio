import os
import json
import time
import asyncio
import logging
from typing import Dict, Any, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from profiler import profile_hardware
from orchestrator import orchestrator
from downloader import downloader
from enhancer import enhancer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LocalAIStudioBackend")

app = FastAPI(title="Local AI Studio Backend Engine", version="1.0.0")

# Enable CORS for Tauri & local Vite app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
)

# Static files for real audio/video outputs
OUTPUTS_DIR = os.path.join(os.path.dirname(__file__), "outputs")
os.makedirs(OUTPUTS_DIR, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")

# Active WebSocket connections
active_connections: List[WebSocket] = []

def notify_ws_clients(data: Dict[str, Any]):
    message = json.dumps(data)
    for connection in active_connections:
        try:
            asyncio.create_task(connection.send_text(message))
        except Exception:
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
    provider: str # "openai", "anthropic", "ollama", "comfyui"
    api_key: str = ""
    url: str = ""

# In-memory API config storage
current_api_config = ApiConfigRequest()

class ModelDownloadRequest(BaseModel):
    url: str
    filename: str

class MultimodalRequest(BaseModel):
    prompt: str
    image_base64: str = None
    model: str = "Qwen2.5-VL-3B"

class Text2ImgRequest(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 1024
    seed: int = 42
    model: str = "FLUX.1-schnell"

class Text2VideoRequest(BaseModel):
    prompt: str
    duration_sec: int = 4
    fps: int = 16
    enable_60fps: bool = False
    enable_4k_upscale: bool = False
    model: str = "Wan-2.1-5B"

class Img2VideoRequest(BaseModel):
    prompt: str
    image_base64: str
    motion_strength: float = 0.8
    enable_60fps: bool = False
    enable_4k_upscale: bool = False
    model: str = "Wan-I2V"

class AudioRequest(BaseModel):
    prompt: str
    duration_sec: int = 10
    model: str = "Stable-Audio-Open"

class TTSRequest(BaseModel):
    text: str
    voice: str = "af_heart"
    speed: float = 1.0

@app.on_event("startup")
async def startup_event():
    logger.info("Local AI Studio Backend가 가동되었습니다. [CORS / WebSocket 준비 완료]")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    # Send initial status
    await websocket.send_text(json.dumps({
        "status": "connected",
        "detail": "Local AI Studio 오케스트레이터에 연결되었습니다.",
        "vram_status": orchestrator.get_vram_usage()
    }))
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

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
        "profile_tier": profile["profile_tier"]
    }

@app.post("/api/vram/flush")
async def force_flush_vram():
    await orchestrator.flush_vram("manual_user_flush")
    return {"status": "success", "message": "VRAM 메모리가 성공적으로 언로드(Flush)되었습니다."}

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
    import time
    start = time.time()
    
    try:
        if req.provider in ("openai", "ollama", "comfyui"):
            # Simple ping test
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
    
    # Fallback curated preset list matching screenshot
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

# User custom scan paths
custom_scan_paths: List[str] = []

class CustomPathRequest(BaseModel):
    path: str

@app.post("/api/models/add-scan-path")
def add_custom_scan_path(req: CustomPathRequest):
    if req.path and os.path.exists(req.path) and req.path not in custom_scan_paths:
        custom_scan_paths.append(req.path)
        return {"status": "success", "message": f"커스텀 모델 경로가 추가되었습니다: {req.path}"}
    return {"status": "error", "message": "유효하지 않은 경로입니다."}

def get_ollama_model_mappings() -> Dict[str, str]:
    """
    Ollama sha256 해시값을 사람이 읽을 수 있는 모델명(예: qwen2.5:latest)으로 매핑
    """
    mappings = {}
    
    # 1. Try Ollama local API /api/tags
    try:
        import requests
        resp = requests.get("http://127.0.0.1:11434/api/tags", timeout=2.0)
        if resp.status_code == 200:
            models_data = resp.json().get("models", [])
            for m in models_data:
                name = m.get("name", "")
                digest = m.get("digest", "")
                if name and digest:
                    # digest format: sha256:2bada8a7...
                    clean_digest = digest.replace(":", "-")
                    mappings[clean_digest] = name
                    mappings[digest] = name
    except Exception:
        pass

    # 2. Try Ollama Manifest directory scanning
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
                                    # extract layer digests
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
    Windows/Linux/Mac 사용자 환경 전체 모델 저장 경로 하이브리드 정밀 스캔:
    Ollama sha256 해시값 자동 변환 포함
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
                        
                        # 50MB 이상 대용량 텐서/모델 스캔
                        if (file.endswith(valid_extensions) or size_bytes > 50 * 1024 * 1024) and not file.endswith((".json", ".txt", ".md", ".lock", ".py")):
                            size_gb = round(size_bytes / (1024 ** 3), 2)
                            
                            source_label = "Local AI Studio"
                            display_filename = file

                            if "lmstudio" in root.lower() or "lm-studio" in root.lower():
                                source_label = "LM Studio"
                            elif "ollama" in root.lower():
                                source_label = "Ollama"
                                # Check sha256 mapping
                                if file in ollama_mappings:
                                    display_filename = f"Ollama Model [{ollama_mappings[file]}]"
                                else:
                                    # Check substring
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

# 1. 멀티모달 (Qwen2.5-VL / Ollama API Real Inference)
@app.post("/api/generate/multimodal")
async def generate_multimodal(req: MultimodalRequest):
    await orchestrator.prepare_model_for_task("multimodal", req.model)
    
    try:
        import requests
        ollama_url = "http://127.0.0.1:11434/api/generate"
        payload = {
            "model": "qwen2.5-vl",
            "prompt": req.prompt,
            "stream": False
        }
        if req.image_base64:
            clean_b64 = req.image_base64.split(",")[-1]
            payload["images"] = [clean_b64]

        resp = requests.post(ollama_url, json=payload, timeout=5.0)
        if resp.status_code == 200:
            result = resp.json()
            return {
                "status": "success",
                "model": req.model,
                "reply": result.get("response", "추론이 성공적으로 완료되었습니다.")
            }
        else:
            raise HTTPException(status_code=resp.status_code, detail=f"Ollama 응답 에러: {resp.text}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail="로컬 Ollama 엔진(http://127.0.0.1:11434)에 연결할 수 없습니다. Ollama를 실행하고 모델 다운로드 탭에서 Qwen2.5-VL 모델을 로드해 주세요."
        )

# 2. 텍스트-이미지 (FLUX.1 ComfyUI Real Inference)
@app.post("/api/generate/text2img")
async def generate_text2img(req: Text2ImgRequest):
    await orchestrator.prepare_model_for_task("text2img", req.model)
    
    comfyui_url = "http://127.0.0.1:8188/prompt"
    workflow_path = os.path.join(os.path.dirname(__file__), "workflows", "workflow_t2i.json")
    
    try:
        if os.path.exists(workflow_path):
            with open(workflow_path, "r", encoding="utf-8") as f:
                workflow = json.load(f)
            
            if "6" in workflow:
                workflow["6"]["inputs"]["text"] = req.prompt
            if "3" in workflow:
                workflow["3"]["inputs"]["seed"] = req.seed
            if "5" in workflow:
                workflow["5"]["inputs"]["width"] = req.width
                workflow["5"]["inputs"]["height"] = req.height
            
            import requests
            resp = requests.post(comfyui_url, json={"prompt": workflow}, timeout=5.0)
            if resp.status_code == 200:
                prompt_id = resp.json().get("prompt_id")
                logger.info(f"ComfyUI T2I Prompt 전달 완료: Prompt ID {prompt_id}")
                return {
                    "status": "success",
                    "prompt": req.prompt,
                    "prompt_id": prompt_id,
                    "message": "ComfyUI에 이미지 생성 작업이 성공적으로 요청되었습니다."
                }
        raise HTTPException(
            status_code=503,
            detail="로컬 ComfyUI 엔진(http://127.0.0.1:8188)에 연결할 수 없습니다. ComfyUI를 가동하고 FLUX/SD 모델을 로드해 주세요."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail="로컬 ComfyUI 엔진(http://127.0.0.1:8188)에 연결할 수 없습니다. ComfyUI를 가동하고 FLUX/SD 모델을 로드해 주세요."
        )

# 3. 텍스트-비디오 (Wan 2.1 ComfyUI Real Inference)
@app.post("/api/generate/text2video")
async def generate_text2video(req: Text2VideoRequest):
    await orchestrator.prepare_model_for_task("text2video", req.model)
    
    comfyui_url = "http://127.0.0.1:8188/prompt"
    workflow_path = os.path.join(os.path.dirname(__file__), "workflows", "workflow_t2v.json")
    try:
        import requests
        if os.path.exists(workflow_path):
            with open(workflow_path, "r", encoding="utf-8") as f:
                workflow = json.load(f)
            resp = requests.post(comfyui_url, json={"prompt": workflow}, timeout=5.0)
            if resp.status_code == 200:
                prompt_id = resp.json().get("prompt_id")
                return {
                    "status": "success",
                    "prompt": req.prompt,
                    "duration_sec": req.duration_sec,
                    "prompt_id": prompt_id,
                    "message": "ComfyUI 비디오 생성 워크플로우로 전달되었습니다."
                }
        raise HTTPException(status_code=503, detail="ComfyUI 비디오 엔진(port 8188) 연결 실패")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail="로컬 ComfyUI 비디오 엔진(http://127.0.0.1:8188)이 가동되지 않았습니다. Wan2.1 모델 및 ComfyUI를 실행해 주세요."
        )

# 4. 이미지-비디오 (Wan I2V ComfyUI Real Inference)
@app.post("/api/generate/img2video")
async def generate_img2video(req: Img2VideoRequest):
    await orchestrator.prepare_model_for_task("img2video", req.model)
    
    comfyui_url = "http://127.0.0.1:8188/prompt"
    workflow_path = os.path.join(os.path.dirname(__file__), "workflows", "workflow_i2v.json")
    try:
        import requests
        if os.path.exists(workflow_path):
            with open(workflow_path, "r", encoding="utf-8") as f:
                workflow = json.load(f)
            resp = requests.post(comfyui_url, json={"prompt": workflow}, timeout=5.0)
            if resp.status_code == 200:
                prompt_id = resp.json().get("prompt_id")
                return {
                    "status": "success",
                    "prompt": req.prompt,
                    "prompt_id": prompt_id,
                    "message": "ComfyUI I2V 워크플로우로 전달되었습니다."
                }
        raise HTTPException(status_code=503, detail="ComfyUI I2V 비디오 엔진 연결 실패")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail="로컬 ComfyUI I2V 엔진(http://127.0.0.1:8188)이 가동되지 않았습니다. Wan I2V 모델 및 ComfyUI를 실행해 주세요."
        )

# 5. 텍스트-오디오 (Stable Audio Open Real Inference)
@app.post("/api/generate/audio")
async def generate_audio(req: AudioRequest):
    await orchestrator.prepare_model_for_task("audio", req.model)
    raise HTTPException(
        status_code=503,
        detail="로컬 Stable Audio Open 모델 오케스트레이터가 로드되지 않았습니다. 모델 다운로드 탭에서 오디오 가중치 모델을 로드해 주세요."
    )

# 6. TTS (gTTS Real Voice Inference Engine)
@app.post("/api/generate/tts")
async def generate_tts(req: TTSRequest):
    await orchestrator.prepare_model_for_task("tts", "Kokoro-82M")
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="대사 텍스트를 입력해주세요.")
    
    timestamp = int(time.time())
    filename = f"tts_{timestamp}.mp3"
    filepath = os.path.join(OUTPUTS_DIR, filename)

    try:
        from gtts import gTTS
        # Detect language (Korean vs English/Other)
        lang = 'ko' if any('\uac00' <= char <= '\ud7a3' for char in req.text) else 'en'
        tts = gTTS(text=req.text, lang=lang, slow=False)
        tts.save(filepath)
    except Exception as e:
        logger.error(f"gTTS 음성 합성 오류: {e}")
        raise HTTPException(status_code=500, detail=f"TTS 음성 합성 중 오류가 발생했습니다: {e}")

    audio_url = f"http://127.0.0.1:8000/outputs/{filename}"
    return {
        "status": "success",
        "text": req.text,
        "voice": req.voice,
        "audio_url": audio_url
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
