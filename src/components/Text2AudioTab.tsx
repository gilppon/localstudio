import React, { useState, useEffect } from 'react';
import { Music, Sparkles, Download, RefreshCw } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const Text2AudioTab: React.FC = () => {
  const { localModels, fetchLocalModels } = useStudioStore();
  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [prompt, setPrompt] = useState('Chill lofi hiphop beat with gentle piano chords and warm rain atmosphere');
  const [durationSec, setDurationSec] = useState(10);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
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
      const res = await fetch('http://127.0.0.1:8000/api/generate/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, duration_sec: durationSec, model: selectedModelFile || "Stable-Audio-Open" })
      });
      const data = await res.json();
      setAudioUrl(data.audio_url);
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
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              텍스트-오디오 스튜디오
            </h1>
            <p className="text-xs text-slate-400">고품질 로컬 음악, 배경음 및 사운드 효과음 오디오 합성</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-rose-500/40 shadow-xl">
          <span className="text-xs font-semibold text-rose-300 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" /> 보유 오디오 모델:
          </span>
          <select
            value={selectedModelFile}
            onChange={(e) => setSelectedModelFile(e.target.value)}
            className="bg-slate-950 text-white text-xs rounded-lg px-3 py-1.5 border border-rose-500/30 focus:outline-none focus:border-rose-400 font-mono min-w-[220px] max-w-[320px] truncate"
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
            <label className="block text-xs font-semibold text-slate-300 mb-2">오디오 스타일/효과음 프롬프트</label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
              placeholder="음악의 분위기, 악기, 분위기 또는 효과음을 설명해 주세요..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">오디오 재생 길이 (초)</label>
            <input
              type="number"
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Stable Audio 합성 중...' : '오디오 생성하기'}
          </button>
        </div>

        {/* Audio Player Panel */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center min-h-[450px]">
          {audioUrl ? (
            <div className="space-y-6 w-full max-w-md flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-xl animate-pulse">
                <Music className="w-12 h-12 text-white" />
              </div>
              <audio controls autoPlay src={audioUrl} className="w-full" />
              <a
                href={audioUrl}
                download="LocalAIStudio_StableAudio.mp3"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 border border-slate-700"
              >
                <Download className="w-4 h-4 text-rose-400" /> 오디오 MP3 다운로드
              </a>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-2">
              <Music className="w-12 h-12 stroke-[1.5] text-slate-600 mx-auto" />
              <p className="text-xs">프롬프트를 입력하고 '오디오 생성하기'를 눌러주세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
