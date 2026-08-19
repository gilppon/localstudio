import React, { useState, useEffect } from 'react';
import { 
  History, Sparkles, Star, Download, Trash2, RotateCcw, 
  Search, Sliders, Layers, Calendar, Image as ImageIcon,
  Check, Copy, ExternalLink, X, Film, Music, Mic, Play,
  Eye, Filter
} from 'lucide-react';
import { useStudioStore, HistoryEntry } from '../store/useStudioStore';

export const HistoryGalleryTab: React.FC = () => {
  const { 
    historyEntries, 
    isHistoryLoading, 
    fetchHistory, 
    toggleHistoryFavorite, 
    deleteHistoryItem, 
    recallT2iParams 
  } = useStudioStore();

  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [activeMediaFilter, setActiveMediaFilter] = useState<'all' | 'text2img' | 'video' | 'audio' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    let taskTypeParam: string | undefined = undefined;
    let onlyFavs = false;

    if (activeMediaFilter === 'favorites') {
      onlyFavs = true;
    } else if (activeMediaFilter === 'text2img') {
      taskTypeParam = 'text2img';
    } else if (activeMediaFilter === 'video') {
      taskTypeParam = 'text2video'; // or handle client side filtering
    } else if (activeMediaFilter === 'audio') {
      taskTypeParam = 'audio';
    }

    fetchHistory({
      task_type: taskTypeParam,
      only_favorites: onlyFavs,
      search: searchQuery
    });
  }, [activeMediaFilter, searchQuery]);

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleRecall = (entry: HistoryEntry) => {
    recallT2iParams(entry);
  };

  // Filter items in client for composite categories (e.g. video includes text2video & img2video, audio includes audio & tts)
  const filteredEntries = historyEntries.filter((item) => {
    if (activeMediaFilter === 'video') {
      return item.task_type === 'text2video' || item.task_type === 'img2video';
    }
    if (activeMediaFilter === 'audio') {
      return item.task_type === 'audio' || item.task_type === 'tts';
    }
    return true;
  });

  const getMediaBadge = (taskType: string) => {
    switch (taskType) {
      case 'text2img':
        return <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold flex items-center gap-1"><ImageIcon className="w-3 h-3" /> 이미지</span>;
      case 'upscale':
        return <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-semibold flex items-center gap-1">🔍 업스케일</span>;
      case 'inpaint':
        return <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-semibold flex items-center gap-1">🖌️ 인페인팅</span>;
      case 'text2video':
      case 'img2video':
        return <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold flex items-center gap-1"><Film className="w-3 h-3" /> 비디오</span>;
      case 'audio':
        return <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold flex items-center gap-1"><Music className="w-3 h-3" /> 음악/오디오</span>;
      case 'tts':
        return <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1"><Mic className="w-3 h-3" /> TTS 음성</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">{taskType}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              히스토리 갤러리 & 메타데이터 인스펙터
            </h1>
            <p className="text-xs text-slate-400">
              생성된 모든 미디어(이미지/비디오/오디오) 메타데이터 정밀 분석 및 원클릭 파라미터 복원(Recall)
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="프롬프트, 모델명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-600 font-mono"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveMediaFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeMediaFilter === 'all'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> 전체 미디어 ({historyEntries.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveMediaFilter('text2img')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeMediaFilter === 'text2img'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 text-purple-400" /> 🎨 이미지
        </button>

        <button
          type="button"
          onClick={() => setActiveMediaFilter('video')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeMediaFilter === 'video'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Film className="w-3.5 h-3.5 text-cyan-400" /> 🎬 비디오 (Wan 2.1)
        </button>

        <button
          type="button"
          onClick={() => setActiveMediaFilter('audio')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeMediaFilter === 'audio'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Music className="w-3.5 h-3.5 text-rose-400" /> 🎙️ 오디오 & TTS
        </button>

        <button
          type="button"
          onClick={() => setActiveMediaFilter('favorites')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeMediaFilter === 'favorites'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Star className="w-3.5 h-3.5 text-amber-400" /> ⭐ 즐겨찾기
        </button>
      </div>

      {/* Grid Gallery Content */}
      {isHistoryLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono">SQLite 히스토리 레코드 로드 중...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3 glass-panel rounded-2xl border border-slate-800">
          <ImageIcon className="w-12 h-12 stroke-[1.2] text-slate-600" />
          <p className="text-sm font-medium text-slate-400">생성된 히스토리 내역이 없습니다.</p>
          <p className="text-xs text-slate-500">스튜디오에서 새로운 이미지, 비디오 또는 오디오를 생성해보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setSelectedEntry(entry)}
              className="group relative rounded-xl overflow-hidden glass-panel border border-slate-800 hover:border-purple-500/60 transition-all cursor-pointer shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between"
            >
              {/* Media Thumbnail View */}
              <div className="relative aspect-square w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                {entry.task_type === 'text2img' ? (
                  <img
                    src={entry.thumbnail_url || entry.image_url}
                    alt={entry.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : entry.task_type === 'text2video' || entry.task_type === 'img2video' ? (
                  <div className="relative w-full h-full">
                    {entry.thumbnail_url ? (
                      <img src={entry.thumbnail_url} alt={entry.prompt} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-cyan-400">
                        <Film className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-cyan-600/80 text-white flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-rose-950/40 to-slate-900 flex flex-col items-center justify-center p-4 text-center space-y-2">
                    {entry.task_type === 'tts' ? (
                      <Mic className="w-8 h-8 text-amber-400 animate-pulse" />
                    ) : (
                      <Music className="w-8 h-8 text-rose-400 animate-pulse" />
                    )}
                    <span className="text-[10px] text-slate-300 line-clamp-2 font-mono">
                      "{entry.prompt}"
                    </span>
                  </div>
                )}

                {/* Favorite Star Badge */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHistoryFavorite(entry.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      entry.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400 hover:text-white'
                    }`}
                  />
                </button>

                {/* Media Type Badge */}
                <div className="absolute bottom-2 left-2">
                  {getMediaBadge(entry.task_type)}
                </div>
              </div>

              {/* Card Footer Info */}
              <div className="p-2.5 bg-slate-900/90 border-t border-slate-800/80 space-y-1">
                <p className="text-[11px] font-medium text-slate-200 truncate group-hover:text-purple-300">
                  {entry.prompt}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{entry.model_name.split(' ')[0]}</span>
                  <span>{entry.created_at.split('T')[0] || entry.created_at.split(' ')[0]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Metadata Inspector Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    미디어 메타데이터 상세 분석 [ID #{selectedEntry.id}]
                  </h2>
                  <p className="text-xs text-slate-400">
                    생성 시간: {selectedEntry.created_at} | 모델: {selectedEntry.model_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleHistoryFavorite(selectedEntry.id)}
                  className={`p-2 rounded-lg border transition-colors ${
                    selectedEntry.is_favorite
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title="즐겨찾기 토글"
                >
                  <Star className={`w-4 h-4 ${selectedEntry.is_favorite ? 'fill-amber-400' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    deleteHistoryItem(selectedEntry.id);
                    setSelectedEntry(null);
                  }}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors"
                  title="히스토리 레코드 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Left Media Preview + Right Metadata Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Media Preview Box */}
              <div className="flex flex-col items-center justify-center bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                {selectedEntry.task_type === 'text2img' ? (
                  <img
                    src={selectedEntry.image_url}
                    alt={selectedEntry.prompt}
                    className="max-h-[380px] w-auto object-contain rounded-lg shadow-lg"
                  />
                ) : selectedEntry.task_type === 'text2video' || selectedEntry.task_type === 'img2video' ? (
                  <video
                    controls
                    autoPlay
                    loop
                    src={selectedEntry.image_url}
                    className="max-h-[380px] w-full object-cover rounded-lg shadow-lg bg-black"
                  />
                ) : (
                  <div className="w-full space-y-4 py-8 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
                      <Music className="w-10 h-10" />
                    </div>
                    <audio controls autoPlay src={selectedEntry.image_url} className="w-full" />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <a
                    href={selectedEntry.image_url}
                    download={`LocalAIStudio_${selectedEntry.task_type}_${selectedEntry.id}`}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <Download className="w-4 h-4 text-purple-400" /> 파일 다운로드
                  </a>

                  {selectedEntry.task_type === 'text2img' && (
                    <button
                      type="button"
                      onClick={() => handleRecall(selectedEntry)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" /> 이 설정으로 생성 (Recall)
                    </button>
                  )}
                </div>
              </div>

              {/* Metadata Details Table */}
              <div className="space-y-4 text-xs">
                {/* Prompt Section */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400">긍정 프롬프트 (Positive Prompt)</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedEntry.prompt, 'prompt')}
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      {copiedField === 'prompt' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'prompt' ? '복사됨' : '복사'}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-200 font-mono text-[11px] leading-relaxed max-h-28 overflow-y-auto">
                    {selectedEntry.prompt}
                  </div>
                </div>

                {/* Negative Prompt if present */}
                {selectedEntry.negative_prompt && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-400">부정 프롬프트 (Negative Prompt)</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(selectedEntry.negative_prompt || '', 'neg')}
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        {copiedField === 'neg' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'neg' ? '복사됨' : '복사'}</span>
                      </button>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 font-mono text-[11px]">
                      {selectedEntry.negative_prompt}
                    </div>
                  </div>
                )}

                {/* Hyperparameters Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500">태스크 분류:</span>{' '}
                    <span className="text-white font-bold">{selectedEntry.task_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">모델 가중치:</span>{' '}
                    <span className="text-purple-400 font-bold">{selectedEntry.model_name}</span>
                  </div>
                  {selectedEntry.width > 0 && (
                    <div>
                      <span className="text-slate-500">해상도:</span>{' '}
                      <span className="text-white font-bold">{selectedEntry.width}x{selectedEntry.height}</span>
                    </div>
                  )}
                  {selectedEntry.steps > 0 && (
                    <div>
                      <span className="text-slate-500">추론 스텝:</span>{' '}
                      <span className="text-white font-bold">{selectedEntry.steps}</span>
                    </div>
                  )}
                  {selectedEntry.cfg > 0 && (
                    <div>
                      <span className="text-slate-500">CFG Scale:</span>{' '}
                      <span className="text-white font-bold">{selectedEntry.cfg}</span>
                    </div>
                  )}
                  {selectedEntry.seed > 0 && (
                    <div>
                      <span className="text-slate-500">시드 (Seed):</span>{' '}
                      <span className="text-amber-400 font-bold">{selectedEntry.seed}</span>
                    </div>
                  )}
                </div>

                {/* Additional JSON Metadata if present */}
                {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 && (
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-500 text-[10px] uppercase">확장 메타데이터 (JSON)</span>
                    <pre className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-[10px] text-slate-400 overflow-x-auto font-mono">
                      {JSON.stringify(selectedEntry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
