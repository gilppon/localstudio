import React, { useState, useEffect } from 'react';
import { 
  Music, Sparkles, Download, RefreshCw, Volume2, 
  Play, Pause, History, Disc, Waves
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const Text2AudioTab: React.FC = () => {
  const { localModels, fetchLocalModels, setActiveTab } = useStudioStore();
  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [prompt, setPrompt] = useState('Chill lofi hiphop beat with gentle electric piano chords, vinyl crackle and warm rain atmosphere');
  const [durationSec, setDurationSec] = useState(8);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioPresets = [
    { label: '🎧 로파이 비트', prompt: 'Chill lofi hiphop beat, gentle Rhodes piano, vinyl crackle, cozy rainy day mood' },
    { label: '🎹 시네마틱 피아노', prompt: 'Emotional cinematic grand piano solo, deep reverb, melancholic soundtrack' },
    { label: '⚡ 사이버펑크 신스', prompt: 'Aggressive 80s dark synthwave bassline, retro arpeggiator, punchy drums' },
    { label: '🌧️ 앰비언트 자연음', prompt: 'Gentle forest rainstorm with distant rolling thunder and birds chirping' },
    { label: '⚔️ SF 효과음 (SFX)', prompt: 'Futuristic sci-fi laser blast charging sound with metallic echo' }
  ];

  useEffect(() => {
    fetchLocalModels();
  }, []);

  useEffect(() => {
    if (localModels.length > 0 && !selectedModelFile) {
      setSelectedModelFile(localModels[0].filename);
    }
  }, [localModels]);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setErrorMsg(null);
    setAudioUrl(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          duration_sec: durationSec, 
          model: selectedModelFile || "Stable-Audio-Open" 
        })
      });
      const data = await res.json();
      if (res.ok && data.audio_url) {
        setAudioUrl(data.audio_url);
      } else {
        setErrorMsg(data.detail || '오디오 생성을 완료할 수 없습니다.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('백엔드 서버에 연결할 수 없습니다.');
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
              텍스트-오디오 & 효과음 스튜디오
            </h1>
            <p className="text-xs text-slate-400">고품질 로컬 음악 생성, 배경음악 및 사운드 효과음 오디오 합성</p>
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
              <option value="">보유 모델 없음 (Stable-Audio-Open 내장)</option>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-5">
          {/* Preset Chips */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">빠른 오디오 스타일 프리셋</label>
            <div className="flex flex-wrap gap-1.5">
              {audioPresets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPrompt(p.prompt)}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium border border-slate-800 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">오디오 / 효과음 프롬프트</label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 resize-none font-mono"
              placeholder="음악의 분위기, 악기, BPM 또는 효과음을 설명해 주세요..."
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <span>오디오 생성 길이</span>
              <span className="text-rose-400 font-mono font-bold">{durationSec}초</span>
            </div>
            <input
              type="range"
              min="3"
              max="20"
              step="1"
              value={durationSec}
              onChange={(e) => setDurationSec(parseInt(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? '고품질 오디오 파형 합성 중...' : '오디오 트랙 생성 시작'}
          </button>
        </div>

        {/* Display Panel */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center min-h-[420px]">
          {errorMsg && (
            <div className="w-full max-w-md p-4 mb-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center space-y-1">
              <p className="font-bold">⚠️ 오디오 생성 안내</p>
              <p>{errorMsg}</p>
            </div>
          )}

          {audioUrl ? (
            <div className="space-y-6 w-full max-w-md flex flex-col items-center">
              {/* Vinyl Disc Aesthetic Graphic */}
              <div className="relative w-36 h-36 rounded-full bg-slate-900 border-4 border-rose-500/30 shadow-2xl flex items-center justify-center animate-spin" style={{ animationDuration: '6s' }}>
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center">
                  <Disc className="w-7 h-7 text-white" />
                </div>
              </div>

              {/* Native HTML5 Audio Player */}
              <div className="w-full bg-slate-950/80 p-4 rounded-2xl border border-rose-500/30 space-y-3 shadow-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                    <Waves className="w-4 h-4 text-rose-400" /> 생성된 사운드 트랙
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{durationSec}s | 44.1kHz WAV</span>
                </div>
                <audio controls autoPlay src={audioUrl} className="w-full rounded-lg" />
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={audioUrl}
                  download="LocalAIStudio_Audio.wav"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 shadow-md"
                >
                  <Download className="w-4 h-4 text-rose-400" /> WAV 파일 다운로드
                </a>

                <button
                  type="button"
                  onClick={() => setActiveTab('gallery')}
                  className="px-4 py-2 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-purple-500/30 transition-colors"
                >
                  <History className="w-4 h-4 text-purple-400" /> 히스토리 갤러리 →
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-3">
              <Music className="w-14 h-14 stroke-[1.2] text-slate-600 mx-auto animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-slate-400">온디바이스 오디오 & 사운드 생성</p>
                <p className="text-xs text-slate-500 mt-1">프롬프트를 입력하고 '오디오 트랙 생성 시작'을 누르세요.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
