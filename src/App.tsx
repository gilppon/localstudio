import React, { useEffect } from 'react';
import { useStudioStore, TabType } from './store/useStudioStore';
import { VramIndicator } from './components/VramIndicator';
import { Dashboard } from './components/Dashboard';
import { ModelExplorerTab } from './components/ModelExplorerTab';
import { MultimodalTab } from './components/MultimodalTab';
import { Text2ImgTab } from './components/Text2ImgTab';
import { Text2VideoTab } from './components/Text2VideoTab';
import { Img2VideoTab } from './components/Img2VideoTab';
import { Text2AudioTab } from './components/Text2AudioTab';
import { TtsTab } from './components/TtsTab';
import { 
  LayoutDashboard, 
  Search,
  Eye, 
  Palette, 
  Film, 
  Wand2, 
  Music, 
  Mic, 
  Zap, 
  Cpu, 
  Activity 
} from 'lucide-react';

export const App: React.FC = () => {
  const { activeTab, setActiveTab, connectWebSocket, fetchVramStatus, vramStatus, wsConnected } = useStudioStore();

  useEffect(() => {
    fetchVramStatus();
    connectWebSocket();
  }, []);

  const navItems: { id: any; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: '대시보드', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'explorer', label: '0. 모델 탐색기', icon: <Search className="w-4 h-4 text-cyan-400" />, badge: 'HF/LM' },
    { id: 'multimodal', label: '1. 멀티모달', icon: <Eye className="w-4 h-4" />, badge: 'VLM/LLM' },
    { id: 'text2img', label: '2. 텍스트-이미지', icon: <Palette className="w-4 h-4" />, badge: 'T2I' },
    { id: 'text2video', label: '3. 텍스트-비디오', icon: <Film className="w-4 h-4" />, badge: 'T2V' },
    { id: 'img2video', label: '4. 이미지-비디오', icon: <Wand2 className="w-4 h-4" />, badge: 'I2V' },
    { id: 'audio', label: '5. 텍스트-오디오', icon: <Music className="w-4 h-4" />, badge: 'Audio' },
    { id: 'tts', label: '6. TTS', icon: <Mic className="w-4 h-4" />, badge: 'TTS' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100">
      {/* Dynamic VRAM Flush Global Loading Indicator */}
      <VramIndicator />

      {/* Left Sidebar */}
      <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Logo & Title */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-cyan-500 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-none">Local AI Studio</h2>
              <span className="text-[10px] text-cyan-400 font-medium">100% On-Device GPU</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${active ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-800 text-slate-400'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Status Panel */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> 백엔드 엔진:
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${wsConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
              {wsConnected ? 'ONLINE' : 'CONNECTING'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-indigo-400" /> VRAM 상주:</span>
            <span className="text-indigo-300 font-mono text-[11px] truncate max-w-[100px]">
              {vramStatus?.allocated_vram_gb || 0} / {vramStatus?.total_vram_gb || 8} GB
            </span>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-y-auto bg-[#0b0f19]">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'explorer' && <ModelExplorerTab />}
        {activeTab === 'multimodal' && <MultimodalTab />}
        {activeTab === 'text2img' && <Text2ImgTab />}
        {activeTab === 'text2video' && <Text2VideoTab />}
        {activeTab === 'img2video' && <Img2VideoTab />}
        {activeTab === 'audio' && <Text2AudioTab />}
        {activeTab === 'tts' && <TtsTab />}
      </main>
    </div>
  );
};
