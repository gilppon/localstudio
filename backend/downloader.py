import os
import time
import requests
import logging
from typing import Callable, Optional

logger = logging.getLogger("ModelDownloader")

PRESET_MODELS_INFO = [
    {
        "category": "multimodal",
        "name": "Qwen2.5-3B-Instruct",
        "filename": "qwen2.5-3b-instruct-q4_k_m.gguf",
        "url": "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf",
        "size_desc": "2.10 GB"
    },
    {
        "category": "text2img",
        "name": "FLUX.1-schnell-GGUF",
        "filename": "flux1-schnell-Q2_K.gguf",
        "url": "https://huggingface.co/city96/FLUX.1-schnell-gguf/resolve/main/flux1-schnell-Q2_K.gguf",
        "size_desc": "4.01 GB"
    },
    {
        "category": "video",
        "name": "Wan2.1-T2V-1.3B-FP8",
        "filename": "wan2.1_t2v_1.3B_fp8.safetensors",
        "url": "https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B/resolve/main/diffusion_pytorch_model.safetensors",
        "size_desc": "5.67 GB"
    },
    {
        "category": "tts",
        "name": "Kokoro-82M",
        "filename": "kokoro-v1_0.pth",
        "url": "https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/kokoro-v1_0.pth",
        "size_desc": "0.32 GB"
    }
]

def get_default_model_dir() -> str:
    user_home = os.path.expanduser("~")
    lm_studio_dir = os.path.join(user_home, ".lmstudio", "models")
    if os.path.exists(lm_studio_dir):
        return lm_studio_dir
    try:
        os.makedirs(lm_studio_dir, exist_ok=True)
        return lm_studio_dir
    except Exception:
        fallback_dir = os.path.abspath("./models")
        os.makedirs(fallback_dir, exist_ok=True)
        return fallback_dir

class ModelDownloader:
    """
    HTTP Range Request 기반 Resume(이어받기) 지원 원클릭 모델 다운로드 매니저.
    LM Studio (.lmstudio/models) 및 HuggingFace 모델 연동 다운로드.
    """
    def __init__(self, download_dir: Optional[str] = None):
        self.download_dir = download_dir or get_default_model_dir()
        os.makedirs(self.download_dir, exist_ok=True)
        logger.info(f"모델 다운로드 기본 통합 경로: {self.download_dir}")

    def download_preset_models(self, progress_callback: Optional[Callable[[dict], None]] = None):
        total_items = len(PRESET_MODELS_INFO)
        user_home = os.path.expanduser("~")
        search_dirs = [
            self.download_dir,
            os.path.abspath("./models"),
            os.path.join(user_home, ".lmstudio", "models"),
            os.path.join(user_home, ".ollama", "models")
        ]

        for idx, item in enumerate(PRESET_MODELS_INFO, start=1):
            file_exists = False
            for sdir in search_dirs:
                if os.path.exists(sdir):
                    for root, _, files in os.walk(sdir):
                        for f in files:
                            if item["filename"].lower() == f.lower():
                                full_f = os.path.join(root, f)
                                if os.path.getsize(full_f) > 10 * 1024 * 1024:
                                    file_exists = True
                                    break
                    if file_exists:
                        break

            if file_exists:
                logger.info(f"[{item['filename']}] 기존 LM Studio / 로컬 모델 경로에 이미 존재함. 스킵.")
                if progress_callback:
                    progress_callback({
                        "filename": item["filename"],
                        "category": item["category"],
                        "item_index": idx,
                        "total_items": total_items,
                        "progress_percent": 100.0,
                        "status": "already_exists"
                    })
                continue
            
            def item_cb(data):
                data["category"] = item["category"]
                data["item_index"] = idx
                data["total_items"] = total_items
                if progress_callback:
                    progress_callback(data)

            try:
                self.download_file(item["url"], item["filename"], progress_callback=item_cb)
            except Exception as e:
                logger.error(f"Preset model download error [{item['filename']}]: {e}")

    def download_file(
        self, 
        url: str, 
        filename: str, 
        progress_callback: Optional[Callable[[dict], None]] = None
    ) -> str:
        dest_path = os.path.join(self.download_dir, filename)
        temp_path = dest_path + ".download"

        # Resolve HuggingFace LFS redirect to final CDN URL
        try:
            head_resp = requests.head(url, allow_redirects=True, timeout=10)
            if head_resp.status_code == 200:
                url = head_resp.url
        except Exception:
            pass
        
        initial_size = 0
        if os.path.exists(temp_path):
            initial_size = os.path.getsize(temp_path)
            
        headers = {}
        if initial_size > 0:
            headers["Range"] = f"bytes={initial_size}-"
            logger.info(f"Resume 이어받기 시작: {filename} ({initial_size} bytes 이미 수신됨)")

        try:
            response = requests.get(url, headers=headers, stream=True, allow_redirects=True, timeout=15)
            
            # 206 Partial Content or 200 OK
            if response.status_code not in (200, 206):
                initial_size = 0
                headers = {}
                response = requests.get(url, stream=True, allow_redirects=True, timeout=15)
                
            if response.status_code == 404:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                raise ValueError(f"모델 다운로드 링크를 찾을 수 없습니다 (404 Not Found): {url}")

            content_length = response.headers.get("content-length")
            total_bytes = int(content_length) + initial_size if content_length else 0

            # Content type check to prevent HTML downloads
            content_type = response.headers.get("content-type", "")
            if "text/html" in content_type:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                raise ValueError(f"모델 파일이 아닌 HTML 웹페이지가 응답되었습니다. 올바른 Hugging Face direct LFS 다운로드 주소인지 확인하십시오.")

            mode = "ab" if initial_size > 0 and response.status_code == 206 else "wb"
            start_time = time.time()
            downloaded = initial_size

            with open(temp_path, mode) as f:
                for chunk in response.iter_content(chunk_size=1024 * 1024): # 1MB Chunk
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        elapsed = time.time() - start_time
                        speed_mb = (downloaded - initial_size) / (1024 * 1024) / max(elapsed, 0.001)
                        progress_pct = round((downloaded / total_bytes * 100), 1) if total_bytes > 0 else 0.0

                        if progress_callback:
                            progress_callback({
                                "filename": filename,
                                "downloaded_bytes": downloaded,
                                "total_bytes": total_bytes,
                                "progress_percent": progress_pct,
                                "speed_mbps": round(speed_mb, 2),
                                "status": "downloading"
                            })

            # Validate final download size is at least 1MB
            if os.path.exists(temp_path):
                final_size = os.path.getsize(temp_path)
                if final_size < 1 * 1024 * 1024:
                    os.remove(temp_path)
                    raise ValueError(f"다운로드된 파일 크기({final_size} bytes)가 비정상적으로 작습니다 (1MB 미만). 다운로드 링크를 다시 확인하십시오.")

            # Rename on completion
            os.replace(temp_path, dest_path)
            logger.info(f"🎉 모델 다운로드 완료: {dest_path}")
            if progress_callback:
                progress_callback({
                    "filename": filename,
                    "downloaded_bytes": downloaded,
                    "total_bytes": total_bytes,
                    "progress_percent": 100.0,
                    "speed_mbps": 0.0,
                    "status": "completed",
                    "path": dest_path
                })
            return dest_path

        except Exception as e:
            logger.error(f"다운로드 실패: {e}")
            if progress_callback:
                progress_callback({
                    "filename": filename,
                    "status": "failed",
                    "error": str(e)
                })
            raise e

downloader = ModelDownloader()
