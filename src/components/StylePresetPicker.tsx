import React, { useState } from 'react';
import { Sparkles, Sliders, Palette, Zap, Layers, Plus, Check } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export interface StylePreset {
  id: string;
  name: string;
  category: string;
  gradient: string;
  promptSuffix: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'cyberpunk',
    name: '사이버펑크 네온',
    category: 'Sci-Fi',
    gradient: 'from-fuchsia-600 to-cyan-500',
    promptSuffix: ', cyberpunk neon aesthetic, glowing holographic UI, futuristic city, cinematic volumetric lighting, 8k octane render'
  },
  {
    id: 'cinematic',
    name: '35mm 시네마틱 필름',
    category: 'Photo',
    gradient: 'from-amber-600 to-rose-600',
    promptSuffix: ', 35mm film photography, photorealistic, cinematic shot, shallow depth of field, dramatic shadows, kodak portra 400'
  },
  {
    id: 'anime',
    name: '신카이 마코토 화풍',
    category: 'Anime',
    gradient: 'from-blue-500 to-emerald-400',
    promptSuffix: ', makoto shinkai aesthetic, vibrant anime artstyle, highly detailed sky and cloud background, studio ghibli lighting, masterpiece'
  },
  {
    id: '3d_render',
    name: '3D 픽사 / 언리얼5',
    category: '3D',
    gradient: 'from-indigo-500 to-purple-600',
    promptSuffix: ', unreal engine 5, octane render, smooth 3d textures, raytracing, highly detailed, pixar style character lighting'
  },
  {
    id: 'oil_painting',
    name: '바로크 클래식 유화',
    category: 'Art',
    gradient: 'from-yellow-700 to-amber-900',
    promptSuffix: ', textured oil painting on canvas, classical baroque lighting, chiaroscuro, expressive thick brushstrokes, fine art masterpiece'
  },
  {
    id: 'synthwave',
    name: '80s 레트로 신스웨이브',
    category: 'Retro',
    gradient: 'from-pink-500 to-purple-600',
    promptSuffix: ', 80s synthwave retro futurism, magenta and cyan neon gradients, retro grid floor, VHS glitch aesthetic, chrome reflections'
  },
  {
    id: 'dark_fantasy',
    name: '다크 판타지 컨셉아트',
    category: 'Fantasy',
    gradient: 'from-slate-700 to-red-950',
    promptSuffix: ', dark fantasy concept art, elden ring atmospheric lighting, epic scale, hyperdetailed gothic castle, ominous mist'
  },
  {
    id: 'isometric',
    name: '아이소메트릭 3D 룸',
    category: '3D',
    gradient: 'from-emerald-500 to-teal-700',
    promptSuffix: ', isometric 3d room diorama, cute miniature, clean clay render, tilt shift photography, soft ambient occlusion'
  },
  {
    id: 'hyperrealism',
    name: '초고화질 스튜디오 인물',
    category: 'Portrait',
    gradient: 'from-orange-500 to-rose-700',
    promptSuffix: ', 8k hyperrealistic studio portrait, detailed skin pores and texture, soft ring light, bokeh background, award winning photography'
  },
  {
    id: 'minimal_vector',
    name: '미니멀 모던 벡터',
    category: 'Vector',
    gradient: 'from-sky-400 to-indigo-600',
    promptSuffix: ', minimalist vector illustration, clean lines, flat harmonious color palette, modern UI graphic art, behance trending'
  }
];

interface StylePresetPickerProps {
  selectedPreset: string | null;
  onSelectPreset: (preset: StylePreset | null) => void;
  onAddLoraTag: (loraTag: string) => void;
}

export const StylePresetPicker: React.FC<StylePresetPickerProps> = ({
  selectedPreset,
  onSelectPreset,
  onAddLoraTag
}) => {
  const { localModels } = useStudioStore();
  const [activeTab, setActiveTab] = useState<'presets' | 'lora'>('presets');
  const [selectedLoraName, setSelectedLoraName] = useState<string>('');
  const [loraWeight, setLoraWeight] = useState<number>(0.8);
  const [customLoraInput, setCustomLoraInput] = useState<string>('');

  // Extract possible LoRA models or use model list
  const loraCandidates = localModels.filter(
    (m) =>
      m.filename.toLowerCase().includes('lora') ||
      m.filename.toLowerCase().endsWith('.safetensors') ||
      m.filename.toLowerCase().endsWith('.gguf')
  );

  const handleApplyLora = () => {
    const name = selectedLoraName || customLoraInput.trim();
    if (!name) return;
    const cleanName = name.replace(/\.[^/.]+$/, ""); // remove extension
    const tag = `<lora:${cleanName}:${loraWeight.toFixed(2)}>`;
    onAddLoraTag(tag);
  };

  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 space-y-3">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Palette className="w-3.5 h-3.5" /> 스타일 프리셋 (10종)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lora')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'lora'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> LoRA 가중치 매니저
          </button>
        </div>

        {selectedPreset && activeTab === 'presets' && (
          <button
            type="button"
            onClick={() => onSelectPreset(null)}
            className="text-[10px] text-slate-400 hover:text-red-400 underline transition-colors"
          >
            프리셋 해제
          </button>
        )}
      </div>

      {/* Preset Chips View */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
          {STYLE_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(isSelected ? null : preset)}
                className={`relative group flex flex-col items-start p-2 rounded-lg text-left transition-all border ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/40 shadow-md shadow-cyan-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                    {preset.category}
                  </span>
                  {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                </div>
                <span className="text-[11px] font-semibold text-slate-200 group-hover:text-white truncate w-full">
                  {preset.name}
                </span>
                <div
                  className={`mt-1.5 h-1 w-full rounded-full bg-gradient-to-r ${preset.gradient} opacity-80 group-hover:opacity-100`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* LoRA Manager View */}
      {activeTab === 'lora' && (
        <div className="space-y-3 p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                로컬 탐색된 LoRA / 모델 가중치
              </label>
              <select
                value={selectedLoraName}
                onChange={(e) => setSelectedLoraName(e.target.value)}
                className="w-full bg-slate-950 text-white text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-purple-400"
              >
                <option value="">-- 로컬 파일에서 선택 --</option>
                {loraCandidates.map((m) => (
                  <option key={m.path} value={m.filename}>
                    {m.filename} ({m.size_gb} GB)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                또는 직접 LoRA 태그명 입력
              </label>
              <input
                type="text"
                value={customLoraInput}
                onChange={(e) => setCustomLoraInput(e.target.value)}
                placeholder="예: korean_face_v2, detail_tweaker"
                className="w-full bg-slate-950 text-white text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Slider & Insert Button */}
          <div className="flex items-center justify-between gap-4 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-medium">LoRA 강도 (Weight)</span>
                <span className="font-mono text-purple-400 font-bold">{loraWeight.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={loraWeight}
                onChange={(e) => setLoraWeight(parseFloat(e.target.value))}
                className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleApplyLora}
              disabled={!selectedLoraName && !customLoraInput.trim()}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-md shadow-purple-600/20 flex items-center gap-1.5 shrink-0 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> LoRA 태그 프롬프트 삽입
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
