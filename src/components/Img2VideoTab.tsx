import React, { useState, useEffect } from 'react';
import { Video, Image as ImageIcon, Sparkles, Download, RefreshCw, Wand2 } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const Img2VideoTab: React.FC = () => {
  const { localModels, fetchLocalModels } = useStudioStore();
  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Smooth camera zoom in with natural wind blowing through hair and trees');
  const [motionStrength, setMotionStrength] = useState(0.8);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleGenerate = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/img2video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, image_base64: image, motion_strength: motionStrength, model: selectedModelFile || "Wan I2V 14B" })
      });
      const data = await res.json();
      setVideoUrl(data.video_url);
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
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              이미지-비디오 (I2V) 스튜디오
            </h1>
            <p className="text-xs text-slate-400">기준 이미지 업로드 + 자연스러운 카메라 모션 애니메이션</p>
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
              <option value="">보유 모델 없음 (모델 탐색에서 다운로드 필요)</option>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">기준 이미지 업로드</label>
            <label className="flex flex-col items-center justify-center h-36 bg-slate-900 border border-dashed border-slate-700 hover:border-emerald-500 rounded-xl cursor-pointer transition-all overflow-hidden relative">
              {image ? (
                <img src={image} alt="Ref" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-slate-400 space-y-1">
                  <ImageIcon className="w-8 h-8 stroke-1 mx-auto text-emerald-400" />
                  <span className="text-xs">클릭하여 원본 이미지 선택</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">모션 프롬프트</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              placeholder="예: 카메라 줌인, 바람에 흔들리는 머리카락"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>모션 강도 (Motion Strength)</span>
              <span className="text-emerald-400 font-medium">{motionStrength}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={motionStrength}
              onChange={(e) => setMotionStrength(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-900"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !image}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Wan I2V 모션 애니메이팅 중...' : '이미지 비디오 변환 시작'}
          </button>
        </div>

        {/* Display Panel */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center min-h-[450px]">
          {videoUrl ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              <video controls autoPlay loop src={videoUrl} className="max-h-[400px] w-full rounded-xl border border-emerald-500/30 shadow-2xl object-cover" />
              <a
                href={videoUrl}
                download="LocalAIStudio_WanI2V.mp4"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 border border-slate-700"
              >
                <Download className="w-4 h-4 text-emerald-400" /> 모션 비디오 다운로드
              </a>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-2">
              <Video className="w-12 h-12 stroke-[1.5] text-slate-600 mx-auto" />
              <p className="text-xs">기준 이미지를 업로드하고 '이미지 비디오 변환 시작'을 눌러주세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
