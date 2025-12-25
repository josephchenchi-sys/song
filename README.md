# Video Vocal Remover (影片去人聲)

這是一個純前端的影片去人聲工具，使用 WebAssembly 技術 (`demucs-web`, `ffmpeg.wasm`) 在瀏覽器本地進行處理，保障隱私且無需上傳檔案。

## 功能

- **影片去人聲**: 上傳 MP4/WebM 影片，自動分離人聲與伴奏。
- **純前端處理**: 所有運算皆在本地進行。
- **卡拉 OK 預覽**: 
  - 即時開關導唱 (人聲)。
  - 即時升降 Key (變調)。
- **下載**: 匯出處理後的伴奏影片。

## 系統需求

- 桌面版 Chrome, Edge 或 Firefox (建議最新版)。
- 至少 8GB RAM (建議 16GB)，因為 AI 模型需要較大記憶體。

## 開發與執行

1. 安裝依賴:
   ```bash
   npm install
   ```

2. 啟動開發伺服器:
   ```bash
   npm run dev
   ```

3. 開啟瀏覽器:
   訪問 `http://localhost:5173`

## 注意事項

- 本專案依賴 `SharedArrayBuffer`，因此開發伺服器必須設定 COOP/COEP Headers (Vite 設定已包含)。
- 若部署至 GitHub Pages，會自動使用 `coi-serviceworker` 來啟用這些 Headers。
