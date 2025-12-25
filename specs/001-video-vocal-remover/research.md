# 研究報告：影片去人聲技術堆疊

**功能分支**: `001-video-vocal-remover` | **狀態**: 已完成

## 決策摘要

1.  **音訊分離**: 使用 `demucs-web` (基於 ONNX Runtime Web)。
2.  **媒體處理**: 使用 `ffmpeg.wasm 0.11.6` 處理影片分離與合併。
3.  **跨源隔離**: 使用 `coi-serviceworker` 解決 GitHub Pages 上的 SharedArrayBuffer 限制。
4.  **變調處理**: 使用 `Jungle` (基於 Web Audio API 的 Pitch Shifter) 或類似輕量實作。
5.  **開發工具**: 使用 `Vite` 作為開發伺服器與打包工具。

## 研究細節

### 1. `ffmpeg.wasm` 在 GitHub Pages 的運作
-   **問題**: `ffmpeg.wasm` (多執行緒版) 需要 `SharedArrayBuffer`，這要求伺服器發送 `Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: require-corp`。GitHub Pages 不支援自訂 Headers。
-   **解決方案**: 使用 `coi-serviceworker`。這是一個輕量級腳本，會在客戶端註冊一個 Service Worker 來攔截請求並補上這些 Headers。
-   **驗證**: 已在多個類似專案中驗證可行。

### 2. `demucs-web` 整合
-   **依賴**: 該套件通常依賴 `onnxruntime-web`。
-   **模型載入**: 模型檔案較大 (數十 MB)，需確保透過 CDN 載入或在首次載入後快取 (Cache API)。
-   **記憶體**: Demucs 推論極耗記憶體。需監控 `performance.memory` (Chrome only) 或透過 `try-catch` 捕捉 OOM 錯誤，並提示使用者關閉其他分頁。

### 3. 即時升降 Key (Pitch Shifting)
-   **需求**: 改變音高 (Pitch) 但不改變速度 (Tempo)。
-   **原生 API**: `AudioBufferSourceNode.detune` 會同時改變速度。
-   **方案**: 需使用 Time-Stretching / Pitch-Shifting 演算法。
    -   **SoundTouchJS**: 經典庫，但在 JS 中可能有效能問題。
    -   **Phase Vocoder (Web Audio)**: 可透過 ScriptProcessorNode 或 AudioWorklet 實作。
    -   **推薦**: 使用 `soundtouchjs` 或尋找基於 AudioWorklet 的輕量實作（如 `jungle.js` 的現代化分支），以避免主執行緒卡頓。考慮到「預覽」的即時性，AudioWorklet 是最佳選擇。

### 4. 檔案大小處理
-   **限制**: 瀏覽器記憶體。
-   **策略**: 不設定硬性上限，但實作 Chunk 處理（如果 `demucs-web` 支援串流處理）。若不支援串流，則需載入完整音訊至 Buffer，這將限制影片長度（約 5-10 分鐘為安全範圍）。

## 待辦事項 (轉入 Tasks)
- [ ] 設置 `coi-serviceworker` 於 `index.html` 與 `public/`。
- [ ] 驗證 `demucs-web` 的基本運作與模型載入流程。
- [ ] 實作或整合 Pitch Shifter (AudioWorklet)。
