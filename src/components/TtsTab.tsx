import React, { useState, useEffect } from 'react';
import { 
  Mic, Sparkles, Download, RefreshCw, Volume2, 
  Play, Pause, History, UserCheck, AudioLines
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const TtsTab: React.FC = () => {
  const { localModels, fetchLocalModels, setActiveTab } = useStudioStore();
  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [text, setText] = useState('Local AI Studio에 오신 것을 환영합니다! 사용자 PC 자원만으로 100% 초고속 로컬 음성을 합성합니다.');
  const [voice, setVoice] = useState('af_heart');
  const [speed, setSpeed] = useState(1.0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const voiceOptions = [
    { id: 'af_heart', name: '👩 여성 따뜻한 목소리 (Heart)', lang: 'KO/EN' },
    { id: 'af_bella', name: '👱‍♀️ 여성 밝은 톤 (Bella)', lang: 'EN' },
    { id: 'am_adam', name: '👨 남성 아나운서 톤 (Adam)', lang: 'KO/EN' },
    { id: 'am_michael', name: '🧔 남성 중후한 내레이션 (Michael)', lang: 'EN' }
  ];

  const quickScripts = [
    '안녕하십니까, 오늘의 주요 AI 테크 뉴스를 전해드립니다.',
    'Local AI Studio는 외부 서버 전송 없이 안전하게 100% 개인 PC에서 작동합니다.',
    'System initialization complete. All neural pipelines are online and ready.'
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
    if (!text.trim() || loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          voice, 
          speed, 
          model: selectedModelFile || "Kokoro-82M" 
        })
      });
      const data = await res.json();
      if (res.ok && data.audio_url) {
        setAudioUrl(data.audio_url);
      } else {
        setErrorMsg(data.detail || '음성 합성에 실패했습니다.');
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
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              TTS (텍스트-음성) 스튜디오
            </h1>
            <p className="text-xs text-slate-400">텍스트 입력 ➔ 즉시 고품질 성우 음성 파일(WAV/MP3) 합성 출력</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-amber-500/40 shadow-xl">
          <span className="text-xs font-semibold text-amber-300 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 보유 TTS 모델:
          </span>
          <select
            value={selectedModelFile}
            onChange={(e) => setSelectedModelFile(e.target.value)}
            className="bg-slate-950 text-white text-xs rounded-lg px-3 py-1.5 border border-amber-500/30 focus:outline-none focus:border-amber-400 font-mono min-w-[220px] max-w-[320px] truncate"
          >
            {localModels.length > 0 ? (
              localModels.map((m) => (
                <option key={m.path} value={m.filename} className="bg-slate-900 text-slate-100 font-medium py-1">
                  [{m.source}] {m.filename} ({m.size_gb} GB)
                </option>
              ))
            ) : (
              <option value="">보유 모델 없음 (Kokoro-82M 내장)</option>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-5">
          {/* Quick Script Chips */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">샘플 대사 선택</label>
            <div className="space-y-1">
              {quickScripts.map((qs, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setText(qs)}
                  className="w-full text-left p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-[11px] truncate border border-slate-800 transition-colors"
                >
                  "{qs}"
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">대사 / 스크립트 텍스트 입력</label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none font-mono"
              placeholder="음성으로 변환할 텍스트를 입력하세요..."
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">성우 음색 (Voice Model)</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {voiceOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} [{v.lang}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>발화 속도 (Speed)</span>
                <span className="text-amber-400 font-mono font-bold">{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !text.trim()}
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? '성우 음성 신경망 합성 중...' : 'TTS 음성 합성 시작'}
          </button>
        </div>

        {/* Display Panel */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center min-h-[420px]">
          {errorMsg && (
            <div className="w-full max-w-md p-4 mb-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center space-y-1">
              <p className="font-bold">⚠️ TTS 음성 합성 안내</p>
              <p>{errorMsg}</p>
            </div>
          )}

          {audioUrl ? (
            <div className="space-y-6 w-full max-w-md flex flex-col items-center">
              {/* Studio Microphone Visualizer Graphic */}
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center shadow-2xl shadow-amber-500/10">
                <Mic className="w-12 h-12 text-amber-400 animate-bounce" />
              </div>

              {/* Native HTML5 Audio Player */}
              <div className="w-full bg-slate-950/80 p-4 rounded-2xl border border-amber-500/30 space-y-3 shadow-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <AudioLines className="w-4 h-4 text-amber-400" /> 합성된 성우 음성
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">속도 {speed.toFixed(1)}x | {voice}</span>
                </div>
                <audio controls autoPlay src={audioUrl} className="w-full rounded-lg" />
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={audioUrl}
                  download="LocalAIStudio_TTS.mp3"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 shadow-md"
                >
                  <Download className="w-4 h-4 text-amber-400" /> MP3 다운로드
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
              <Mic className="w-14 h-14 stroke-[1.2] text-slate-600 mx-auto animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-slate-400">초고속 로컬 성우 음성 합성</p>
                <p className="text-xs text-slate-500 mt-1">대사를 입력하고 'TTS 음성 합성 시작'을 누르세요.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
