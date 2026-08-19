import React, { useState, useEffect, useRef } from 'react';
import { 
  Brush, Eraser, RotateCcw, Sparkles, Download, RefreshCw, 
  Image as ImageIcon, History, ShieldCheck, Undo, Eye,
  Paintbrush, FlipHorizontal
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const InpaintingTab: React.FC = () => {
  const { localModels, fetchLocalModels, setActiveTab } = useStudioStore();
  const [selectedModelFile, setSelectedModelFile] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Replace with a glowing cybernetic neon implant on the shoulder');
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, deformed, artifact');
  const [brushSize, setBrushSize] = useState<number>(30);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);

  useEffect(() => {
    fetchLocalModels();
  }, []);

  useEffect(() => {
    if (localModels.length > 0 && !selectedModelFile) {
      setSelectedModelFile(localModels[0].filename);
    }
  }, [localModels]);

  // Load and render image to canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = image;
  }, [image]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return;
    isDrawingRef.current = true;
    draw(e);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isEraser) {
      // Restore original image pixels under eraser
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      };
      img.src = image!;
    } else {
      // Draw translucent neon mask overlay
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)'; // Pink translucent mask
      ctx.fillStyle = 'rgba(236, 72, 153, 0.7)';
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const clearMask = () => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = image;
  };

  const exportMaskBase64 = (): string => {
    if (!canvasRef.current || !image) return '';
    // Create an offscreen binary mask canvas (white where masked, black elsewhere)
    const canvas = canvasRef.current;
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return '';

    // Fill black
    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Read current canvas pixels and extract non-original/pink mask areas
    const currentData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
    if (currentData) {
      const maskData = maskCtx.createImageData(canvas.width, canvas.height);
      for (let i = 0; i < currentData.data.length; i += 4) {
        const r = currentData.data[i];
        const g = currentData.data[i + 1];
        const b = currentData.data[i + 2];
        // If has strong pink mask signature
        if (r > 180 && b > 100 && g < 150) {
          maskData.data[i] = 255;
          maskData.data[i + 1] = 255;
          maskData.data[i + 2] = 255;
          maskData.data[i + 3] = 255;
        } else {
          maskData.data[i] = 0;
          maskData.data[i + 1] = 0;
          maskData.data[i + 2] = 0;
          maskData.data[i + 3] = 255;
        }
      }
      maskCtx.putImageData(maskData, 0, 0);
    }

    return maskCanvas.toDataURL('image/png');
  };

  const handleGenerateInpaint = async () => {
    if (!image || !prompt.trim() || loading) return;
    setLoading(true);
    setErrorMsg(null);
    setResultImage(null);

    const maskBase64 = exportMaskBase64();

    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate/inpaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: image,
          mask_base64: maskBase64 || image,
          prompt,
          negative_prompt: negativePrompt,
          model: selectedModelFile || "FLUX.1-Inpaint"
        })
      });
      const data = await res.json();
      if (res.ok && data.image_url) {
        setResultImage(data.image_url);
      } else {
        setErrorMsg(data.detail || '인페인팅 생성에 실패했습니다.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('백엔드 서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with Model Select Dropdown */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Brush className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              캔버스 인페인팅 & 마스킹 스튜디오 (Inpainting)
            </h1>
            <p className="text-xs text-slate-400">
              이미지 위 원하는 영역을 브러시로 칠하고 프롬프트로 부분 수정 및 오브젝트 교체
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-pink-500/40 shadow-xl">
          <span className="text-xs font-semibold text-pink-300 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" /> 보유 인페인팅 모델:
          </span>
          <select
            value={selectedModelFile}
            onChange={(e) => setSelectedModelFile(e.target.value)}
            className="bg-slate-950 text-white text-xs rounded-lg px-3 py-1.5 border border-pink-500/30 focus:outline-none focus:border-pink-400 font-mono min-w-[220px] max-w-[320px] truncate"
          >
            {localModels.length > 0 ? (
              localModels.map((m) => (
                <option key={m.path} value={m.filename} className="bg-slate-900 text-slate-100 font-medium py-1">
                  [{m.source}] {m.filename} ({m.size_gb} GB)
                </option>
              ))
            ) : (
              <option value="">보유 모델 없음 (FLUX.1-Inpaint 기본 내장)</option>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Settings Panel (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl glass-panel border border-slate-800 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">1. 원본 이미지 불러오기</label>
            <label className="flex flex-col items-center justify-center h-28 bg-slate-950/80 border border-dashed border-slate-700 hover:border-pink-500 rounded-xl cursor-pointer transition-all overflow-hidden relative group">
              <div className="text-center text-slate-400 space-y-1 p-2">
                <ImageIcon className="w-7 h-7 stroke-1 mx-auto text-pink-400" />
                <span className="text-[11px] font-medium">{image ? '새 이미지로 교체하기' : '클릭하여 이미지 업로드'}</span>
              </div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          {/* Brush Tools */}
          <div className="p-3 bg-pink-950/30 rounded-xl border border-pink-500/30 space-y-3">
            <span className="text-xs font-semibold text-pink-300 flex items-center gap-1">
              <Paintbrush className="w-3.5 h-3.5 text-pink-400" /> 2. 마스크 브러시 도구
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsEraser(false)}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                  !isEraser
                    ? 'bg-pink-600 text-white border-pink-400 shadow-md shadow-pink-600/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Brush className="w-3.5 h-3.5" /> 브러시 (마스크)
              </button>

              <button
                type="button"
                onClick={() => setIsEraser(true)}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                  isEraser
                    ? 'bg-pink-600 text-white border-pink-400 shadow-md shadow-pink-600/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" /> 지우개
              </button>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>브러시 크기 (Radius)</span>
                <span className="text-pink-400 font-mono font-bold">{brushSize}px</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full accent-pink-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={clearMask}
              className="w-full py-1.5 text-[11px] text-slate-400 hover:text-red-400 bg-slate-900/60 hover:bg-slate-900 rounded-lg border border-slate-800 transition-colors flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> 마스크 전체 초기화
            </button>
          </div>

          {/* Inpaint Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">3. 부분 교체 프롬프트</label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500 resize-none font-mono"
              placeholder="마스크 영역에 새로 생성할 피사체를 설명하세요..."
            />
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleGenerateInpaint}
            disabled={loading || !image || !prompt.trim()}
            className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>인페인팅 신경망 생성 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>인페인팅 영역 생성 시작</span>
              </>
            )}
          </button>
        </div>

        {/* Right Canvas: Mask Drawing & Result Viewer (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
          {errorMsg && (
            <div className="w-full max-w-md p-4 mb-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center space-y-1">
              <p className="font-bold">⚠️ 인페인팅 생성 안내</p>
              <p>{errorMsg}</p>
            </div>
          )}

          {resultImage ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              <div className="relative max-h-[460px] w-full rounded-2xl overflow-hidden border border-pink-500/40 shadow-2xl flex items-center justify-center bg-black">
                <img src={resultImage} alt="Inpainted Result" className="max-h-[440px] w-auto object-contain rounded-xl" />
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={resultImage}
                  download="LocalAIStudio_Inpaint.png"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 shadow-md transition-colors"
                >
                  <Download className="w-4 h-4 text-pink-400" /> 결과 PNG 다운로드
                </a>

                <button
                  type="button"
                  onClick={() => setResultImage(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <Undo className="w-4 h-4 text-pink-400" /> 다시 마스킹 수정하기
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('gallery')}
                  className="px-4 py-2 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-purple-500/30 transition-colors"
                >
                  <History className="w-4 h-4 text-purple-400" /> 히스토리 갤러리 →
                </button>
              </div>
            </div>
          ) : image ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              <div className="relative rounded-2xl overflow-hidden border-2 border-pink-500/40 shadow-2xl bg-black flex items-center justify-center max-w-full">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onMouseMove={draw}
                  className="max-h-[440px] w-auto object-contain cursor-crosshair"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-pink-300 font-mono border border-pink-500/30">
                  🖌️ 마우스로 수정할 영역을 드래그하여 칠하세요
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-3">
              <Brush className="w-14 h-14 stroke-[1.2] text-slate-600 mx-auto animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-slate-400">캔버스 마스크 기반 AI 인페인팅</p>
                <p className="text-xs text-slate-500 mt-1">
                  이미지를 업로드한 후 마스크를 칠하고 원하는 프롬프트로 변환하세요.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
