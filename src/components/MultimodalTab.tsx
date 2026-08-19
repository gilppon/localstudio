import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, Send, Image as ImageIcon, Sparkles, Bot, User, 
  Trash2, Download, Copy, Check, Paperclip, RefreshCw 
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  image?: string;
  timestamp: string;
}

export const MultimodalTab: React.FC = () => {
  const { localModels, fetchLocalModels } = useStudioStore();
  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'bot',
      text: '반갑습니다! Qwen2.5-VL 온디바이스 비전-언어 모델입니다.\n이미지를 첨부하거나 질문을 입력하시면 100% 로컬 VRAM 환경에서 실시간 분석 및 추론을 제공합니다.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLocalModels();
  }, []);

  useEffect(() => {
    if (localModels.length > 0 && !selectedModelFile) {
      setSelectedModelFile(localModels[0].filename);
    }
  }, [localModels]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClearSession = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'bot',
        text: '대화 세션이 초기화되었습니다. 새로운 질문이나 분석할 이미지를 입력해주세요.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleExportMarkdown = () => {
    const lines = messages.map((m) => {
      const role = m.sender === 'user' ? '👤 User' : '🤖 Assistant';
      return `### ${role} (${m.timestamp})\n${m.text}\n`;
    });
    const blob = new Blob([lines.join('\n---\n\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LocalAIStudio_ChatSession_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !selectedImage) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: prompt,
      image: selectedImage || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/multimodal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg.text,
          image_base64: userMsg.image,
          model: selectedModelFile || "Qwen2.5-VL"
        })
      });
      const data = await res.json();
      const replyText = data.reply || (data.detail || '응답을 생성할 수 없습니다.');
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: '백엔드 AI 엔진에 연결할 수 없습니다. 엔진 가동 상태를 점검해주세요.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className="p-6 max-w-5xl mx-auto h-[calc(100vh-5rem)] flex flex-col relative"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-4 z-50 bg-indigo-950/90 border-2 border-dashed border-indigo-400 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
          <ImageIcon className="w-16 h-16 text-indigo-400 animate-bounce mb-2" />
          <p className="text-base font-bold text-white">이미지 파일을 여기에 드롭하여 즉시 분석</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              멀티모달 비전 챗봇 (Qwen2.5-VL)
            </h1>
            <p className="text-xs text-slate-400">100% 온디바이스 VRAM 최적화 멀티턴 비전 이해 추론 엔진</p>
          </div>
        </div>

        {/* Model Selector & Session Actions */}
        <div className="flex items-center gap-2">
          <select
            value={selectedModelFile}
            onChange={(e) => setSelectedModelFile(e.target.value)}
            className="bg-slate-950 text-white text-xs rounded-xl px-3 py-2 border border-indigo-500/30 focus:outline-none focus:border-indigo-400 font-mono min-w-[200px] max-w-[280px] truncate shadow-lg"
          >
            {localModels.length > 0 ? (
              localModels.map((m) => (
                <option key={m.path} value={m.filename} className="bg-slate-900 text-slate-100 font-medium py-1">
                  [{m.source}] {m.filename} ({m.size_gb} GB)
                </option>
              ))
            ) : (
              <option value="">보유 모델 없음 (Qwen2.5-VL 내장)</option>
            )}
          </select>

          <button
            type="button"
            onClick={handleExportMarkdown}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title="대화 내역 마크다운 내보내기"
          >
            <Download className="w-4 h-4 text-indigo-400" />
          </button>

          <button
            type="button"
            onClick={handleClearSession}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-red-400 transition-colors"
            title="대화 세션 초기화"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'bot' && (
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-400 shadow-md">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[78%] space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Attached Image Thumbnail */}
              {msg.image && (
                <div className="rounded-xl overflow-hidden border border-indigo-500/30 shadow-lg max-w-sm">
                  <img src={msg.image} alt="User Upload" className="max-h-60 w-auto object-cover" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed group relative shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-tr from-indigo-600 to-cyan-600 text-white rounded-tr-none'
                    : 'glass-panel bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none font-mono whitespace-pre-wrap'
                }`}
              >
                <div>{msg.text}</div>

                {/* Quick Copy Button */}
                <div className="mt-1.5 flex items-center justify-between text-[10px] opacity-70">
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'bot' && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.text, msg.id)}
                      className="ml-2 text-slate-400 hover:text-white flex items-center gap-0.5"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === msg.id ? '복사됨' : '복사'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-400 shadow-md">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="glass-panel p-3 rounded-2xl border border-slate-800 flex items-center gap-2 text-xs text-indigo-300">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Qwen2.5-VL 온디바이스 신경망 추론 생성 중...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Toolbar & Area */}
      <form onSubmit={handleSubmit} className="shrink-0 space-y-2">
        {selectedImage && (
          <div className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-indigo-500/30 w-fit">
            <img src={selectedImage} alt="Attachment" className="w-10 h-10 object-cover rounded-lg" />
            <span className="text-xs text-slate-300 font-medium">첨부된 이미지 준비됨</span>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="text-slate-400 hover:text-red-400 text-xs ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-xl focus-within:border-indigo-500 transition-colors">
          <label className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors" title="이미지 파일 첨부">
            <Paperclip className="w-4 h-4" />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
              className="hidden"
            />
          </label>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="이미지에 대한 질문을 하거나 텍스트를 입력하세요 (이미지 드래그 앤 드롭 지원)..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-600 focus:outline-none px-2"
          />

          <button
            type="submit"
            disabled={loading || (!prompt.trim() && !selectedImage)}
            className="p-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded-xl shadow-md shadow-indigo-600/30 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
