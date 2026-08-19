import React, { useState, useEffect } from 'react';
import { 
  Video, Image as ImageIcon, Sparkles, Download, RefreshCw, Wand2,
  StopCircle, CheckCircle2, History, Layers
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const Img2VideoTab: React.FC = () => {
  const { 
    localModels, 
    fetchLocalModels, 
    generationProgress, 
    cancelGeneration, 
    setActiveTab 
  } = useStudioStore();

  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Smooth cinematic camera zoom in with natural wind blowing through hair and trees');
  const [motionStrength, setMotionStrength] = useState(0.8);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const isGenerating = isRequestPending || (generationProgress?.is_generating && generationProgress?.task_type === 'img2video');

  const handleGenerate = async () => {
    if (!image || isGenerating) return;
    setIsRequestPending(true);
    setErrorMsg(null);
    setVideoUrl(null);
    setNotes([]);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/img2video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          image_base64: image, 
          motion_strength: motionStrength, 
          enable_60fps: enable60fps,
          enable_4k_upscale: enable4kUpscale,
          model: selectedModelFile || "Wan I2V 14B" 
        })
      });
      const data = await res.json();
      if (res.ok && data.video_url) {
        setVideoUrl(data.video_url);
        setNotes(data.enhanced_notes || []);
      } else {
        setErrorMsg(data.detail || 'I2V 비디오 변환에 실패했습니다.');
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
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              이미지-비디오 (Wan I2V) 스튜디오
            </h1>
            <p className="text-xs text-slate-400">기준 이미지 업로드 + 자연스러운 카메라 모션 애니메이션 & 60fps 보간</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-emerald-500/40 shadow-xl">
          <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 보유 I2V 모델:
          </span>
          <select
            value={selectedModelFile}
            onChange={(e) => setSelectedModelFile(e.target.value)}
            className="bg-slate-950 text-white text-xs rounded-lg px-3 py-1.5 border border-emerald-500/30 focus:outline-none focus:border-emerald-400 font-mono min-w-[220px] max-w-[320px] truncate"
          >
            {localModels.length > 0 ? (
              localModels.map((m) => (
                <option key={m.path} value={m.filename} className="bg-slate-900 text-slate-100 font-medium py-1">
                  [{m.source}] {m.filename} ({m.size_gb} GB)
                </option>
              ))
            ) : (
              <option value="">보유 모델 없음 (Wan I2V 14B 내장)</option>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">기준 이미지 업로드</label>
            <label className="flex flex-col items-center justify-center h-40 bg-slate-950/80 border border-dashed border-slate-700 hover:border-emerald-500 rounded-xl cursor-pointer transition-all overflow-hidden relative group">
              {image ? (
                <>
                  <img src={image} alt="Ref" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white font-semibold">
                    다른 이미지로 교체
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-400 space-y-1.5 p-4">
                  <ImageIcon className="w-9 h-9 stroke-1 mx-auto text-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium">클릭하여 이미지 파일 업로드 (PNG, JPG)</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">모션 가이드 프롬프트</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              placeholder="예: 카메라 줌인, 바람에 흔들리는 머리카락"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>모션 강도 (Motion Strength)</span>
              <span className="text-emerald-400 font-bold font-mono">{motionStrength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={motionStrength}
              onChange={(e) => setMotionStrength(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Wan2GP Booster Options */}
          <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/30 space-y-2 text-xs">
            <span className="font-semibold text-emerald-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Wan2GP 후처리 가속화
            </span>

            <label className="flex items-center justify-between cursor-pointer py-1 border-b border-emerald-900/60">
              <span className="text-slate-200">⚡ 60fps RIFE 프레임 보간</span>
              <input
                type="checkbox"
                checked={enable60fps}
                onChange={(e) => setEnable60fps(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-slate-200">🔍 4K FlashVSR AI 업스케일</span>
              <input
                type="checkbox"
                checked={enable4kUpscale}
                onChange={(e) => setEnable4kUpscale(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !image}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>I2V 비디오 렌더링 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>이미지 비디오 변환 시작</span>
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

        {/* Display Panel */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center min-h-[480px] relative overflow-hidden">
          {/* Progress Bar during generation */}
          {isGenerating && (
            <div className="absolute top-4 left-4 right-4 z-20 bg-slate-950/80 backdrop-blur-md p-3.5 rounded-xl border border-emerald-500/40 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-emerald-300 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  Wan I2V 신경망 모션 생성 중...
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {generationProgress ? `${generationProgress.step} / ${generationProgress.total_steps} (${generationProgress.percent}%)` : '준비 중...'}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-150"
                  style={{ width: `${Math.min(100, generationProgress?.percent || 15)}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="w-full max-w-md p-4 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs text-center space-y-1">
              <p className="font-bold">⚠️ 모션 비디오 변환 안내</p>
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
                className="max-h-[400px] w-full rounded-xl border border-emerald-500/30 shadow-2xl object-cover bg-black" 
              />

              {notes.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {notes.map((n, i) => (
                    <span key={i} className="px-2.5 py-1 bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-mono font-medium">
                      {n}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3">
                <a
                  href={videoUrl}
                  download="LocalAIStudio_WanI2V.mp4"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 shadow-md"
                >
                  <Download className="w-4 h-4 text-emerald-400" /> 모션 비디오 다운로드
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
                <p className="text-sm font-semibold text-slate-400">이미지 기반 비디오 애니메이션</p>
                <p className="text-xs text-slate-500 mt-1">기준 이미지를 업로드하고 '이미지 비디오 변환 시작'을 누르세요.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
