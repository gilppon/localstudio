import { create } from 'zustand';

export type TabType = 'dashboard' | 'explorer' | 'multimodal' | 'text2img' | 'text2video' | 'img2video' | 'audio' | 'tts' | 'upscaler' | 'inpainting' | 'batch' | 'benchmark' | 'gallery';

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

export interface GenerationProgress {
  task_id: string;
  task_type: string;
  step: number;
  total_steps: number;
  percent: number;
  latent_preview?: string; // data:image/jpeg;base64,...
  is_generating: boolean;
  error?: string;
}

export interface HistoryEntry {
  id: number;
  task_type: string;
  prompt: string;
  negative_prompt?: string;
  width: number;
  height: number;
  seed: number;
  steps: number;
  cfg: number;
  model_name: string;
  image_url: string;
  thumbnail_url: string;
  is_favorite: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export interface RecalledT2iParams {
  prompt: string;
  negative_prompt?: string;
  width: number;
  height: number;
  seed: number;
  steps: number;
  cfg: number;
  model: string;
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
  
  // Real-time Generation state
  generationProgress: GenerationProgress | null;
  recalledParams: RecalledT2iParams | null;
  
  // History Gallery state
  historyEntries: HistoryEntry[];
  isHistoryLoading: boolean;

  // Actions
  fetchVramStatus: () => Promise<void>;
  fetchLocalModels: () => Promise<void>;
  forceVramFlush: () => Promise<void>;
  connectWebSocket: () => void;
  setVramFlushing: (flushing: boolean, detail?: string) => void;
  
  // Generation & Cancel Actions
  setGenerationProgress: (progress: GenerationProgress | null) => void;
  cancelGeneration: () => Promise<void>;
  recallT2iParams: (entry: HistoryEntry) => void;
  clearRecalledParams: () => void;

  // Gallery Actions
  fetchHistory: (params?: { task_type?: string; only_favorites?: boolean; search?: string }) => Promise<void>;
  toggleHistoryFavorite: (id: number) => Promise<void>;
  deleteHistoryItem: (id: number) => Promise<void>;
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

  generationProgress: null,
  recalledParams: null,
  historyEntries: [],
  isHistoryLoading: false,

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

  setGenerationProgress: (progress) => {
    set({ generationProgress: progress });
  },

  cancelGeneration: async () => {
    try {
      await fetch(`${BACKEND_URL}/api/generate/cancel`, { method: 'POST' });
      set({
        generationProgress: null,
        isVramFlushing: false
      });
      await get().fetchVramStatus();
    } catch (err) {
      console.error("Cancel generation failed:", err);
    }
  },

  recallT2iParams: (entry: HistoryEntry) => {
    set({
      recalledParams: {
        prompt: entry.prompt,
        negative_prompt: entry.negative_prompt || '',
        width: entry.width || 1024,
        height: entry.height || 1024,
        seed: entry.seed || 42,
        steps: entry.steps || 20,
        cfg: entry.cfg || 7.0,
        model: entry.model_name || 'FLUX.1-schnell'
      },
      activeTab: 'text2img'
    });
  },

  clearRecalledParams: () => {
    set({ recalledParams: null });
  },

  fetchHistory: async (params = {}) => {
    set({ isHistoryLoading: true });
    try {
      const query = new URLSearchParams();
      if (params.task_type) query.append('task_type', params.task_type);
      if (params.only_favorites) query.append('only_favorites', 'true');
      if (params.search) query.append('search', params.search);

      const res = await fetch(`${BACKEND_URL}/api/history?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        set({ historyEntries: data.entries || [] });
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      set({ isHistoryLoading: false });
    }
  },

  toggleHistoryFavorite: async (id: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/history/${id}/favorite`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        set((state) => ({
          historyEntries: state.historyEntries.map((e) =>
            e.id === id ? { ...e, is_favorite: data.is_favorite } : e
          )
        }));
      }
    } catch (err) {
      console.error("Toggle favorite failed:", err);
    }
  },

  deleteHistoryItem: async (id: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set((state) => ({
          historyEntries: state.historyEntries.filter((e) => e.id !== id)
        }));
      }
    } catch (err) {
      console.error("Delete history item failed:", err);
    }
  },

  connectWebSocket: () => {
    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        set({ wsConnected: true });
        console.log("⚡ VRAM Orchestrator & Live Latent Stream WebSocket 연결 성공");
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

          // Real-time Latent & Generation Progress
          if (payload.type === 'generation_started') {
            set({
              generationProgress: {
                task_id: payload.task_id,
                task_type: payload.task_type,
                step: 0,
                total_steps: 20,
                percent: 0,
                is_generating: true
              }
            });
          } else if (payload.type === 'generation_progress') {
            const pdata = payload.data || {};
            set((state) => ({
              generationProgress: {
                task_id: payload.task_id,
                task_type: payload.task_type,
                step: pdata.step || state.generationProgress?.step || 0,
                total_steps: pdata.total_steps || state.generationProgress?.total_steps || 20,
                percent: pdata.percent !== undefined ? pdata.percent : (state.generationProgress?.percent || 0),
                latent_preview: pdata.preview_b64 || state.generationProgress?.latent_preview,
                is_generating: true
              }
            }));
          } else if (payload.type === 'generation_completed') {
            set({ generationProgress: null });
            get().fetchHistory();
            get().fetchVramStatus();
          } else if (payload.type === 'generation_failed' || payload.status === 'cancelled') {
            set({ generationProgress: null });
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
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        set({ wsConnected: false });
      };

      ws.onclose = () => {
        set({ wsConnected: false });
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
