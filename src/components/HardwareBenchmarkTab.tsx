import React, { useState } from 'react';
import { 
  Cpu, Gauge, Zap, Activity, HardDrive, ShieldCheck, 
  CheckCircle2, RefreshCw, BarChart3, Sliders, Layers, Sparkles 
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

interface BenchmarkResult {
  status: string;
  gpu_name: string;
  vram_gb: number;
  has_cuda: boolean;
  vram_bandwidth_gbs: number;
  compute_tflops: number;
  ai_score: number;
  references: {
    name: string;
    score: number;
    tier: string;
    is_current?: boolean;
  }[];
  auto_tuning: {
    recommended_quant: string;
    recommended_mode: string;
    batch_size_recommendation: number;
    t5_offload_required: boolean;
  };
}

export const HardwareBenchmarkTab: React.FC = () => {
  const { vramStatus, fetchVramStatus } = useStudioStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [tuneApplied, setTuneApplied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunBenchmark = async () => {
    setLoading(true);
    setErrorMsg(null);
    setTuneApplied(false);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/benchmark/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setResult(data);
        fetchVramStatus();
      } else {
        setErrorMsg(data.detail || '벤치마크 측정 중 오류가 발생했습니다.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('백엔드 서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAutoTune = async () => {
    if (!result) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/benchmark/auto-tune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommended_quant: result.auto_tuning.recommended_quant,
          recommended_mode: result.auto_tuning.recommended_mode,
          t5_offload: result.auto_tuning.t5_offload_required
        })
      });
      if (res.ok) {
        setTuneApplied(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              로컬 GPU 실측 벤치마크 & 하드웨어 자동 튜닝
            </h1>
            <p className="text-xs text-slate-400">
              VRAM 대역폭(GB/s) 및 FP16 TFLOPS 연산 속도 실측 & 100% 온디바이스 최적화 프로필 적용
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunBenchmark}
          disabled={loading}
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition-all"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>실측 텐서 연산 벤치마킹 중...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>GPU 실측 벤치마크 시작</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Main Score & Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>종합 AI 가속 인덱스</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
            {result ? result.ai_score.toLocaleString() : '---'}
            <span className="text-xs text-cyan-400 font-sans font-semibold">pts</span>
          </div>
          <p className="text-[11px] text-slate-500">TFLOPS + VRAM 대역폭 가중 환산</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>VRAM 메모리 대역폭</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-300 font-mono flex items-baseline gap-1">
            {result ? result.vram_bandwidth_gbs : '---'}
            <span className="text-xs text-indigo-400 font-sans font-semibold">GB/s</span>
          </div>
          <p className="text-[11px] text-slate-500">Host ➔ Device 실측 전송 속도</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>GEMM 텐서 연산 속도</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono flex items-baseline gap-1">
            {result ? result.compute_tflops : '---'}
            <span className="text-xs text-purple-400 font-sans font-semibold">TFLOPS</span>
          </div>
          <p className="text-[11px] text-slate-500">FP16 / FP32 행렬 곱셈 실측</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>감지된 하드웨어 VRAM</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 font-mono flex items-baseline gap-1">
            {vramStatus ? `${vramStatus.total_vram_gb}` : '---'}
            <span className="text-xs text-emerald-400 font-sans font-semibold">GB VRAM</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">{vramStatus?.gpu_name || 'NVIDIA GPU'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Comparison Bar Chart (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl glass-panel border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" /> 글로벌 GPU AI 스코어 비교
            </h2>
            <span className="text-[11px] text-slate-400">기준: FLUX / Wan 2.1 추론 가중치</span>
          </div>

          <div className="space-y-4">
            {result?.references ? (
              result.references.map((item, idx) => {
                const maxScore = 50000;
                const percent = Math.min(100, Math.max(10, (item.score / maxScore) * 100));
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className={`font-semibold flex items-center gap-1.5 ${item.is_current ? 'text-cyan-300 font-bold' : 'text-slate-300'}`}>
                        {item.is_current && <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
                        {item.name}
                      </span>
                      <span className="text-slate-400">{item.score.toLocaleString()} pts</span>
                    </div>
                    <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          item.is_current
                            ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]'
                            : 'bg-slate-700'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-slate-500 py-12 space-y-2">
                <Gauge className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs">상단의 'GPU 실측 벤치마크 시작' 버튼을 눌러 성능을 측정하세요.</p>
              </div>
            )}
          </div>
        </div>

        {/* Auto-Tuning Optimization Card (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl glass-panel border border-slate-800 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" /> 원클릭 하드웨어 자동 최적화 (Auto-Tune)
              </h2>
            </div>

            {result ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">권장 양자화 포맷:</span>
                    <span className="text-cyan-300 font-bold font-mono">{result.auto_tuning.recommended_quant}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">실행 가속 모드:</span>
                    <span className="text-indigo-300 font-bold">{result.auto_tuning.recommended_mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">권장 배치 크기:</span>
                    <span className="text-emerald-300 font-bold font-mono">{result.auto_tuning.batch_size_recommendation} Units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">T5 인코더 CPU 오프로드:</span>
                    <span className="text-amber-300 font-bold">{result.auto_tuning.t5_offload_required ? '활성화 필요' : '비활성 (GPU 상주)'}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  측정된 VRAM({result.vram_gb}GB) 및 대역폭 수치에 기반하여 최상의 프레임 레이트와 무지연 생성을 보장하는 전역 파라미터를 확정합니다.
                </p>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-10 space-y-2">
                <Sliders className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs">벤치마크 완료 후 최적의 프로필이 추천됩니다.</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleApplyAutoTune}
            disabled={!result || tuneApplied}
            className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border shadow-lg ${
              tuneApplied
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : result
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white border-indigo-500/40 shadow-indigo-600/30'
                : 'bg-slate-900 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
            }`}
          >
            {tuneApplied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>하드웨어 최적화 프로필 적용 완료!</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>원클릭 하드웨어 프로필 적용 (Apply Auto-Tune)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
