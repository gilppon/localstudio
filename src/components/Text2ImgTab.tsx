import React, { useState, useEffect } from 'react';
import { Palette, Sparkles, Download, RefreshCw, Sliders } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const Text2ImgTab: React.FC = () => {
  const { localModels, fetchLocalModels } = useStudioStore();
  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [prompt, setPrompt] = useState('A sleek futuristic cyberpunk city with neon reflections in rain, 8k hyper-detailed');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [seed, setSeed] = useState(42);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLocalModels();
  }, []);

  useEffect(() => {
    if (localModels.length > 0 && !selectedModelFile) {
      setSelectedModelFile(localModels[0].filename);
    }
  }, [localModels]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/text2img', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width, height, seed, model: "FLUX.1-schnell (GGUF Q4)" })
      });
      const data = await res.json();
      setResultImage(data.image_url);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with Model Select Dropdown */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              텍스트-이미지 스튜디오
            </h1>
            <p className="text-xs text-slate-400">고품질 GGUF / FP8 퀀타이즈 이미지 생성 파이프라인</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-purple-500/40 shadow-xl">
          <span className="text-xs font-semibold text-purple-300 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> 보유 T2I 모델:
          </span>
          <select
            value={selectedModelFile}
            onChange={(e) => setSelectedModelFile(e.target.value)}
            className="bg-slate-950 text-white text-xs rounded-lg px-3 py-1.5 border border-purple-500/30 focus:outline-none focus:border-purple-400 font-mono min-w-[220px] max-w-[320px] truncate"
          >
            {localModels.map((m) => (
              <option key={m.path} value={m.filename} className="bg-slate-900 text-slate-100 font-medium py-1">
                [{m.source}] {m.filename} ({m.size_gb} GB)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">생성 프롬프트 (Prompt)</label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
              placeholder="상상하는 이미지를 상세히 적어주세요..."
            />
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Sliders className="w-4 h-4 text-purple-400" /> 해상도 및 파라미터
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>해상도</span>
                <span className="text-purple-300 font-medium">{width} x {height}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '1:1 Square', w: 1024, h: 1024 },
                  { label: '16:9 Landscape', w: 1280, h: 720 },
                  { label: '9:16 Portrait', w: 720, h: 1280 }
                ].map((res) => (
                  <button
                    key={res.label}
                    onClick={() => { setWidth(res.w); setHeight(res.h); }}
                    className={`py-1.5 text-[11px] rounded-lg border font-medium transition-all ${width === res.w && height === res.h ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'}`}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Seed 번호</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'FLUX.1 이미지 생성 중...' : '이미지 생성하기 (ComfyUI API)'}
          </button>
        </div>

        {/* Display Canvas Panel */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center min-h-[450px]">
          {resultImage ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              <img src={resultImage} alt="Generated" className="max-h-[420px] rounded-xl border border-purple-500/30 shadow-2xl object-contain" />
              <a
                href={resultImage}
                download="LocalAIStudio_FLUX.png"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 border border-slate-700"
              >
                <Download className="w-4 h-4 text-purple-400" /> 고화질 PNG 다운로드
              </a>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-2">
              <Palette className="w-12 h-12 stroke-[1.5] text-slate-600 mx-auto" />
              <p className="text-xs">프롬프트를 입력하고 '이미지 생성하기'를 눌러주세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
