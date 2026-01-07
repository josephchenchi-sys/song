# 快速入門：002-refactor-frontend-vue

## 先決條件

- Node.js 18+
- NPM 9+
- 支援 SharedArrayBuffer 的瀏覽器 (Chrome/Edge/Firefox)

## 安裝

1.  **安裝依賴**:
    ```bash
    npm install
    ```

2.  **啟動開發伺服器**:
    ```bash
    npm run dev
    ```
    開啟瀏覽器訪問 `http://localhost:5173`

## 專案結構

```text
src/
├── assets/          # 靜態資源 (圖片等)
├── components/      # Vue 組件
│   ├── ui/          # 通用 UI 組件 (按鈕等)
│   ├── player/      # 播放器相關組件
│   └── processor/   # 處理流程相關組件
├── composables/     # Vue Composables (邏輯)
├── services/        # 非 Vue 邏輯 (FFmpeg, Demucs 包裝器)
├── types/           # TypeScript 定義
├── App.vue          # 主根組件
├── main.ts          # 程式入口點
└── style.css        # Tailwind 指令與全域樣式
```

## 開發流程

1.  **組件 (Components)**: 在 `src/components` 建立新組件。使用 `<script setup lang="ts">`。
2.  **狀態 (State)**: 使用 `src/composables` 中的 composables 來共享狀態。
3.  **樣式 (Styling)**: 直接在模板中使用 Tailwind CSS utility classes。
4.  **類型 (Types)**: 在 `src/types` 定義介面 (interfaces)。

## 疑難排解

-   **SharedArrayBuffer 錯誤**: 確保 `coi-serviceworker.js` 已載入，或 Vite headers 已正確設定。檢查瀏覽器 console。
-   **FFmpeg/Demucs 載入失敗**: 檢查 Network 標籤頁是否有 `.wasm` 檔案的 404 錯誤。確保它們位於 `public/` 目錄中或已被正確服務。