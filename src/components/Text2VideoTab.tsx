import React, { useState, useEffect } from 'react';
import { 
  Film, Sparkles, Download, RefreshCw, Video, 
  StopCircle, CheckCircle2, History, ShieldCheck 
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const Text2VideoTab: React.FC = () => {
  const { 
    localModels, 
    fetchLocalModels, 
    generationProgress, 
    cancelGeneration, 
    setActiveTab 
  } = useStudioStore();

  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [prompt, setPrompt] = useState('Cinematic shot of a majestic dragon flying through misty mountain peaks, dramatic volumetric lighting, 4k');
  const [durationSec, setDurationSec] = useState(4);
  const [enable60fps, setEnable60fps] = useState(true);
  const [enable4kUpscale, setEnable4kUpscale] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [isRequestPending, setIsRequestPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchLocalModels();
  }, []);

  useEffect(() => {
    if (localModels.length > 0 && !selectedModelFile) {
      setSelectedModelFile(localModels[0].filename);
    }
  }, [localModels]);

  const isGenerating = isRequestPending || (generationProgress?.is_generating && generationProgress?.task_type === 'text2video');

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsRequestPending(true);
    setErrorMsg(null);
    setVideoUrl(null);
    setNotes([]);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/text2video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          duration_sec: durationSec,
          enable_60fps: enable60fps,
          enable_4k_upscale: enable4kUpscale,
          model: selectedModelFile || "Wan 2.1 5B (FP8 / CPU Offload)"
        })
      });
      const data = await res.json();
      if (res.ok && data.video_url) {
        setVideoUrl(data.video_url);
        setNotes(data.enhanced_notes || []);
      } else {
        setErrorMsg(data.detail || '비디오 생성에 실패했습니다.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('백엔드 서버에 연결할 수 없습니다.');
    } finally {
      setIsRequestPending(false);
    }
  };

  const handleCancel = async () => {
    await cancelGeneration();
    setIsRequestPending(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with Model Select Dropdown */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              텍스트-비디오 스튜디오 (Wan 2.1)
            </h1>
            <p className="text-xs text-slate-400">
              차세대 Wan 2.1 디퓨전 비디오 엔진 & 60fps RIFE 프레임 보간 / 4K 업스케일러
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-cyan-500/40 shadow-xl">
          <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> 보유 비디오 모델:
          </span>
          <select
            value={selectedModelFile}
            onChange={(e) => setSelectedModelFile(e.target.value)}
            className="bg-slate-950 text-white text-xs rounded-lg px-3 py-1.5 border border-cyan-500/30 focus:outline-none focus:border-cyan-400 font-mono min-w-[220px] max-w-[320px] truncate"
          >
            {localModels.length > 0 ? (
              localModels.map((m) => (
                <option key={m.path} value={m.filename} className="bg-slate-900 text-slate-100 font-medium py-1">
                  [{m.source}] {m.filename} ({m.size_gb} GB)
                </option>
              ))
            ) : (
              <option value="">보유 모델 없음 (기본 Wan 2.1 5B 내장)</option>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">모션 비디오 프롬프트</label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 resize-none font-mono"
              placeholder="카메라 움직임과 피사체의 생동감 있는 동작을 설명하세요..."
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-2">
              <span>비디오 재생 길이</span>
              <span className="font-mono text-cyan-400 font-bold">{durationSec}초 ({durationSec * (enable60fps ? 60 : 16)} 프레임)</span>
            </div>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              value={durationSec}
              onChange={(e) => setDurationSec(parseInt(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Wan2GP Booster Options */}
          <div className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-500/30 space-y-2 text-xs">
            <span className="font-semibold text-cyan-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Wan2GP 액셀러레이터 후처리
            </span>

            <label className="flex items-center justify-between cursor-pointer py-1 border-b border-cyan-900/60">
              <span className="text-slate-200">⚡ 60fps 부드러운 프레임 보간 (RIFE)</span>
              <input
                type="checkbox"
                checked={enable60fps}
                onChange={(e) => setEnable60fps(e.target.checked)}
                className="w-4 h-4 accent-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-slate-200">🔍 4K 초고화질 AI 업스케일 (FlashVSR)</span>
              <input
                type="checkbox"
                checked={enable4kUpscale}
                onChange={(e) => setEnable4kUpscale(e.target.checked)}
                className="w-4 h-4 accent-cyan-500"
              />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>비디오 렌더링 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>비디오 렌더링 시작</span>
                </>
              )}
            </button>

            {isGenerating && (
              <button
                onClick={handleCancel}
                className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center gap-1.5 shrink-0"
              >
                <StopCircle className="w-4 h-4" />
                <span>🛑 중단</span>
              </button>
            )}
          </div>
        </div>

        {/* Video Player Display */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center min-h-[480px] relative overflow-hidden">
          {/* Progress Bar during generation */}
          {isGenerating && (
            <div className="absolute top-4 left-4 right-4 z-20 bg-slate-950/80 backdrop-blur-md p-3.5 rounded-xl border border-cyan-500/40 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-cyan-300 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  Wan 2.1 신경망 디퓨전 렌더링 중...
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {generationProgress ? `${generationProgress.step} / ${generationProgress.total_steps} (${generationProgress.percent}%)` : '준비 중...'}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-150"
                  style={{ width: `${Math.min(100, generationProgress?.percent || 15)}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="w-full max-w-md p-4 mb-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center space-y-1">
              <p className="font-bold">⚠️ 비디오 렌더링 안내</p>
              <p>{errorMsg}</p>
            </div>
          )}

          {videoUrl ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              <video 
                controls 
                autoPlay 
                loop 
                src={videoUrl} 
                className="max-h-[400px] w-full rounded-xl border border-cyan-500/30 shadow-2xl object-cover bg-black" 
              />
              
              {/* Enhancement Badges */}
              {notes.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {notes.map((n, i) => (
                    <span key={i} className="px-2.5 py-1 bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-mono font-medium">
                      {n}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3">
                <a
                  href={videoUrl}
                  download="LocalAIStudio_WanT2V.mp4"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 shadow-md"
                >
                  <Download className="w-4 h-4 text-cyan-400" /> MP4 비디오 다운로드
                </a>

                <button
                  type="button"
                  onClick={() => setActiveTab('gallery')}
                  className="px-4 py-2 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-purple-500/30 transition-colors"
                >
                  <History className="w-4 h-4 text-purple-400" /> 히스토리 갤러리 확인 →
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-3">
              <Video className="w-14 h-14 stroke-[1.2] text-slate-600 mx-auto animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-slate-400">시네마틱 모션 비디오 생성</p>
                <p className="text-xs text-slate-500 mt-1">프롬프트를 입력하고 '비디오 렌더링 시작'을 누르세요.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
