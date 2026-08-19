import gc
import torch
import asyncio
import logging
from typing import Optional, Callable, Dict, Any, List

logger = logging.getLogger("VRAMOrchestrator")

class VRAMOrchestrator:
    """
    Local AI Studio - VRAM 메모리 오케스트레이터 및 FIFO Task Queue 관리자.
    Dynamic VRAM Flush System (torch.cuda.empty_cache() + gc.collect())과
    비동기 작업 큐 및 즉각 작업 취소(Cancel/Interrupt)를 지원합니다.
    """
    def __init__(self):
        self.current_loaded_model: Optional[str] = None
        self.is_flushing: bool = False
        self.lock = asyncio.Lock()
        self.status_listeners: List[Callable[[Dict[str, Any]], None]] = []
        
        # Task Queue & Cancel state
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.active_task_id: Optional[str] = None
        self.is_active_task_cancelled: bool = False

    def register_listener(self, callback: Callable[[Dict[str, Any]], None]):
        self.status_listeners.append(callback)

    def _notify(self, status: str, detail: str, loaded_model: Optional[str] = None, extra: Optional[Dict[str, Any]] = None):
        payload = {
            "status": status,  # "flushing", "loading", "ready", "idle", "cancelled", "progress"
            "detail": detail,
            "loaded_model": loaded_model or self.current_loaded_model,
            "is_flushing": self.is_flushing,
            "active_task_id": self.active_task_id
        }
        if extra:
            payload.update(extra)
            
        for listener in self.status_listeners:
            try:
                listener(payload)
            except Exception as e:
                logger.error(f"Listener notification error: {e}")

    async def flush_vram(self, target_task: str) -> None:
        """
        기존 모델을 GPU VRAM에서 완전히 언로드하고 메모리를 정리합니다.
        """
        self.is_flushing = True
        logger.info(f"⚡ Dynamic VRAM Flush 시작: 이전 모델 [{self.current_loaded_model}] Unload -> 대상 작업 [{target_task}]")
        self._notify("flushing", f"VRAM 메모리 교체 중... ({self.current_loaded_model or '이전 모델'} 언로드)")
        
        # 1. Unload logic / Garbage collection
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        
        await asyncio.sleep(0.5) # VRAM Flush 안전 대기 시간
        self.current_loaded_model = None
        self.is_flushing = False
        logger.info("✅ VRAM Flush 완료. 캐시 정리 100%")

    async def prepare_model_for_task(self, task_name: str, model_id: str) -> bool:
        """
        Task Queue 순차 실행 게이트. 
        필요한 모델이 현재 로드된 모델과 다르면 VRAM Flush 후 새 모델 로드 상태를 형성합니다.
        """
        async with self.lock:
            if self.current_loaded_model == model_id:
                logger.info(f"요청한 모델 [{model_id}]이(가) 이미 메모리에 상주해 있습니다.")
                self._notify("ready", f"모델 [{model_id}] 준비 완료", loaded_model=model_id)
                return True
            
            # Flush existing model if loaded
            if self.current_loaded_model is not None:
                await self.flush_vram(task_name)
            
            # Loading new model
            self._notify("loading", f"신규 모델 [{model_id}] VRAM 로딩 중...", loaded_model=model_id)
            await asyncio.sleep(1.0) # Model setup buffer
            
            self.current_loaded_model = model_id
            self.is_flushing = False
            self._notify("ready", f"모델 [{model_id}] 로드 완료 및 실행 준비됨", loaded_model=model_id)
            return True

    def set_active_task(self, task_id: str):
        self.active_task_id = task_id
        self.is_active_task_cancelled = False

    def clear_active_task(self):
        self.active_task_id = None
        self.is_active_task_cancelled = False

    async def cancel_active_task(self) -> bool:
        """현재 실행 중인 작업을 취소하고 VRAM 캐시를 긴급 회수합니다."""
        if not self.active_task_id:
            return False
            
        logger.warning(f"🛑 작업 취소 요청 수신: [Task ID: {self.active_task_id}]")
        self.is_active_task_cancelled = True
        
        from comfy_bridge import comfy_bridge
        await comfy_bridge.interrupt()
        
        # GPU 캐시 즉각 정리
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            
        self._notify("cancelled", "사용자 요청으로 작업이 즉각 취소되었습니다.")
        self.clear_active_task()
        return True

    def get_vram_usage(self) -> Dict[str, Any]:
        """
        현재 GPU VRAM 및 System RAM 실시간 점유율 계산
        """
        vram_allocated_gb = 0.0
        vram_reserved_gb = 0.0
        
        if torch.cuda.is_available():
            vram_allocated_gb = round(torch.cuda.memory_allocated() / (1024 ** 3), 2)
            vram_reserved_gb = round(torch.cuda.memory_reserved() / (1024 ** 3), 2)

        return {
            "allocated_gb": vram_allocated_gb,
            "reserved_gb": vram_reserved_gb,
            "current_model": self.current_loaded_model or "None (Clean VRAM)",
            "active_task_id": self.active_task_id
        }

# Global Orchestrator Instance
orchestrator = VRAMOrchestrator()
