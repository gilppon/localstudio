import React, { useState } from 'react';
import { Film, Sparkles, Download, RefreshCw, Video } from 'lucide-react';

export const Text2VideoTab: React.FC = () => {
  const [prompt, setPrompt] = useState('Cinematic shot of a majestic dragon flying through misty mountain peaks, dramatic lighting, 4k');
  const [durationSec, setDurationSec] = useState(4);
  const [enable60fps, setEnable60fps] = useState(true);
  const [enable4kUpscale, setEnable4kUpscale] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/text2video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          duration_sec: durationSec,
          enable_60fps: enable60fps,
          enable_4k_upscale: enable4kUpscale,
          model: "Wan 2.1 5B (FP8 / CPU Offload)"
        })
      });
      const data = await res.json();
      setVideoUrl(data.video_url);
      setNotes(data.enhanced_notes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Film className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            텍스트-비디오 스튜디오 <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">Wan 2.1 5B / 14B</span>
          </h1>
          <p className="text-xs text-slate-400">텍스트 기반 4초~5초 시네마틱 숏폼 비디오 생성 엔진</p>
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
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              placeholder="카메라 움직임과 대상의 행동을 설명하세요..."
            />
          </div>

          {/* Wan2GP Booster Options */}
          <div className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-500/30 space-y-2 text-xs">
            <span className="font-semibold text-cyan-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Wan2GP 원클릭 부스터 후처리
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

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Wan 2.1 비디오 렌더링 중...' : '비디오 렌더링 시작'}
          </button>
        </div>

        {/* Video Player Display */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center min-h-[450px]">
          {videoUrl ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              <video controls autoPlay loop src={videoUrl} className="max-h-[400px] w-full rounded-xl border border-cyan-500/30 shadow-2xl object-cover" />
              <a
                href={videoUrl}
                download="LocalAIStudio_WanT2V.mp4"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 border border-slate-700"
              >
                <Download className="w-4 h-4 text-cyan-400" /> MP4 비디오 다운로드
              </a>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-2">
              <Video className="w-12 h-12 stroke-[1.5] text-slate-600 mx-auto" />
              <p className="text-xs">프롬프트를 입력하고 '비디오 렌더링 시작'을 눌러주세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
