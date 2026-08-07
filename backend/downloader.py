import os
import time
import requests
import logging
from typing import Callable, Optional

logger = logging.getLogger("ModelDownloader")

PRESET_MODELS_INFO = [
    {
        "category": "multimodal",
        "name": "Qwen2.5-VL-3B-Instruct",
        "filename": "Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf",
        "url": "https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct-GGUF/resolve/main/qwen2.5-vl-3b-instruct-q4_k_m.gguf",
        "size_desc": "2.45 GB"
    },
    {
        "category": "text2img",
        "name": "FLUX.1-schnell-GGUF",
        "filename": "flux1-schnell-Q4_K_M.gguf",
        "url": "https://huggingface.co/city96/FLUX.1-schnell-gguf/resolve/main/flux1-schnell-Q4_K_M.gguf",
        "size_desc": "4.73 GB"
    },
    {
        "category": "video",
        "name": "Wan2.1-T2V-1.3B-FP8",
        "filename": "wan2.1_t2v_1.3B_fp8.safetensors",
        "url": "https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B/resolve/main/diffusion_pytorch_model.safetensors",
        "size_desc": "1.40 GB"
    },
    {
        "category": "tts",
        "name": "Kokoro-v0_19",
        "filename": "kokoro-v0_19.safetensors",
        "url": "https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/kokoro-v0_19.safetensors",
        "size_desc": "0.32 GB"
    }
]

class ModelDownloader:
    """
    HTTP Range Request 기반 Resume(이어받기) 지원 원클릭 모델 다운로드 매니저.
    HuggingFace 모델 파일(.safetensors / .gguf) 정밀 다운로드.
    """
    def __init__(self, download_dir: str = "./models"):
        self.download_dir = download_dir
        os.makedirs(self.download_dir, exist_ok=True)

    def download_preset_models(self, progress_callback: Optional[Callable[[dict], None]] = None):
        total_items = len(PRESET_MODELS_INFO)
        for idx, item in enumerate(PRESET_MODELS_INFO, start=1):
            dest_path = os.path.join(self.download_dir, item["filename"])
            if os.path.exists(dest_path) and os.path.getsize(dest_path) > 10 * 1024 * 1024:
                logger.info(f"[{item['filename']}] 이미 존재함. 스킵.")
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
        
        initial_size = 0
        if os.path.exists(temp_path):
            initial_size = os.path.getsize(temp_path)
            
        headers = {}
        if initial_size > 0:
            headers["Range"] = f"bytes={initial_size}-"
            logger.info(f"Resume 이어받기 시작: {filename} ({initial_size} bytes 이미 수신됨)")

        try:
            response = requests.get(url, headers=headers, stream=True, timeout=15)
            
            # 206 Partial Content or 200 OK
            if response.status_code not in (200, 206):
                # Fallback range clean fetch if range not supported
                initial_size = 0
                headers = {}
                response = requests.get(url, stream=True, timeout=15)
                
            content_length = response.headers.get("content-length")
            total_bytes = int(content_length) + initial_size if content_length else 0

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
