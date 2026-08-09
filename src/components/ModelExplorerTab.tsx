import React, { useState, useEffect } from 'react';
import { Search, Download, Play, CheckCircle2, Copy, Star, Eye, Wrench, Brain, Sparkles, RefreshCw } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

interface ModelItem {
  id: string;
  name: string;
  author: string;
  downloads: number;
  likes: number;
  updatedDaysAgo: number;
  isStaffPick?: boolean;
  description: string;
  sizeGb: string;
  params: string;
  arch: string;
  capabilities: string[];
}

const PRESET_MODELS: ModelItem[] = [
  {
    id: 'prism-ml/bonsai-27b',
    name: 'bonsai-27b',
    author: 'prism-ml',
    downloads: 236180,
    likes: 20,
    updatedDaysAgo: 6,
    isStaffPick: true,
    description: 'Bonsai is a 27B model, but takes only about 4GB. Capable of reasoning, coding, vision, and tool use.',
    sizeGb: '4.73 GB',
    params: '27B',
    arch: 'qwen3.5',
    capabilities: ['Vision', 'Tool Use', 'Reasoning']
  },
  {
    id: 'google/gemma-4-12b-qat',
    name: 'Gemma 4 12B Qat',
    author: 'google',
    downloads: 182000,
    likes: 145,
    updatedDaysAgo: 62,
    isStaffPick: false,
    description: 'Gemma 4 12B optimized with Quantization Aware Training.',
    sizeGb: '3.21 GB',
    params: '12B',
    arch: 'gemma4',
    capabilities: ['Tool Use', 'Reasoning']
  },
  {
    id: 'google/gemma-4-26b-a4b-qat',
    name: 'Gemma 4 26B A4B Qat',
    author: 'google',
    downloads: 94000,
    likes: 89,
    updatedDaysAgo: 62,
    isStaffPick: false,
    description: 'Gemma 4 26B A4B optimized with Quantization-Aware Training.',
    sizeGb: '5.80 GB',
    params: '26B',
    arch: 'gemma4',
    capabilities: ['Reasoning']
  },
  {
    id: 'nvidia/nemotron-3-nano-omni',
    name: 'Nemotron 3 Nano Omni',
    author: 'nvidia',
    downloads: 520000,
    likes: 310,
    updatedDaysAgo: 100,
    isStaffPick: true,
    description: 'Nemotron Nano V3 Omni is a multi-modal large language model.',
    sizeGb: '2.95 GB',
    params: '3B',
    arch: 'nemotron',
    capabilities: ['Vision', 'Audio', 'Tool Use']
  },
  {
    id: 'Qwen/Qwen3.6-27B-Instruct-GGUF',
    name: 'Qwen3.6 27B',
    author: 'Qwen',
    downloads: 890000,
    likes: 640,
    updatedDaysAgo: 106,
    isStaffPick: false,
    description: 'Dense 27B Qwen 3.6 prioritizes stability and real-world utility.',
    sizeGb: '6.12 GB',
    params: '27B',
    arch: 'qwen3.6',
    capabilities: ['Vision', 'Tool Use', 'Reasoning']
  }
];

export const ModelExplorerTab: React.FC = () => {
  const { setActiveTab, downloads } = useStudioStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [modelList, setModelList] = useState<ModelItem[]>(PRESET_MODELS);
  const [selectedModel, setSelectedModel] = useState<ModelItem>(PRESET_MODELS[0]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [localDownloadedModels, setLocalDownloadedModels] = useState<any[]>([]);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');

  const currentDownload = Object.values(downloads).find(
    (dl: any) =>
      dl.filename?.toLowerCase() === selectedFile.toLowerCase() ||
      dl.filename?.toLowerCase() === `${selectedModel.name.toLowerCase()}.gguf` ||
      dl.filename?.toLowerCase() === `${selectedModel.id.split('/').pop()?.toLowerCase()}.gguf`
  );

  const fetchAvailableFiles = async (modelId: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/models/hf-files?model_id=${encodeURIComponent(modelId)}`);
      if (res.ok) {
        const data = await res.json();
        const files: string[] = data.files || [];
        setAvailableFiles(files);
        if (files.length > 0) {
          setSelectedFile(files[0]);
        } else {
          setSelectedFile(`${modelId.split('/').pop()}.gguf`);
        }
      }
    } catch (e) {
      console.warn('HF files fetch error:', e);
      setAvailableFiles([]);
      setSelectedFile(`${modelId.split('/').pop()}.gguf`);
    }
  };

  useEffect(() => {
    fetchAvailableFiles(selectedModel.id);
  }, [selectedModel.id]);

  useEffect(() => {
    if (currentDownload?.status === 'completed') {
      fetchLocalModels();
    }
  }, [currentDownload?.status]);

  const fetchLocalModels = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/models/local-list');
      if (res.ok) {
        const data = await res.json();
        setLocalDownloadedModels(data);
      }
    } catch (e) {
      console.warn('Local models fetch failed:', e);
    }
  };

  useEffect(() => {
    fetchLocalModels();
  }, []);

  // Live search from Hugging Face Backend API
  const fetchHfModels = async (query: string) => {
    setLoading(true);
    try {
      const q = query.trim() || 'gguf';
      const res = await fetch(`http://127.0.0.1:8000/api/models/hf-search?query=${encodeURIComponent(q)}`);
      if (res.ok) {
        const rawData = await res.json();
        if (Array.isArray(rawData) && rawData.length > 0) {
          const mapped: ModelItem[] = rawData.map((item: any) => ({
            id: item.id || item.modelId || 'huggingface/model',
            name: (item.id || item.modelId || 'model').split('/').pop() || 'model',
            author: (item.id || item.modelId || 'hf').split('/')[0] || 'hf',
            downloads: item.downloads || 12000,
            likes: item.likes || 15,
            updatedDaysAgo: 5,
            isStaffPick: item.likes > 100,
            description: item.description || `Hugging Face High-performance GGUF / FP8 Model (${item.id})`,
            sizeGb: '4.20 GB',
            params: '7B',
            arch: item.tags?.includes('qwen') ? 'qwen' : 'llama',
            capabilities: ['Vision', 'Tool Use', 'Reasoning']
          }));
          setModelList(mapped);
          if (mapped.length > 0) {
            setSelectedModel(mapped[0]);
          }
        }
      }
    } catch (e) {
      console.warn("HF search fallback:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchHfModels(searchQuery);
      } else {
        setModelList(PRESET_MODELS);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isDownloaded = localDownloadedModels.some(
    (m: any) =>
      (selectedFile && m.filename?.toLowerCase() === selectedFile.toLowerCase()) ||
      (selectedFile && m.raw_filename?.toLowerCase() === selectedFile.toLowerCase()) ||
      m.filename?.toLowerCase().includes(selectedModel.name.toLowerCase()) ||
      m.raw_filename?.toLowerCase().includes(selectedModel.name.toLowerCase()) ||
      m.path?.toLowerCase().includes(selectedModel.name.toLowerCase())
  );

  const handleUseInNewChat = () => {
    alert(`모델 [${selectedModel.id}]이(가) 활성화되었습니다! 멀티모달 챗으로 이동합니다.`);
    setActiveTab('multimodal');
  };

  const handleDownload = async () => {
    const downloadFilename = selectedFile || `${selectedModel.name}.gguf`;
    setDownloading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/models/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://huggingface.co/${selectedModel.id}/resolve/main/${downloadFilename}`,
          filename: downloadFilename
        })
      });
      if (res.ok) {
        alert(`[${downloadFilename}] 모델 백그라운드 다운로드가 시작되었습니다.`);
      }
      setTimeout(() => {
        setDownloading(false);
        fetchLocalModels();
      }, 1500);
    } catch (e) {
      setDownloading(false);
    }
  };

  const [batchDownloading, setBatchDownloading] = useState(false);

  const handleAutoSetup = async () => {
    setBatchDownloading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/models/auto-setup', { method: 'POST' });
      if (res.ok) {
        alert('4대 카테고리 로컬 오픈소스 AI 모델(Qwen2.5-VL, FLUX.1-schnell, Wan2.1, Kokoro) 일괄 다운로드가 백그라운드에서 시작되었습니다!');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        setBatchDownloading(false);
        fetchLocalModels();
      }, 3000);
    }
  };

  return (
    <div className="flex h-[calc(100vh-1rem)] bg-[#121318] text-slate-200 overflow-hidden font-sans">
      {/* Left List Panel */}
      <div className="w-[380px] border-r border-slate-800/80 flex flex-col shrink-0 bg-[#161820]">
        {/* Top Search Input */}
        <div className="p-3 border-b border-slate-800">
          <div className="relative">
            <input
              type="text"
              placeholder="Hugging Face에서 모델 검색 (예: qwen2.5, flux, gemma)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-slate-900/90 border border-slate-700/60 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Subheader */}
        <div className="px-3 py-2 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60">
          <span className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
            {loading ? <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" /> : 'Hugging Face Live'}
          </span>
          <span className="cursor-pointer hover:text-slate-200">결과 {modelList.length}개 ↕</span>
        </div>

        {/* Models List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {modelList.map((model) => {
            const isSelected = selectedModel.id === model.id;
            return (
              <div
                key={model.id}
                onClick={() => setSelectedModel(model)}
                className={`p-3.5 cursor-pointer transition-all ${
                  isSelected ? 'bg-indigo-950/40 border-l-4 border-indigo-500' : 'hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">{model.name}</span>
                    {model.isStaffPick && (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">✓</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">{model.updatedDaysAgo} days ago</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{model.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#121318]">
        {/* Model Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              🤖 {selectedModel.id}
              <button
                onClick={() => navigator.clipboard.writeText(selectedModel.id)}
                className="text-slate-500 hover:text-slate-300"
              >
                <Copy className="w-4 h-4" />
              </button>
            </h1>

            {selectedModel.isStaffPick && (
              <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-xs font-semibold flex items-center gap-1">
                👾 Staff Pick ↗
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>⬇ {selectedModel.downloads.toLocaleString()}</span>
            <span>⭐ {selectedModel.likes}</span>
            <span>Last updated: {selectedModel.updatedDaysAgo} days ago</span>
          </div>
        </div>

        {/* Highlight Callout Box */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 leading-relaxed">
          {selectedModel.description}
        </div>

        {/* Specs Badges */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-slate-300 font-mono">Params: <strong className="text-white">{selectedModel.params}</strong></span>
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-slate-300 font-mono">Arch: <strong className="text-white">{selectedModel.arch}</strong></span>
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-slate-300 font-mono">Format: <strong className="text-cyan-400 font-semibold">GGUF</strong></span>
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-slate-300 font-mono">MLX</span>
        </div>

        {/* Capabilities Row */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400 font-medium">Capabilities:</span>
          {selectedModel.capabilities.map((cap) => (
            <span key={cap} className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg flex items-center gap-1 font-medium">
              {cap === 'Vision' && <Eye className="w-3.5 h-3.5 text-cyan-400" />}
              {cap === 'Tool Use' && <Wrench className="w-3.5 h-3.5 text-indigo-400" />}
              {cap === 'Reasoning' && <Brain className="w-3.5 h-3.5 text-purple-400" />}
              {cap}
            </span>
          ))}
        </div>

        {/* Download Box Panel (Exact layout matching screenshot) */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5"><Download className="w-4 h-4 text-indigo-400" /> Download Options</span>
          </div>

          {availableFiles.length > 0 ? (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-400">📥 다운로드할 세부 파일 선택 (양자화 버전):</label>
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="w-full bg-slate-950 text-white text-xs rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
              >
                {availableFiles.map((filename) => (
                  <option key={filename} value={filename} className="bg-slate-900 font-mono text-slate-100">
                    {filename}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-xs font-semibold text-white">{selectedFile || selectedModel.name}</span>
              <span className="text-xs text-slate-400 font-mono">{selectedModel.sizeGb}</span>
            </div>
          )}

          {currentDownload && currentDownload.status === 'downloading' && (
            <div className="p-3.5 bg-indigo-950/20 rounded-xl border border-indigo-500/20 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-indigo-400 flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> 다운로드 중...
                </span>
                <span className="text-cyan-400 font-mono font-bold">
                  {currentDownload.progress_percent}% ({currentDownload.speed_mbps} MB/s)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${currentDownload.progress_percent}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{(currentDownload.downloaded_bytes / (1024 ** 2)).toFixed(1)} MB 수신됨</span>
                <span>총 {(currentDownload.total_bytes / (1024 ** 2)).toFixed(1)} MB</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            {isDownloaded ? (
              <>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>로컬 PC에 모델 파일 다운로드 완료</span>
                </div>

                <button
                  onClick={handleUseInNewChat}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" /> Use in New Chat
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
                  <span>⚠️ 미다운로드 모델 (다운로드 필요)</span>
                </div>

                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {downloading ? '다운로드 중...' : '모델 파일 다운로드 (GGUF)'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* README Section */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs font-semibold text-slate-400">
            📄 README
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">{selectedModel.name}</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedModel.name} is PrismML's family of binary and ternary Qwen3.6 27B models, designed to retain strong reasoning, coding, and agentic capabilities at exceptionally small footprints.
            </p>

            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Highlights</h3>
              <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
                <li>
                  <strong className="text-white">27B reasoning in a phone-class footprint:</strong> binary weights compress the language model to about 3.9 GB, bringing 27B-class local inference to high-end devices.
                </li>
                <li>
                  <strong className="text-white">Quality that survives extreme compression:</strong> across 15 thinking-mode benchmarks, the model retains 89.5% of FP16 average score.
                </li>
                <li>
                  <strong className="text-white">Ready for demanding local workflows:</strong> supports vision input, tool use, hybrid thinking, and a 262K-token context window.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
