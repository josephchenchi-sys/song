# 開發快速入門 (Quickstart)

## 系統需求

- **Node.js**: v18+
- **Browser**: Chrome/Edge/Firefox (最新版)
- **Editor**: VS Code (推薦)

## 安裝依賴

```bash
# 在專案根目錄
npm install
```

## 開發環境啟動

由於專案依賴 `SharedArrayBuffer`，必須使用支援 COOP/COEP Headers 的開發伺服器。我們使用 Vite 來處理。

```bash
# 啟動開發伺服器
npm run dev
```

伺服器啟動後，開啟瀏覽器訪問 `http://localhost:5173` (或 CLI 顯示的 port)。

## 建置與部署

```bash
# 建置靜態檔案
npm run build

# 預覽建置結果
npm run preview
```

建置產物將位於 `dist/` 目錄，可直接部署至 GitHub Pages。

## 專案結構導覽

- `src/js/processor.js`: 核心邏輯 (FFmpeg/Demucs 整合)。
- `src/js/audio-player.js`: 處理 Pitch Shift 與 Web Audio 播放。
- `public/`: 靜態資源 (含 `coi-serviceworker.js`, 模型權重)。

## 常見問題

**Q: 瀏覽器報錯 "SharedArrayBuffer is not defined"**
A: 確保你正在使用 `npm run dev` 啟動，且 `coi-serviceworker.js` 有正確載入。若直接開啟 `index.html` 檔案是無法運作的。

**Q: 處理影片時分頁崩潰**
A: 記憶體不足。請嘗試較短的影片，或關閉瀏覽器其他分頁釋放記憶體。
