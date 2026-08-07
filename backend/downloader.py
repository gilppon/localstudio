import os
import time
import requests
import logging
from typing import Callable, Optional

logger = logging.getLogger("ModelDownloader")

class ModelDownloader:
    """
    HTTP Range Request 기반 Resume(이어받기) 지원 원클릭 모델 다운로드 매니저.
    HuggingFace 모델 파일(.safetensors / .gguf) 정밀 다운로드.
    """
    def __init__(self, download_dir: str = "./models"):
        self.download_dir = download_dir
        os.makedirs(self.download_dir, exist_ok=True)

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
