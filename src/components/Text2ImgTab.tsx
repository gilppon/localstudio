import React, { useState, useEffect } from 'react';
import { 
  Palette, Sparkles, Download, RefreshCw, Sliders, 
  StopCircle, CheckCircle2, History, RotateCcw, ShieldCheck,
  Wand2, Zap
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { StylePresetPicker, StylePreset } from './StylePresetPicker';
import { TagAutocomplete } from './TagAutocomplete';

export const Text2ImgTab: React.FC = () => {
  const { 
    localModels, 
    fetchLocalModels, 
    generationProgress, 
    cancelGeneration, 
    recalledParams, 
    clearRecalledParams, 
    setActiveTab 
  } = useStudioStore();

  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [prompt, setPrompt] = useState('A sleek futuristic cyberpunk city with neon reflections in rain, 8k hyper-detailed');
  const [negativePrompt, setNegativePrompt] = useState('low quality, blurry, distorted, watermark, deformed');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [seed, setSeed] = useState(42);
  const [steps, setSteps] = useState(20);
  const [cfg, setCfg] = useState(7.0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isRequestPending, setIsRequestPending] = useState(false);
  const [recalledNotice, setRecalledNotice] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  useEffect(() => {
    fetchLocalModels();
  }, []);

  useEffect(() => {
    if (localModels.length > 0 && !selectedModelFile) {
      setSelectedModelFile(localModels[0].filename);
    }
  }, [localModels]);

  // Handle Recalled parameters from History Gallery
  useEffect(() => {
    if (recalledParams) {
      setPrompt(recalledParams.prompt);
      if (recalledParams.negative_prompt) setNegativePrompt(recalledParams.negative_prompt);
      setWidth(recalledParams.width);
      setHeight(recalledParams.height);
      setSeed(recalledParams.seed);
      setSteps(recalledParams.steps);
      setCfg(recalledParams.cfg);
      setRecalledNotice(true);
      clearRecalledParams();
      setTimeout(() => setRecalledNotice(false), 4000);
    }
  }, [recalledParams]);

  const isGenerating = isRequestPending || (generationProgress?.is_generating ?? false);

  const handleSelectPreset = (preset: StylePreset | null) => {
    if (!preset) {
      setSelectedPreset(null);
      return;
    }
    setSelectedPreset(preset.id);
    // Append preset suffix cleanly if not already present
    if (!prompt.includes(preset.promptSuffix.trim())) {
      setPrompt((prev) => `${prev.trim()}${preset.promptSuffix}`);
    }
  };

  const handleAddLoraTag = (loraTag: string) => {
    setPrompt((prev) => `${prev.trim()} ${loraTag}`);
  };

  const handleAddTag = (tag: string) => {
    setPrompt((prev) => (prev.trim() ? `${prev.trim()}, ${tag}` : tag));
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || isEnhancingPrompt) return;
    setIsEnhancingPrompt(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style: selectedPreset })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enhanced_prompt) {
          setPrompt(data.enhanced_prompt);
        }
      }
    } catch (e) {
      console.error("Enhance prompt failed:", e);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsRequestPending(true);
    setResultImage(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/text2img', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          negative_prompt: negativePrompt, 
          width, 
          height, 
          seed, 
          steps, 
          cfg, 
          model: selectedModelFile || "FLUX.1-schnell (GGUF Q4)" 
        })
      });
      const data = await res.json();
      if (data.image_url) {
        setResultImage(data.image_url);
      }
    } catch (e) {
      console.error("Generate failed:", e);
    } finally {
      setIsRequestPending(false);
    }
  };

  const handleCancel = async () => {
    await cancelGeneration();
    setIsRequestPending(false);
  };

  const handleRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 99999999));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Parameter Recall Notice Toast */}
      {recalledNotice && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-purple-600/90 text-white text-xs font-semibold rounded-xl shadow-2xl backdrop-blur-md border border-purple-400 animate-bounce">
          <History className="w-4 h-4" />
          <span>히스토리 갤러리에서 설정값이 성공적으로 복원되었습니다!</span>
        </div>
      )}

      {/* Header with Model Select Dropdown */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              텍스트-이미지 스튜디오 (FLUX.1 / SD)
            </h1>
            <p className="text-xs text-slate-400">
              초저지연 Latent 실시간 디노이징 스트리밍 & PNG 메타데이터 자동 임베딩
            </p>
          </div>
        </div>

        {/* Model Selection Dropdown */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-purple-500/40 shadow-xl">
          <span className="text-xs font-semibold text-purple-300 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> 보유 모델:
          </span>
          <select
            value={selectedModelFile}
            onChange={(e) => setSelectedModelFile(e.target.value)}
            className="bg-slate-950 text-white text-xs rounded-lg px-3 py-1.5 border border-purple-500/30 focus:outline-none focus:border-purple-400 font-mono min-w-[220px] max-w-[320px] truncate"
          >
            {localModels.length > 0 ? (
              localModels.map((m) => (
                <option key={m.path} value={m.filename} className="bg-slate-900 text-slate-100 font-medium py-1">
                  [{m.source}] {m.filename} ({m.size_gb} GB)
                </option>
              ))
            ) : (
              <option value="">보유 모델 없음 (모델 탐색기에서 다운로드 필요)</option>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Settings Panel (5 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Prompt Box with Enhancer */}
          <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> 긍정 프롬프트 (Positive Prompt)
              </label>
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancingPrompt || !prompt.trim()}
                className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
              >
                {isEnhancingPrompt ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                <span>AI 프롬프트 자동 강화</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 resize-none font-mono"
              placeholder="생성하고 싶은 이미지의 핵심 키워드를 입력하세요..."
            />
          </div>

          {/* Style Preset & LoRA Weight Manager */}
          <StylePresetPicker
            selectedPreset={selectedPreset}
            onSelectPreset={handleSelectPreset}
            onAddLoraTag={handleAddLoraTag}
          />

          {/* Expert Tag Autocomplete */}
          <TagAutocomplete onSelectTag={handleAddTag} />

          {/* Negative Prompt */}
          <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">
              부정 프롬프트 (Negative Prompt)
            </label>
            <textarea
              rows={2}
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500 resize-none font-mono"
            />
          </div>

          {/* Generation Hyperparameters */}
          <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">해상도 너비 (Width): {width}px</label>
                <select
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  <option value={512}>512 px (1:1 Fast)</option>
                  <option value={768}>768 px</option>
                  <option value={1024}>1024 px (FLUX.1 Native)</option>
                  <option value={1280}>1280 px (와이드)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">해상도 높이 (Height): {height}px</label>
                <select
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  <option value={512}>512 px (1:1 Fast)</option>
                  <option value={768}>768 px</option>
                  <option value={1024}>1024 px (FLUX.1 Native)</option>
                  <option value={1344}>1344 px (인물 세로)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>추론 스텝</span>
                  <span className="text-purple-400 font-bold">{steps}</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="50"
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value))}
                  className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>CFG Scale</span>
                  <span className="text-purple-400 font-bold">{cfg.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="15.0"
                  step="0.5"
                  value={cfg}
                  onChange={(e) => setCfg(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>시드 (Seed)</span>
                  <button type="button" onClick={handleRandomSeed} className="text-[10px] text-purple-400 hover:underline">
                    랜덤 🎲
                  </button>
                </div>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white font-mono text-xs text-center"
                />
              </div>
            </div>

            {/* Action Buttons: Generate & Cancel */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>추론 생성 진행 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>이미지 생성 시작</span>
                  </>
                )}
              </button>

              {isGenerating && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center gap-1.5 shrink-0"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>🛑 생성 중단</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Canvas / Live Latent Denoising Preview (6 cols) */}
        <div className="lg:col-span-6 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
          {/* Progress Bar Header during active generation */}
          {isGenerating && generationProgress && (
            <div className="absolute top-4 left-4 right-4 z-20 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-purple-500/40 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-purple-300 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  실시간 Latent 디노이징 렌더링 중...
                </span>
                <span className="font-mono text-purple-400 font-bold">
                  {generationProgress.step} / {generationProgress.total_steps} Steps ({generationProgress.percent}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full rounded-full transition-all duration-150"
                  style={{ width: `${Math.min(100, generationProgress.percent)}%` }}
                />
              </div>
            </div>
          )}

          {/* Live Latent Frame or Final Result Image */}
          {isGenerating && generationProgress?.latent_preview ? (
            <div className="space-y-4 w-full flex flex-col items-center pt-8">
              <div className="relative rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 max-w-full">
                <img 
                  src={generationProgress.latent_preview} 
                  alt="Live Latent Preview" 
                  className="max-h-[420px] w-auto object-contain transition-all filter blur-[0.5px]"
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[10px] text-purple-300 font-mono backdrop-blur-sm">
                  ⚡ 실시간 VRAM Latent 스트림
                </div>
              </div>
            </div>
          ) : resultImage ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              <div className="relative rounded-2xl overflow-hidden border border-purple-500/40 shadow-2xl shadow-purple-500/20 group">
                <img 
                  src={resultImage} 
                  alt="Generated Result" 
                  className="max-h-[420px] w-auto rounded-xl object-contain"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={resultImage}
                    download={`LocalAIStudio_T2I_${seed}.png`}
                    className="p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur-md border border-purple-500/30"
                    title="PNG 원본 다운로드"
                  >
                    <Download className="w-4 h-4 text-purple-400" />
                  </a>
                </div>
              </div>

              {/* PNG Info embedded Badge */}
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck className="w-4 h-4" /> PNG tEXt 청크 메타데이터 보존 완료
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('gallery')}
                  className="text-purple-400 hover:text-purple-300 underline font-semibold transition-colors"
                >
                  📸 히스토리 갤러리에서 보기 →
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-3">
              <Palette className="w-14 h-14 stroke-[1.2] text-slate-600 mx-auto animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-slate-400">고품질 온디바이스 이미지 생성</p>
                <p className="text-xs text-slate-500 mt-1">프롬프트를 입력하고 '이미지 생성 시작' 버튼을 누르십시오.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
