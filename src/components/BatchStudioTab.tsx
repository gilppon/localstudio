import React, { useState, useEffect } from 'react';
import { 
  Layers, Sparkles, Play, CheckCircle2, AlertCircle, RefreshCw, 
  Download, History, Film, Music, Image as ImageIcon, Trash2, ListOrdered 
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

interface BatchQueueItem {
  id: string;
  prompt: string;
  seed: number;
  task_type: 'text2img' | 'text2video' | 'audio';
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  url?: string;
  error?: string;
}

export const BatchStudioTab: React.FC = () => {
  const { localModels, fetchLocalModels, setActiveTab } = useStudioStore();
  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [taskType, setTaskType] = useState<'text2img' | 'text2video' | 'audio'>('text2img');
  const [inputMode, setInputMode] = useState<'multi_prompt' | 'seed_variation'>('multi_prompt');
  
  // Multi-prompt state
  const [multiPromptText, setMultiPromptText] = useState(
    "A cyberpunk futuristic city in neon rain\nA magical forest with glowing blue bioluminescent mushrooms\nA vintage 1970s sports car parked by sunset beach"
  );
  
  // Seed variation state
  const [singlePrompt, setSinglePrompt] = useState("A hyperrealistic portrait of an astronaut exploring alien crystal caves");
  const [seedCount, setSeedCount] = useState<number>(4);
  const [baseSeed, setBaseSeed] = useState<number>(1000);

  const [queue, setQueue] = useState<BatchQueueItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    fetchLocalModels();
  }, []);

  useEffect(() => {
    if (localModels.length > 0 && !selectedModelFile) {
      setSelectedModelFile(localModels[0].filename);
    }
  }, [localModels]);

  const handleBuildQueue = () => {
    const newItems: BatchQueueItem[] = [];
    if (inputMode === 'multi_prompt') {
      const lines = multiPromptText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      lines.forEach((line, idx) => {
        newItems.push({
          id: `batch-${Date.now()}-${idx}`,
          prompt: line,
          seed: 42 + idx * 10,
          task_type: taskType,
          status: 'pending'
        });
      });
    } else {
      for (let i = 0; i < seedCount; i++) {
        newItems.push({
          id: `batch-${Date.now()}-${i}`,
          prompt: singlePrompt,
          seed: baseSeed + i,
          task_type: taskType,
          status: 'pending'
        });
      }
    }
    setQueue(newItems);
    setCompletedCount(0);
  };

  const handleStartBatch = async () => {
    if (queue.length === 0 || isRunning) return;
    setIsRunning(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/batch/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: queue.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            negative_prompt: '',
            seed: q.seed,
            task_type: q.task_type
          })),
          model: selectedModelFile || "FLUX.1-schnell"
        })
      });
      const data = await res.json();
      if (res.ok && data.results) {
        setQueue((prev) =>
          prev.map((item) => {
            const found = data.results.find((r: any) => r.id === item.id);
            if (found) {
              return {
                ...item,
                status: found.status === 'completed' ? 'completed' : 'failed',
                url: found.url,
                error: found.error
              };
            }
            return item;
          })
        );
        setCompletedCount(data.results.filter((r: any) => r.status === 'completed').length);
      }
    } catch (e) {
      console.error("Batch processing error:", e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearQueue = () => {
    if (isRunning) return;
    setQueue([]);
    setCompletedCount(0);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              일괄 대량 생성 스튜디오 (Batch Generation Queue)
            </h1>
            <p className="text-xs text-slate-400">
              다중 프롬프트 일괄 큐 & 시드 베리에이션 연속 자동 렌더링 파이프라인
            </p>
          </div>
        </div>

        {/* Model Selector Dropdown */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-orange-500/40 shadow-xl">
          <span className="text-xs font-semibold text-orange-300 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" /> 보유 모델:
          </span>
          <select
            value={selectedModelFile}
            onChange={(e) => setSelectedModelFile(e.target.value)}
            className="bg-slate-950 text-white text-xs rounded-lg px-3 py-1.5 border border-orange-500/30 focus:outline-none focus:border-orange-400 font-mono min-w-[200px] max-w-[280px] truncate"
          >
            {localModels.length > 0 ? (
              localModels.map((m) => (
                <option key={m.path} value={m.filename} className="bg-slate-900 text-slate-100 font-medium py-1">
                  [{m.source}] {m.filename} ({m.size_gb} GB)
                </option>
              ))
            ) : (
              <option value="">보유 모델 없음 (FLUX.1-schnell 기본)</option>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Config Panel (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl glass-panel border border-slate-800 space-y-5">
          {/* Task Type Switch */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">1. 미디어 생성 유형</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTaskType('text2img')}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  taskType === 'text2img'
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500 shadow-md shadow-orange-500/10'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> 이미지
              </button>

              <button
                type="button"
                onClick={() => setTaskType('text2video')}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  taskType === 'text2video'
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500 shadow-md shadow-orange-500/10'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" /> 비디오
              </button>

              <button
                type="button"
                onClick={() => setTaskType('audio')}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  taskType === 'audio'
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500 shadow-md shadow-orange-500/10'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5" /> 오디오
              </button>
            </div>
          </div>

          {/* Mode Switch: Multi-prompt vs Seed Variations */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">2. 배치 생성 모드</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInputMode('multi_prompt')}
                className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                  inputMode === 'multi_prompt'
                    ? 'bg-purple-900/40 text-purple-300 border-purple-500/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                다중 프롬프트 (줄바꿈 입력)
              </button>

              <button
                type="button"
                onClick={() => setInputMode('seed_variation')}
                className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                  inputMode === 'seed_variation'
                    ? 'bg-purple-900/40 text-purple-300 border-purple-500/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                시드 베리에이션 (Seed N개)
              </button>
            </div>
          </div>

          {/* Mode Input Content */}
          {inputMode === 'multi_prompt' ? (
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span>프롬프트 목록 (한 줄에 1개씩)</span>
                <span className="text-orange-400 font-mono">
                  {multiPromptText.split('\n').filter((l) => l.trim().length > 0).length}개 항목
                </span>
              </div>
              <textarea
                rows={6}
                value={multiPromptText}
                onChange={(e) => setMultiPromptText(e.target.value)}
                className="w-full p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 font-mono resize-none"
                placeholder="A prompt on each line..."
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">단일 프롬프트</label>
                <textarea
                  rows={3}
                  value={singlePrompt}
                  onChange={(e) => setSinglePrompt(e.target.value)}
                  className="w-full p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">시작 시드 (Base Seed)</label>
                  <input
                    type="number"
                    value={baseSeed}
                    onChange={(e) => setBaseSeed(parseInt(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">변형 개수 (Units)</label>
                  <select
                    value={seedCount}
                    onChange={(e) => setSeedCount(parseInt(e.target.value))}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  >
                    <option value={2}>2개 변형</option>
                    <option value={4}>4개 변형</option>
                    <option value={8}>8개 변형</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBuildQueue}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <ListOrdered className="w-3.5 h-3.5 text-orange-400" /> 큐 목록 구성하기
            </button>

            <button
              type="button"
              onClick={handleClearQueue}
              disabled={isRunning || queue.length === 0}
              className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 disabled:opacity-40 text-xs rounded-xl border border-slate-800 transition-colors"
              title="큐 비우기"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleStartBatch}
            disabled={isRunning || queue.length === 0}
            className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>배치 큐 연속 렌더링 중... ({completedCount} / {queue.length})</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>배치 큐 연속 생성 시작 ({queue.length}개 작업)</span>
              </>
            )}
          </button>
        </div>

        {/* Right Queue Monitor & Results Panel (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl glass-panel border border-slate-800 space-y-5 flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-400" /> 배치 작업 진행 현황 ({completedCount} / {queue.length})
              </h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('gallery')}
                  className="px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 text-[11px] font-semibold border border-purple-500/30 flex items-center gap-1 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-purple-400" /> 갤러리 열기
                </button>
              </div>
            </div>

            {/* Queue Table */}
            {queue.length > 0 ? (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="font-mono text-slate-500 font-bold w-5 shrink-0">#{idx + 1}</span>
                      
                      {item.url && (
                        <img
                          src={item.url}
                          alt="Thumbnail"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                        />
                      )}

                      <div className="truncate">
                        <p className="text-slate-200 font-medium truncate">{item.prompt}</p>
                        <span className="text-[10px] text-slate-500 font-mono">Seed: {item.seed}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {item.status === 'completed' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[10px] font-semibold flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3 h-3" /> 완료
                        </span>
                      )}
                      {item.status === 'rendering' && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-[10px] font-semibold flex items-center gap-1 font-mono animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" /> 생성중
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                          대기중
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="px-2 py-0.5 rounded-md bg-red-950/80 text-red-400 border border-red-500/40 text-[10px] font-semibold flex items-center gap-1 font-mono">
                          <AlertCircle className="w-3 h-3" /> 실패
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-20 space-y-2">
                <Layers className="w-12 h-12 stroke-1 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">대기 중인 배치 큐가 없습니다.</p>
                <p className="text-[11px] text-slate-500">좌측에서 프롬프트를 입력하고 '큐 목록 구성하기'를 클릭하세요.</p>
              </div>
            )}
          </div>

          {/* Footer Queue Summary */}
          {queue.length > 0 && (
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>총 {queue.length}개 작업 중 {completedCount}개 완료</span>
              <span className="text-orange-300 font-mono font-semibold">
                {Math.round((completedCount / queue.length) * 100 || 0)}% 진행됨
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
