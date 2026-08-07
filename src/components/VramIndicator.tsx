import React from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Cpu, RefreshCw, Sparkles, Zap } from 'lucide-react';

export const VramIndicator: React.FC = () => {
  const { isVramFlushing, vramFlushDetail, vramStatus } = useStudioStore();

  if (!isVramFlushing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-md p-6 bg-[#131927] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden glass-panel glow-accent">
        
        {/* Animated background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative mb-5 flex items-center justify-center">
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-indigo-500/20 animate-ping"></div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg">
              <RefreshCw className="w-8 h-8 text-white animate-spin" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-cyan-400 animate-bounce" />
          </div>

          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-cyan-200 to-indigo-400 mb-2">
            ⚡ Dynamic VRAM 메모리 교체 중...
          </h3>

          <p className="text-sm text-slate-300 mb-6 bg-slate-900/60 px-4 py-2 rounded-lg border border-slate-800">
            {vramFlushDetail || 'torch.cuda.empty_cache() 실행 및 이전 모델 Unload 완료 후 새 모델을 로드하고 있습니다.'}
          </p>

          <div className="w-full bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-left text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-indigo-400"/> GPU 타겟</span>
              <span className="text-slate-200 font-medium">{vramStatus?.gpu_name || 'NVIDIA GPU'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-cyan-400"/> 파이프라인 정책</span>
              <span className="text-cyan-300 font-medium">Task Queue 메모리 방출 모드</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
