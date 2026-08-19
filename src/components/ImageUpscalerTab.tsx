import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, Sparkles, Download, RefreshCw, Sliders, 
  Image as ImageIcon, History, ShieldCheck, Maximize2,
  Layers, UserCheck, SplitSquareVertical
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const ImageUpscalerTab: React.FC = () => {
  const { localModels, fetchLocalModels, setActiveTab } = useStudioStore();
  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [origDimensions, setOrigDimensions] = useState<{ w: number; h: number } | null>(null);
  const [scaleFactor, setScaleFactor] = useState<2 | 4>(4);
  const [faceRestore, setFaceRestore] = useState<boolean>(true);
  const [upscaledUrl, setUpscaledUrl] = useState<string | null>(null);
  const [upscaledDimensions, setUpscaledDimensions] = useState<{ w: number; h: number } | null>(null);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

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
        const dataUrl = reader.result as string;
        setImage(dataUrl);
        setUpscaledUrl(null);
        setUpscaledDimensions(null);
        
        // Measure original dimensions
        const img = new Image();
        img.onload = () => {
          setOrigDimensions({ w: img.width, h: img.height });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpscale = async () => {
    if (!image || loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: image,
          scale_factor: scaleFactor,
          face_restore: faceRestore,
          model: selectedModelFile || "Real-ESRGAN-4x"
        })
      });
      const data = await res.json();
      if (res.ok && data.image_url) {
        setUpscaledUrl(data.image_url);
        setUpscaledDimensions({
          w: data.target_width || (origDimensions?.w || 512) * scaleFactor,
          h: data.target_height || (origDimensions?.h || 512) * scaleFactor
        });
      } else {
        setErrorMsg(data.detail || '업스케일 처리에 실패했습니다.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('백엔드 서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !isDraggingSlider) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPos(percent);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || !isDraggingSlider) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPos(percent);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with Model Select Dropdown */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <ZoomIn className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              AI 초고해상도 업스케일러 & 화질 복원 (Real-ESRGAN)
            </h1>
            <p className="text-xs text-slate-400">
              저해상도 이미지 2x / 4x 초고화질 복원 & 실시간 Before/After 스플릿 비교
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-teal-500/40 shadow-xl">
          <span className="text-xs font-semibold text-teal-300 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" /> 보유 업스케일러:
          </span>
          <select
            value={selectedModelFile}
            onChange={(e) => setSelectedModelFile(e.target.value)}
            className="bg-slate-950 text-white text-xs rounded-lg px-3 py-1.5 border border-teal-500/30 focus:outline-none focus:border-teal-400 font-mono min-w-[220px] max-w-[320px] truncate"
          >
            {localModels.length > 0 ? (
              localModels.map((m) => (
                <option key={m.path} value={m.filename} className="bg-slate-900 text-slate-100 font-medium py-1">
                  [{m.source}] {m.filename} ({m.size_gb} GB)
                </option>
              ))
            ) : (
              <option value="">보유 모델 없음 (Real-ESRGAN-4x 기본 내장)</option>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Panel (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl glass-panel border border-slate-800 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">원본 이미지 업로드</label>
            <label className="flex flex-col items-center justify-center h-40 bg-slate-950/80 border border-dashed border-slate-700 hover:border-teal-500 rounded-xl cursor-pointer transition-all overflow-hidden relative group">
              {image ? (
                <>
                  <img src={image} alt="Original" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white font-semibold">
                    다른 이미지로 변경
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-400 space-y-2 p-4">
                  <ImageIcon className="w-9 h-9 stroke-1 mx-auto text-teal-400 animate-pulse" />
                  <span className="text-xs font-medium">클릭하여 이미지 파일 선택 (PNG, JPG)</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {origDimensions && (
              <div className="mt-2 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>원본 해상도:</span>
                <span className="text-teal-300 font-bold">{origDimensions.w} x {origDimensions.h} px</span>
              </div>
            )}
          </div>

          {/* Scale Multiplier Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">업스케일 배율 (Scale Factor)</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScaleFactor(2)}
                className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${
                  scaleFactor === 2
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500 shadow-md shadow-teal-500/10'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                2x 업스케일 (Fast)
              </button>

              <button
                type="button"
                onClick={() => setScaleFactor(4)}
                className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${
                  scaleFactor === 4
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500 shadow-md shadow-teal-500/10'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                4x 초고화질 (Ultra 4K)
              </button>
            </div>
          </div>

          {/* Enhancement Options */}
          <div className="p-3 bg-teal-950/30 rounded-xl border border-teal-500/30 space-y-2 text-xs">
            <span className="font-semibold text-teal-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" /> AI 신경망 후처리 복원
            </span>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-slate-200">✨ 인물 얼굴 디테일 복원 (Face Restore)</span>
              <input
                type="checkbox"
                checked={faceRestore}
                onChange={(e) => setFaceRestore(e.target.checked)}
                className="w-4 h-4 accent-teal-500"
              />
            </label>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleUpscale}
            disabled={loading || !image}
            className="w-full py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI 신경망 초고해상도 렌더링 중...</span>
              </>
            ) : (
              <>
                <ZoomIn className="w-4 h-4" />
                <span>{scaleFactor}x 초고해상도 업스케일 시작</span>
              </>
            )}
          </button>
        </div>

        {/* Right Canvas: Interactive Before/After Split Slider (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
          {errorMsg && (
            <div className="w-full max-w-md p-4 mb-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center space-y-1">
              <p className="font-bold">⚠️ 업스케일 처리 안내</p>
              <p>{errorMsg}</p>
            </div>
          )}

          {upscaledUrl && image ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              {/* Split Slider Canvas Container */}
              <div
                ref={containerRef}
                onMouseDown={() => setIsDraggingSlider(true)}
                onMouseUp={() => setIsDraggingSlider(false)}
                onMouseLeave={() => setIsDraggingSlider(false)}
                onMouseMove={handleMouseMove}
                onTouchStart={() => setIsDraggingSlider(true)}
                onTouchEnd={() => setIsDraggingSlider(false)}
                onTouchMove={handleTouchMove}
                className="relative max-h-[460px] w-full aspect-video rounded-2xl overflow-hidden border border-teal-500/40 shadow-2xl bg-black cursor-ew-resize select-none"
              >
                {/* Right/Background Layer: Upscaled Result */}
                <img
                  src={upscaledUrl}
                  alt="Upscaled"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />

                {/* Left/Foreground Layer: Original Image Clipped */}
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={image}
                    alt="Original"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none max-w-none"
                    style={{ width: containerRef.current?.clientWidth || '100%' }}
                  />
                </div>

                {/* Split Divider Handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(20,184,166,0.8)] pointer-events-none flex items-center justify-center"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-teal-400 flex items-center justify-center shadow-lg text-teal-300">
                    <SplitSquareVertical className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-slate-300 font-mono border border-slate-700">
                  ◀ 원본 ({origDimensions?.w}x{origDimensions?.h})
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-teal-950/80 backdrop-blur-md text-[10px] text-teal-300 font-mono border border-teal-500/40">
                  AI 업스케일 ({upscaledDimensions?.w}x{upscaledDimensions?.h}) ▶
                </div>
              </div>

              {/* Action Buttons & Resolution Summary */}
              <div className="flex flex-wrap items-center justify-between w-full gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold font-mono">
                    <ShieldCheck className="w-4 h-4" /> 
                    {scaleFactor}x 업스케일 완료 ({origDimensions?.w}x{origDimensions?.h} ➔ {upscaledDimensions?.w}x{upscaledDimensions?.h})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={upscaledUrl}
                    download={`LocalAIStudio_Upscale_${scaleFactor}x.png`}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 shadow-md transition-colors"
                  >
                    <Download className="w-4 h-4 text-teal-400" /> 고해상도 PNG 다운로드
                  </a>

                  <button
                    type="button"
                    onClick={() => setActiveTab('gallery')}
                    className="px-4 py-2 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-purple-500/30 transition-colors"
                  >
                    <History className="w-4 h-4 text-purple-400" /> 히스토리 갤러리 →
                  </button>
                </div>
              </div>
            </div>
          ) : image ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              <div className="relative max-h-[420px] w-full rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center bg-black">
                <img src={image} alt="Ready" className="max-h-[400px] w-auto object-contain" />
              </div>
              <p className="text-xs text-slate-400">좌측 옵션을 확인한 후 '업스케일 시작' 버튼을 누르세요.</p>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-3">
              <ZoomIn className="w-14 h-14 stroke-[1.2] text-slate-600 mx-auto animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-slate-400">AI 초고해상도 화질 복원</p>
                <p className="text-xs text-slate-500 mt-1">
                  업스케일할 이미지를 업로드하고 실시간 Before/After 화질을 확인하세요.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
