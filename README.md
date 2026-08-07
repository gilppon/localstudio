# 🚀 Local AI Studio

> **100% On-Device Multimodal AI Desktop Application**  
> 外部クラウドへの接続なしに、個人PCのGPU/VRAMリソースを活用してテキスト、画像、動画、音声の生成および管理を行う超軽量オンデバイスAIスタジオです。

---

## 📐 システムアーキテクチャ (System Architecture)

Local AI Studioは、**Tauri 2.0 (Rust)**をデスクトップコンテナとして使用し、**React 19**ベースのフロントエンドと**PythonオンデバイスAIエンジン**がリアルタイムでローカル通信を行います。

```mermaid
graph TD
    subgraph Client ["💻 Desktop Client (Tauri 2.0 + React 19)"]
        UI["🎨 React 19 Dashboard UI"]
        Store["⚡ Zustand State Management"]
        VRAM["📊 VRAM / System Profiler Widget"]
        
        UI <--> Store
        UI --> VRAM
    end

    subgraph DesktopNative ["🦀 Tauri Desktop Shell"]
        TauriCore["Tauri 2.0 Core (Rust)"]
        WindowMgr["Native Window & Webview"]
        TauriCore <--> WindowMgr
    end

    subgraph Backend ["🐍 Python AI Engine (Port: Localhost)"]
        API["⚡ FastAPI Server / Router"]
        Orchestrator["🧠 AI Model Orchestrator (orchestrator.py)"]
        Enhancer["✨ Prompt Enhancer (enhancer.py)"]
        Downloader["📥 HuggingFace Model Downloader (downloader.py)"]
        Profiler["🔍 VRAM Profiler (profiler.py)"]

        API --> Orchestrator
        API --> Enhancer
        API --> Downloader
        API --> Profiler
    end

    subgraph Storage ["💾 On-Device Storage & Hardware"]
        Models["📦 Local GGUF / PyTorch Models (/models)"]
        Outputs["🖼️ Generated Media Files (/backend/outputs)"]
        Hardware["⚡ Local GPU (CUDA / DirectML / VRAM)"]
    end

    UI <-->|HTTP / REST API| API
    TauriCore <-->|Process Lifecycle| API
    Orchestrator <--> Models
    Orchestrator --> Hardware
    Orchestrator --> Outputs
```

---

## 🔄 ワークフロー＆データフロー (Data Flow)

ユーザーがプロンプトを入力し、メディアを生成する際の処理フローです。

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 ユーザー
    participant UI as 🎨 React UI (Dashboard)
    participant Enhancer as ✨ Prompt Enhancer
    participant API as 🐍 Python API Engine
    participant Engine as 🧠 Model Orchestrator
    participant Hardware as ⚡ Local GPU / VRAM

    User->>UI: プロンプト入力および生成リクエスト
    alt プロンプト強化オプション有効時
        UI->>Enhancer: プロンプト最適化リクエスト
        Enhancer-->>UI: 強化された詳細プロンプトを返却
    end
    UI->>API: メディア生成API呼び出し (POST /generate)
    API->>Hardware: VRAM確保およびGPUカーネルロード
    API->>Engine: GGUF / PyTorchモデル推論実行
    loop リアルタイムモニタリング
        Engine->>UI: VRAMおよび推論進捗イベント送信
    end
    Engine->>API: 生成結果（画像/動画/音声）を保存
    API-->>UI: メディア結果およびメタデータ返却
    UI-->>User: 画面結果表示および高画質プレビュー
```

---

## ✨ 主な機能 (Key Features)

```mermaid
mindmap
  root((Local AI Studio))
    Text to Image
      Flux.1 GGUF
      Stable Diffusion
      Prompt Enhancer
    Image to Video
      Motion Strength Control
      Frame Interpolation
    Text to Video
      Keyframe Generation
      Camera Motion
    Audio & TTS
      Text to Audio
      Voice Synthesis (TTS)
    Multimodal Chat
      Visual QA
      Document Analysis
    Model Management
      HuggingFace Downloader
      GGUF Precision Selector
      Real-time VRAM Profiler
```

- **🎨 Text-to-Image / Image-to-Video**: Flux.1 GGUFなどの高性能モデルに基づくオンデバイス画像・動画生成。
- **🎙️ Text-to-Audio / TTS**: 高品質な音声合成および効果音生成。
- **💬 Multimodal Chat**: 画像やドキュメントを理解して会話するオンデバイス・ビジュアルAI。
- **✨ Prompt Enhancer**: 短いキーワードを詳細で豊かなプロンプトへ自動拡張。
- **📥 Model Explorer & Auto-Downloader**: HuggingFaceモデルの自動探索および量子化（Q4/Q8）ダウンロード。
- **📊 Real-time VRAM Profiler**: GPUメモリ使用量をリアルタイムチャートでトラッキングし、キャンセルや最適化をサポート。

---

## 🛠️ 技術スタック (Tech Stack)

| レイヤー | 技術スタック | 説明 |
| :--- | :--- | :--- |
| **Desktop Shell** | ![Tauri](https://img.shields.io/badge/Tauri_v2-FFC107?style=flat-square&logo=tauri&logoColor=black) | Rustベースの超軽量クロスプラットフォーム・デスクトップフレームワーク |
| **Frontend** | ![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) | Viteの高速ホットリロードおよびReact 19最新機能の適用 |
| **Styling & State** | ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) ![Zustand](https://img.shields.io/badge/Zustand-443E3E?style=flat-square) | GlassmorphismダークUIデザインおよびグローバル状態管理 |
| **Backend & Engine** | ![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=flat-square&logo=python&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) | ローカルHTTP APIサーバーおよびGGUF / PyTorchモデルオーケストレーター |

---

## 📂 プロジェクト構造 (Directory Structure)

```
local-studio/
├── 📁 src/                   # React 19 フロントエンドソースコード
│   ├── 📁 components/        # 機能別UIタブ (Text2Img, Img2Video, Multimodalなど)
│   ├── 📁 store/             # Zustandベースのグローバル状態管理
│   ├── 📄 App.tsx            # メインダッシュボードレイアウト
│   └── 📄 index.css          # GlassmorphismカスタムCSS & Tailwind
├── 📁 src-tauri/             # Tauri 2.0 Rust デスクトップ設定
│   ├── 📄 tauri.conf.json    # アプリメタデータおよびビルド設定
│   └── 📄 Cargo.toml         # Rust依存パッケージ
├── 📁 backend/               # Python AIオーケストレーションエンジン
│   ├── 📄 main.py            # FastAPIサーバーエンドポイント
│   ├── 📄 orchestrator.py    # AIモデル推論パイプライン
│   ├── 📄 enhancer.py        # プロンプト強化モジュール
│   ├── 📄 downloader.py      # HuggingFaceモデルダウンローダー
│   └── 📄 profiler.py        # VRAMおよびシステムリソースモニター
├── 📁 models/                # ローカルGGUFモデル保存ディレクトリ
└── 📄 package.json           # Node.jsプロジェクト設定
```

---

## 🚀 はじめに (Getting Started)

### 1. 前提条件 (Prerequisites)
- **Node.js**: v18.0.0 以上
- **Python**: v3.10 以上 (PyTorchおよびCUDA環境推奨)
- **Rust**: Tauri v2 ビルド用のRustコンパイラ

### 2. 依存パッケージのインストール (Installation)
```bash
# フロントエンドパッケージのインストール
npm install

# Pythonバックエンド依存関係のインストール
pip install -r backend/requirements.txt
```

### 3. 開発サーバーの起動 (Development)
```bash
# フロントエンドとバックエンドの同時起動
npm run dev

# Tauriデスクトップアプリの起動
npm run tauri dev
```

### 4. プロダクションビルド (Production Build)
```bash
npm run tauri build
```

---

## 📄 ライセンス (License)
本プロジェクトは **MIT License** のもとで公開されています。