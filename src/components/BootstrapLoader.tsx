import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface SetupProgress {
  percent: number;
  speed_mbps: number;
  status: string;
}

interface BootstrapLoaderProps {
  onComplete: () => void;
}

export const BootstrapLoader: React.FC<BootstrapLoaderProps> = ({ onComplete }) => {
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState<SetupProgress>({
    percent: 0,
    speed_mbps: 0,
    status: "AI 엔진 설치 준비 완료. 시작하려면 버튼을 누르십시오.",
  });
  const [error, setError] = useState<string | null>(null);

  const isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const startSetup = async () => {
    setError(null);
    setStarted(true);
    if (!isTauriEnv) {
      // 웹 브라우저 환경에서는 시뮬레이션 및 안내
      setTimeout(() => {
        setProgress({
          percent: 100,
          speed_mbps: 0,
          status: "COMPLETED"
        });
        setTimeout(onComplete, 800);
      }, 1500);
      return;
    }

    try {
      // Tauri Core에 백엔드 다운로드 빌드 프로세스 기동 요청
      await invoke("start_bootstrap_setup");
    } catch (err: any) {
      setError(err?.toString() || "설치 시작 중 알 수 없는 에러가 발생했습니다.");
      setStarted(false);
    }
  };

  useEffect(() => {
    if (!isTauriEnv) return;

    // 백그라운드 스레드의 다운로드 프로그레스 이벤트를 청취
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlisten = await listen<SetupProgress>("setup_progress", (event) => {
          const payload = event.payload;
          setProgress(payload);

          if (payload.status.startsWith("FAILED:")) {
            setError(payload.status.replace("FAILED:", "").trim());
            setStarted(false);
          } else if (payload.status === "COMPLETED") {
            // 설치 성공 시 부모 대시보드 컴포넌트로 완료 콜백 전송
            setTimeout(() => {
              onComplete();
            }, 1000);
          }
        });
      } catch (e) {
        console.warn("Tauri listener registration skipped in web mode:", e);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [onComplete, isTauriEnv]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* 몽환적인 백그라운드 네온 그라데이션 블러 */}
      <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-600/20 blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse delay-1000"></div>

      {/* 메인 Glassmorphism 카드 */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        {/* 헤더 */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a9 9 0 1116.5 0" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-50">Local AI Studio 엔진 셋업</h2>
          <p className="mt-2 text-sm text-slate-400">
            100% 온디바이스 AI 구동을 위해 1회성 파이썬 실행 라이브러리 패키지를 다운로드합니다.
          </p>
        </div>

        {/* 바디 / 진행률 */}
        <div className="space-y-6">
          {!started ? (
            <div className="flex flex-col items-center justify-center py-4">
              {error && (
                <div className="mb-4 w-full rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  ⚠️ 오류: {error}
                </div>
              )}
              <button
                onClick={startSetup}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 py-3.5 font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>AI 엔진 자동 설치 시작</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 transition-transform group-hover:translate-x-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
              <span className="mt-3 text-xs text-slate-500">인터넷 연결 상태에 따라 약 1~3분이 소요됩니다.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 프로그레스 바 컨테이너 */}
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 shadow-[0_0_12px_rgba(34,211,238,0.5)] transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                ></div>
              </div>

              {/* 속도 및 퍼센트 데이터 */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-cyan-400">{progress.percent.toFixed(1)}% 완료됨</span>
                {progress.speed_mbps > 0 && (
                  <span className="font-mono">{progress.speed_mbps.toFixed(1)} MB/s</span>
                )}
              </div>

              {/* 현재 진행 상태 문구 */}
              <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800/40">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300 font-mono break-all">
                    {progress.status}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 스펙 가이드 */}
        <div className="mt-8 border-t border-slate-800/60 pt-4 text-center text-xs text-slate-500">
          Local AI Studio &copy; 2026. NVIDIA CUDA 12.x / CPU OpenMP 가속 지원
        </div>
      </div>
    </div>
  );
};
