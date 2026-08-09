import { create } from 'zustand';

export type TabType = 'dashboard' | 'explorer' | 'multimodal' | 'text2img' | 'text2video' | 'img2video' | 'audio' | 'tts';

export interface VramStatus {
  gpu_name: string;
  total_vram_gb: number;
  total_ram_gb: number;
  allocated_vram_gb: number;
  reserved_vram_gb: number;
  current_model: string;
  profile_tier: string;
  recommended_models?: {
    vlm?: string;
    t2i?: string;
    video?: string;
    audio?: string;
    tts?: string;
  };
}

export interface DownloadProgress {
  filename: string;
  downloaded_bytes: number;
  total_bytes: number;
  progress_percent: number;
  speed_mbps: number;
  status: 'downloading' | 'completed' | 'failed';
}

export interface LocalModel {
  filename: string;
  path: string;
  size_gb: number;
  source: string;
}

interface StudioState {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  vramStatus: VramStatus | null;
  isVramFlushing: boolean;
  vramFlushDetail: string;
  downloads: Record<string, DownloadProgress>;
  localModels: LocalModel[];
  wsConnected: boolean;
  
  // Actions
  fetchVramStatus: () => Promise<void>;
  fetchLocalModels: () => Promise<void>;
  forceVramFlush: () => Promise<void>;
  connectWebSocket: () => void;
  setVramFlushing: (flushing: boolean, detail?: string) => void;
}

const BACKEND_URL = 'http://127.0.0.1:8000';
const WS_URL = 'ws://127.0.0.1:8000/ws';

export const useStudioStore = create<StudioState>((set, get) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  vramStatus: null,
  isVramFlushing: false,
  vramFlushDetail: '',
  downloads: {},
  localModels: [],
  wsConnected: false,

  fetchVramStatus: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/vram/status`);
      if (res.ok) {
        const data: VramStatus = await res.json();
        set({ vramStatus: data, wsConnected: true });
      } else {
        set({ wsConnected: false });
      }
    } catch (err) {
      // Quiet fail if backend is not started yet
      set({ wsConnected: false });
    }
  },

  fetchLocalModels: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/models/local-list`);
      if (res.ok) {
        const data: LocalModel[] = await res.json();
        set({ localModels: data });
      }
    } catch (err) {
      console.warn("Local models fetch pending:", err);
    }
  },

  forceVramFlush: async () => {
    set({ isVramFlushing: true, vramFlushDetail: '사용자 요청에 의해 VRAM 언로드(Flush) 진행 중...' });
    try {
      await fetch(`${BACKEND_URL}/api/vram/flush`, { method: 'POST' });
      await get().fetchVramStatus();
    } catch (err) {
      console.error("Flush failed:", err);
    } finally {
      setTimeout(() => set({ isVramFlushing: false, vramFlushDetail: '' }), 1000);
    }
  },

  setVramFlushing: (flushing, detail = '') => {
    set({ isVramFlushing: flushing, vramFlushDetail: detail });
  },

  connectWebSocket: () => {
    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        set({ wsConnected: true });
        console.log("⚡ VRAM Orchestrator WebSocket 연결 성공");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.status === 'flushing') {
            set({ isVramFlushing: true, vramFlushDetail: payload.detail || 'VRAM 메모리 교체 중...' });
          } else if (payload.status === 'loading') {
            set({ isVramFlushing: true, vramFlushDetail: payload.detail || '신규 모델 VRAM 로딩 중...' });
          } else if (payload.status === 'ready' || payload.status === 'idle') {
            set({ isVramFlushing: false, vramFlushDetail: '' });
            get().fetchVramStatus();
          }

          if (payload.type === 'download_progress') {
            const dlData: DownloadProgress = payload.data;
            set((state) => ({
              downloads: {
                ...state.downloads,
                [dlData.filename]: dlData
              }
            }));
          }
        } catch (e) {
          // Ignore
        }
      };

      ws.onerror = () => {
        set({ wsConnected: false });
      };

      ws.onclose = () => {
        set({ wsConnected: false });
        // Retry connection every 10s quietly to avoid browser console spam
        setTimeout(() => {
          if (!get().wsConnected) {
            get().connectWebSocket();
          }
        }, 10000);
      };
    } catch (e) {
      set({ wsConnected: false });
    }
  }
}));
