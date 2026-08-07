import React, { useState, useEffect } from 'react';
import { Eye, Send, Image as ImageIcon, Sparkles, Bot, User } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  image?: string;
}

export const MultimodalTab: React.FC = () => {
  const { setVramFlushing, localModels, fetchLocalModels } = useStudioStore();
  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'bot', text: '안녕하세요! Qwen2.5-VL 로컬 비전-언어 모델입니다. 분석하고 싶은 이미지와 궁금한 점을 입력해 주세요.' }
  ]);
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
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !selectedImage) return;

    const userMsg: ChatMessage = { sender: 'user', text: prompt, image: selectedImage || undefined };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/multimodal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg.text, image_base64: userMsg.image })
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'bot', text: '오류가 발생했습니다. 백엔드 연결을 확인해 주세요.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto h-[calc(100vh-5rem)] flex flex-col">
      {/* Header with Model Select Dropdown */}
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              멀티모달 챗봇 스튜디오
            </h1>
            <p className="text-xs text-slate-400">100% 로컬 VRAM 최적화 비전 이해 추론 엔진</p>
          </div>
        </div>

        {/* Local Model Selector Dropdown */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-indigo-500/40 shadow-xl">
          <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> 보유 모델:
          </span>
          <select
            value={selectedModelFile}
            onChange={(e) => setSelectedModelFile(e.target.value)}
            className="bg-slate-950 text-white text-xs rounded-lg px-3 py-1.5 border border-indigo-500/30 focus:outline-none focus:border-indigo-400 font-mono min-w-[220px] max-w-[320px] truncate"
          >
            {localModels.map((m) => (
              <option key={m.path} value={m.filename} className="bg-slate-900 text-slate-100 font-medium py-1">
                [{m.source}] {m.filename} ({m.size_gb} GB)
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchLocalModels()}
            title="로컬 모델 저장소 재스캔"
            className="p-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-lg transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chat Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 rounded-2xl glass-panel border border-slate-800 space-y-4 mb-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-cyan-600 text-white'}`}>
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            
            <div className={`max-w-[75%] p-3.5 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-indigo-600/30 border border-indigo-500/30 text-white' : 'bg-slate-900 border border-slate-800 text-slate-200'}`}>
              {msg.image && (
                <img src={msg.image} alt="User upload" className="max-w-xs max-h-48 rounded-lg mb-2 border border-slate-700 object-cover" />
              )}
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
            <Sparkles className="w-4 h-4 text-cyan-400" /> Qwen2.5-VL 추론 중...
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 rounded-2xl glass-panel border border-slate-800 flex items-center gap-3">
        <label className="cursor-pointer p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-all">
          <ImageIcon className="w-5 h-5" />
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>

        {selectedImage && (
          <div className="relative shrink-0">
            <img src={selectedImage} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-indigo-500" />
            <button onClick={() => setSelectedImage(null)} className="absolute -top-1 -right-1 bg-rose-600 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center">✕</button>
          </div>
        )}

        <input
          type="text"
          placeholder="이미지에 대해 질문하거나 텍스트 프롬프트를 입력하세요..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder-slate-500 px-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" /> 전송
        </button>
      </form>
    </div>
  );
};
