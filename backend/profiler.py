import psutil
import torch
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AutoHardwareProfiler")

def profile_hardware():
    """
    사용자 PC의 GPU, VRAM, CPU, System RAM 스펙을 측정하고
    VRAM 용량에 따라 오토 프로파일(Low, Mid, High VRAM)을 할당합니다.
    """
    # 1. System RAM & CPU
    ram_gb = round(psutil.virtual_memory().total / (1024 ** 3), 2)
    cpu_count = psutil.cpu_count(logical=True)
    
    # 2. GPU & VRAM
    gpu_name = "CPU Only / Fallback"
    vram_gb = 0.0
    has_cuda = torch.cuda.is_available()
    
    if has_cuda:
        try:
            import pynvml
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            gpu_name = pynvml.nvmlDeviceGetName(handle)
            if isinstance(gpu_name, bytes):
                gpu_name = gpu_name.decode("utf-8")
            info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            vram_gb = round(info.total / (1024 ** 3), 2)
        except Exception as e:
            logger.warning(f"NVML NVidia 측정 불가, PyTorch 수치로 대체: {e}")
            gpu_name = torch.cuda.get_device_name(0)
            vram_bytes = torch.cuda.get_device_properties(0).total_memory
            vram_gb = round(vram_bytes / (1024 ** 3), 2)
    else:
        # PyTorch fallback if CUDA not available directly or testing CPU
        vram_gb = 4.0 # Default testing fallback

    # 3. Profile tier determination
    if vram_gb < 7.0:
        profile_tier = "Low-VRAM (엔트리)"
        tier_code = "low"
        models = {
            "vlm": "Qwen2.5-VL-3B (INT4)",
            "t2i": "FLUX.1-schnell (GGUF Q4)",
            "video": "Wan 2.1 5B (FP8 / CPU Offload)",
            "audio": "Stable Audio Open (GGUF)",
            "tts": "Kokoro-82M"
        }
        vram_recommendation = "Dynamic VRAM Unload & CPU RAM Offloading 필수 연동"
    elif vram_gb < 15.0:
        profile_tier = "Mid-VRAM (메인)"
        tier_code = "mid"
        models = {
            "vlm": "Qwen2.5-VL-7B (INT4)",
            "t2i": "FLUX.1-schnell (FP8)",
            "video": "Wan 2.1/2.2 14B (GGUF Q4)",
            "audio": "Stable Audio Open",
            "tts": "Kokoro-82M / ChatTTS"
        }
        vram_recommendation = "모델 순차적 Swapping 및 T5 텍스트 인코더 System RAM Offloading 권장"
    else:
        profile_tier = "High-VRAM (하이엔드)"
        tier_code = "high"
        models = {
            "vlm": "Qwen2.5-VL-7B/72B (FP16/FP8)",
            "t2i": "FLUX.1-schnell (FP16/FP8)",
            "video": "Wan 2.1 14B (FP8 Native)",
            "audio": "Stable Audio Open Full",
            "tts": "Kokoro-82M / ChatTTS Full"
        }
        vram_recommendation = "동시 상주 로드 및 최고속도 파이프라인 가동 가능"

    return {
        "gpu_name": gpu_name,
        "vram_gb": vram_gb,
        "ram_gb": ram_gb,
        "cpu_count": cpu_count,
        "has_cuda": has_cuda,
        "profile_tier": profile_tier,
        "tier_code": tier_code,
        "recommended_models": models,
        "recommendation_note": vram_recommendation
    }

if __name__ == "__main__":
    result = profile_hardware()
    print("=== 하드웨어 프로파일링 결과 ===")
    for k, v in result.items():
        print(f"{k}: {v}")
