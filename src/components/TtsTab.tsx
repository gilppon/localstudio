import React, { useState } from 'react';
import { Mic, Sparkles, Download, RefreshCw, Volume2 } from 'lucide-react';

export const TtsTab: React.FC = () => {
  const [text, setText] = useState('Local AI Studio에 오신 것을 환영합니다! 사용자 PC 자원만으로 100% 초고속 로컬 음성을 생성합니다.');
  const [voice, setVoice] = useState('af_heart');
  const [speed, setSpeed] = useState(1.0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed })
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Mic className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            TTS (텍스트-음성) 스튜디오 <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">Kokoro-82M (Apache 2.0)</span>
          </h1>
          <p className="text-xs text-slate-400">텍스트 입력 ➔ 즉시 고품질 성우 음성 파일(WAV/MP3) 합성 출력</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">대사/스크립트 텍스트 입력</label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
              placeholder="음성으로 변환할 대사를 입력하세요..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">성우 보이스 선택</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="af_heart">Kokoro - Heart (여성 아나운서)</option>
              <option value="af_bella">Kokoro - Bella (여성 라디오 DJ)</option>
              <option value="am_adam">Kokoro - Adam (남성 펠로우)</option>
              <option value="am_michael">Kokoro - Michael (남성 내레이터)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>발화 속도 (Speed)</span>
              <span className="text-amber-400 font-medium">{speed}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-slate-900"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Kokoro-82M 음성 합성 중...' : '즉시 성우 음성 출력 (WAV)'}
          </button>
        </div>

        {/* Display Audio Output */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center min-h-[450px]">
          {errorMsg ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center max-w-md">
              <p className="font-semibold mb-1">⚠️ 오류 발생</p>
              <p>{errorMsg}</p>
            </div>
          ) : audioUrl ? (
            <div className="space-y-6 w-full max-w-md flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-xl animate-pulse">
                <Volume2 className="w-12 h-12 text-white" />
              </div>
              <audio controls autoPlay src={audioUrl} className="w-full" />
              <a
                href={audioUrl}
                download="LocalAIStudio_TTS.mp3"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 border border-slate-700"
              >
                <Download className="w-4 h-4 text-amber-400" /> MP3/WAV 음성 파일 다운로드
              </a>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-2">
              <Mic className="w-12 h-12 stroke-[1.5] text-slate-600 mx-auto" />
              <p className="text-xs">대사를 입력하고 '즉시 성우 음성 출력'을 눌러주세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
