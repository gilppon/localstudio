import React, { useState } from 'react';
import { Tag, Sparkles, Search, Plus, Check } from 'lucide-react';

interface TagCategory {
  name: string;
  tags: string[];
}

const TAG_CATEGORIES: TagCategory[] = [
  {
    name: '✨ 디테일 & 퀄리티',
    tags: [
      'masterpiece',
      'ultra-detailed 8k',
      'photorealistic',
      'sharp focus',
      'octane render',
      'unreal engine 5 render',
      'award winning photography',
      'extremely detailed textures'
    ]
  },
  {
    name: '💡 시네마틱 조명',
    tags: [
      'cinematic volumetric lighting',
      'golden hour warm sunlight',
      'dramatic rim light',
      'soft studio softbox',
      'cyberpunk neon glow',
      'bioluminescent particles',
      'chiaroscuro shadows'
    ]
  },
  {
    name: '📐 구도 & 렌즈',
    tags: [
      '35mm film photography',
      'wide angle panoramic shot',
      'macro close up portrait',
      'shallow depth of field bokeh',
      'dynamic action angle',
      'aerial drone perspective',
      'rule of thirds composition'
    ]
  },
  {
    name: '🌌 무드 & 대기 효과',
    tags: [
      'ethereal atmospheric fog',
      'glowing embers in air',
      'cyberpunk rain reflections',
      'holographic UI glimmers',
      'morning misty haze',
      'surreal dreamscape glow'
    ]
  }
];

interface TagAutocompleteProps {
  onSelectTag: (tag: string) => void;
}

export const TagAutocomplete: React.FC<TagAutocompleteProps> = ({ onSelectTag }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [lastAddedTag, setLastAddedTag] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTagClick = (tag: string) => {
    onSelectTag(tag);
    setLastAddedTag(tag);
    setTimeout(() => setLastAddedTag(null), 1200);
  };

  const filteredCategories = TAG_CATEGORIES.map((cat) => ({
    name: cat.name,
    tags: cat.tags.filter((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
  })).filter((cat) => cat.tags.length > 0);

  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
          <Tag className="w-3.5 h-3.5" />
          <span>전문가 프롬프트 태그 자동완성</span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors"
        >
          {isExpanded ? '접기 ▲' : '태그 목록 펼치기 ▼'}
        </button>
      </div>

      {/* Quick Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isExpanded) setIsExpanded(true);
          }}
          placeholder="태그 검색 (예: light, 8k, bokeh)..."
          className="w-full bg-slate-950 text-white text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
        />
      </div>

      {/* Tag Badges Grid */}
      {isExpanded && (
        <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
          {filteredCategories.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <span className="text-[10px] font-medium text-slate-400 font-mono">
                {cat.name}
              </span>
              <div className="flex flex-wrap gap-1">
                {cat.tags.map((tag) => {
                  const wasJustAdded = lastAddedTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagClick(tag)}
                      className={`group inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all border ${
                        wasJustAdded
                          ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 scale-95'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-500/50 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      {wasJustAdded ? (
                        <Check className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <Plus className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                      )}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
