# 實作計畫：影片去人聲 (Video Vocal Remover)

**功能分支**: `001-video-vocal-remover` | **日期**: 2025-12-25 | **規格**: [specs/001-video-vocal-remover/spec.md](specs/001-video-vocal-remover/spec.md)
**輸入**: 功能規格書

## 摘要

本專案旨在開發一個純前端的靜態網站，允許使用者上傳影片，利用瀏覽器的 WebAssembly 技術（`demucs-web` 與 `ffmpeg.wasm`）在本地分離人聲與伴奏。網站將提供卡拉 OK 預覽模式，支援即時導唱開關與不變速的升降 Key 功能，並允許下載處理後的影片。

## 技術背景 (Technical Context)

**語言/版本**: HTML5, CSS3, JavaScript (ES2022+)
**核心依賴**:
- `demucs-web`: 用於人聲分離 (AI Model)。
- `ffmpeg.wasm 0.11.6`: 用於影片音訊提取與最終合成。
- `coi-serviceworker`: 用於解決 GitHub Pages 上的 SharedArrayBuffer (COOP/COEP) 限制。
- `soundtouchjs` 或類似輕量庫: 用於即時升降 Key (Pitch Shifting) 且不改變速度。
**儲存**: 瀏覽器記憶體 (`Blob`, `File`), 暫存模型於 `IndexedDB` (若庫支援)。
**測試**: `Vitest` (單元/整合測試), 瀏覽器手動測試。
**目標平台**: Desktop Browsers (Chrome/Edge/Firefox), 部署於 GitHub Pages。
**專案類型**: Static Web (Single Page).
**效能目標**: 1分鐘影片處理時間 < 5分鐘 (視 GPU/CPU 而定)。
**限制**: 瀏覽器記憶體限制 (OOM), WebAssembly 支援度。

## 憲章檢查 (Constitution Check)

*GATE: 必須在 Phase 0 研究前通過。*

- [x] **Language First**: 計畫與文件皆使用繁體中文。
- [x] **Keep It Simple**: 使用原生 JS 開發，避免大型框架 (React/Vue) 除非 `demucs-web` 強制要求（研究確認）。
- [x] **Static Web Architecture**: 純靜態，無後端，符合 GitHub Pages 部署要求。
- [x] **Git & Task Discipline**: 將遵循任務追蹤。

## 專案結構 (Project Structure)

### 文件 (此功能)

```text
specs/001-video-vocal-remover/
├── plan.md              # 本檔案
├── research.md          # 技術研究報告
├── data-model.md        # 實體與資料流定義
├── quickstart.md        # 開發快速入門
├── contracts/           # 內部介面定義
└── tasks.md             # 任務清單
```

### 原始碼 (Repository Root)

```text
src/
├── css/
│   └── style.css        # 樣式表
├── js/
│   ├── app.js           # 主程式邏輯 (UI 控制)
│   ├── processor.js     # 影片與音訊處理核心 (Facade)
│   ├── audio-player.js  # 卡拉OK播放器邏輯 (AudioContext, Pitch Shift)
│   └── worker.js        # (Optional) 若處理需移至 Worker
├── index.html           # 主頁面
└── vendor/              # 第三方庫 (若無 CDN 或 npm 建置流程)

tests/
├── unit/
│   └── processor.test.js
└── integration/
    └── flow.test.js

package.json             # 依賴管理與腳本
vite.config.js           # 建置設定 (用於處理 headers 與 dev server)
```

**結構決策**: 採用標準的 Vanilla JS 結構，配合 Vite 進行開發與建置（Vite 對 WASM 與 Worker 支援良好）。

## 複雜度追蹤 (Complexity Tracking)

| 違規項目 | 為何需要 | 拒絕更簡單方案的原因 |
|---|---|---|
| `coi-serviceworker` | `ffmpeg.wasm` 需要 `SharedArrayBuffer` | GitHub Pages 不支援直接設定 COOP/COEP Headers，必須透過 Service Worker hack。 |
| `Phase Vocoder` (Pitch Shift) | 需求要求「變調不變速」 | 單純的 `playbackRate` 會同時改變速度與音高，無法滿足卡拉 OK 需求。 |