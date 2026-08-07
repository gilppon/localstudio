import React, { useEffect, useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Cpu, HardDrive, Zap, Trash2, Download, CheckCircle2, ShieldCheck, Server } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { vramStatus, fetchVramStatus, forceVramFlush, downloads } = useStudioStore();
  const [downloadUrl, setDownloadUrl] = useState('https://huggingface.co/city96/FLUX.1-schnell-gguf/resolve/main/flux1-schnell-Q4_K_M.gguf');
  const [downloadFilename, setDownloadFilename] = useState('flux1-schnell-Q4_K_M.gguf');
  const [downloadNotice, setDownloadNotice] = useState('');

  useEffect(() => {
    fetchVramStatus();
    const interval = setInterval(fetchVramStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUrl = downloadUrl.trim() || 'https://huggingface.co/city96/FLUX.1-schnell-gguf/resolve/main/flux1-schnell-Q4_K_M.gguf';
    const targetName = downloadFilename.trim() || 'flux1-schnell-Q4_K_M.gguf';

    setDownloadNotice(`🚀 모델 [${targetName}] 백그라운드 다운로드를 백엔드에 요청했습니다...`);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/models/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, filename: targetName })
      });
      const data = await res.json();
      setDownloadNotice(`✅ ${data.message}`);
    } catch (e) {
      setDownloadNotice('❌ 백엔드 연결 오류! python backend/main.py가 구동 중인지 확인해 주세요.');
    }
  };

  const allocated = vramStatus?.allocated_vram_gb || 0;
  const totalVram = vramStatus?.total_vram_gb || 8;
  const vramPercent = Math.min(100, Math.round((allocated / totalVram) * 100));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative p-6 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-900/60 border border-indigo-500/20 glass-panel">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> 100% 로컬 구동 (개인정보 보호)
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
                추가 비용 0원
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Local AI Studio 대시보드</h1>
            <p className="text-sm text-slate-400">사용자 PC 자원 극대화 및 Dynamic VRAM Orchestrator 모니터링</p>
          </div>

          <button
            onClick={forceVramFlush}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600/80 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg hover:shadow-rose-500/25 border border-rose-500/30 active:scale-95"
          >
            <Trash2 className="w-4 h-4" /> VRAM 메모리 강제 언로드 (Flush)
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GPU VRAM Card */}
        <div className="p-5 rounded-2xl glass-card border border-indigo-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-400" /> GPU VRAM 메모리
            </span>
            <span className="text-xs text-slate-400 font-medium">{vramStatus?.gpu_name || 'NVIDIA GPU'}</span>
          </div>
          
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-bold text-white">{allocated} <span className="text-sm font-normal text-slate-400">/ {totalVram} GB</span></span>
            <span className="text-sm font-semibold text-indigo-300">{vramPercent}%</span>
          </div>

          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${vramPercent}%` }}
            ></div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>현재 상주 모델:</span>
            <span className="text-cyan-300 font-medium truncate max-w-[180px]">{vramStatus?.current_model || '없음 (Clean)'}</span>
          </div>
        </div>

        {/* System RAM Card */}
        <div className="p-5 rounded-2xl glass-card border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-cyan-400" /> System RAM (Offload Target)
            </span>
            <span className="text-xs text-slate-400 font-medium">32GB 권장</span>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-bold text-white">{vramStatus?.total_ram_gb || 16} <span className="text-sm font-normal text-slate-400">GB</span></span>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">RAM Offloading 활성</span>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            T5 텍스트 인코더 및 백그라운드 텐서 자원은 시스템 RAM으로 자동 Offload 처리됩니다.
          </p>
        </div>

        {/* Profile Tier Card */}
        <div className="p-5 rounded-2xl glass-card border border-indigo-500/20 bg-indigo-950/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400" /> 사양별 권장 추천 모델 가이드
            </span>
          </div>
          <div className="text-xl font-bold text-white mb-2">{vramStatus?.profile_tier || 'Low-VRAM (엔트리)'}</div>
          <ul className="text-xs space-y-1 text-slate-300">
            <li>• VLM 추천: Qwen2.5-VL</li>
            <li>• T2I 추천: FLUX.1-schnell (GGUF)</li>
            <li>• Video 추천: Wan 2.1 (FP8 / Offload)</li>
            <li>• TTS 추천: Kokoro-82M</li>
          </ul>
          <div className="mt-3 pt-2 border-t border-indigo-500/20 text-[11px] text-cyan-300 flex items-center justify-between">
            <span>📁 내 PC 감지된 보유 모델:</span>
            <span className="font-bold text-white font-mono">{useStudioStore.getState().localModels.length}개 감지됨</span>
          </div>
        </div>
      </div>

      {/* Model Downloader & Model Guides */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Connection Manager */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">🌐 API 연결 및 엔드포인트 설정</h2>
          </div>
          <p className="text-xs text-slate-400">
            OpenAI, Anthropic 및 원격 Ollama/ComfyUI 서버 API Key를 연결하여 하이브리드 추론을 수행합니다.
          </p>

          <div className="space-y-3 text-xs">
            {/* OpenAI */}
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span>OpenAI / Compatible API</span>
                <button
                  onClick={() => {
                    fetch('http://127.0.0.1:8000/api/config/test-connection', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ provider: 'openai', url: 'https://api.openai.com/v1' })
                    }).then(res => res.json()).then(data => alert(data.message));
                  }}
                  className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded text-[11px] font-medium"
                >
                  ⚡ 연결 테스트
                </button>
              </div>
              <input
                type="password"
                placeholder="sk-proj-..."
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Ollama Remote */}
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span>원격 Ollama Server Base URL</span>
                <button
                  onClick={() => {
                    fetch('http://127.0.0.1:8000/api/config/test-connection', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ provider: 'ollama', url: 'http://localhost:11434' })
                    }).then(res => res.json()).then(data => alert(data.message));
                  }}
                  className="px-2.5 py-1 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded text-[11px] font-medium"
                >
                  ⚡ 연결 테스트
                </button>
              </div>
              <input
                type="text"
                defaultValue="http://localhost:11434"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Remote ComfyUI */}
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span>원격 ComfyUI Headless Engine URL</span>
                <button
                  onClick={() => {
                    fetch('http://127.0.0.1:8000/api/config/test-connection', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ provider: 'comfyui', url: 'http://localhost:8188' })
                    }).then(res => res.json()).then(data => alert(data.message));
                  }}
                  className="px-2.5 py-1 bg-purple-600/80 hover:bg-purple-500 text-white rounded text-[11px] font-medium"
                >
                  ⚡ 연결 테스트
                </button>
              </div>
              <input
                type="text"
                defaultValue="http://localhost:8188"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Model Downloader */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">원클릭 모델 다운로드 매니저 (Apache 2.0 안전 라이선스)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Hugging Face 사이트 이동 없이 GGUF 및 FP8 파인튜닝 safetensors 모델을 Resume(이어받기) 지원 다운로드합니다.
          </p>

          <form onSubmit={handleDownloadSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">HuggingFace 다운로드 Direct URL</label>
              <input
                type="text"
                placeholder="https://huggingface.co/city96/FLUX.1-schnell-gguf/resolve/main/flux1-schnell-Q4_K_M.gguf"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">저장 파일명 (.gguf / .safetensors)</label>
              <input
                type="text"
                placeholder="flux1-schnell-Q4_K_M.gguf"
                value={downloadFilename}
                onChange={(e) => setDownloadFilename(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/30 active:scale-95"
            >
              다운로드 시작 (Resume 지원)
            </button>
          </form>

          {downloadNotice && (
            <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 font-medium">
              {downloadNotice}
            </div>
          )}

          {/* Active Downloads List */}
          {Object.keys(downloads).length > 0 && (
            <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
              <span className="text-xs font-semibold text-slate-300">다운로드 진행 상황:</span>
              {Object.values(downloads).map((dl) => (
                <div key={dl.filename} className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between font-medium text-slate-200">
                    <span className="truncate max-w-[200px]">{dl.filename}</span>
                    <span className="text-indigo-400">{dl.progress_percent}% ({dl.speed_mbps} MB/s)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${dl.progress_percent}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Engine Pipeline Status */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">서브 엔진 백엔드 구성</h2>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-slate-200">LLM / VLM Engine</div>
                  <div className="text-slate-400 text-[11px]">Qwen2.5-VL INT4 Local Fast Engine</div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">정상 작동 중</span>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-slate-200">ComfyUI Headless Engine</div>
                  <div className="text-slate-400 text-[11px]">FLUX.1 GGUF / Wan 2.1 Video JSON Workflows</div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">정상 작동 중</span>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-slate-200">PyTorch Audio & TTS Engine</div>
                  <div className="text-slate-400 text-[11px]">Stable Audio Open / Kokoro-82M Voice Synthetic</div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">정상 작동 중</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
