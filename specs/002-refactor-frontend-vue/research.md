# 研究報告：002-refactor-frontend-vue

**功能**: 使用 Vue.js 重構前端
**日期**: 2026-01-07
**狀態**: 已完成

## 未知事項與澄清

### 1. WASM 函式庫 (FFmpeg/Demucs) 與 Vue 3 生命週期的整合
- **問題**: 如何在 Vue 組件中管理依賴 `SharedArrayBuffer` 的重量級函式庫？
- **調查結果**:
  - `demucs-web` 和 `ffmpeg.wasm` 具有狀態且消耗大量資源。
  - 它們**不應**直接使用 `ref()` 或 `reactive()` 進行響應式包裝，因為深層 Proxy 可能導致 Web Workers 或 WASM 實例出現效能問題或錯誤。
  - **決策**: 使用 `shallowRef` 或將它們作為普通物件保留在響應式系統之外（例如在獨立的 Service/Composable 檔案中），僅透過響應式狀態暴露其「狀態」與「結果」。
  - **理由**: Vue 的響應式系統會增加開銷。將 WASM 實例包裝在 Proxy 中既無必要也有風險。

### 2. Vite 開發伺服器中的 COOP/COEP Headers
- **問題**: Vite 預設的開發伺服器是否支援 `SharedArrayBuffer` 的需求？
- **調查結果**:
  - Vite 允許在 `vite.config.js` 中配置 headers。
  - **配置**:
    ```js
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
    ```
  - **生產環境**: 對於不支援 Header 配置的環境（如 GitHub Pages），專案已包含 `coi-serviceworker` (`public/coi-serviceworker.js`)。這在 `index.html` 中必須保留。

### 3. Tailwind CSS 整合
- **問題**: Vite + Vue 的標準設置為何？
- **決策**: 使用 PostCSS 方式。
  - 安裝 `tailwindcss`, `postcss`, `autoprefixer`。
  - 建立 `tailwind.config.js` 和 `postcss.config.js`。
  - 在主 CSS 檔案中引入 Tailwind 指令。

### 4. TypeScript 遷移策略
- **問題**: 如何處理現有的 JS 檔案 (`processor.js`, `audio-player.js`)？
- **決策**:
  - **漸進式**: 逐一將 `.js` 重新命名為 `.ts`。
  - **允許 JS**: 初期在 `tsconfig.json` 中設定 `allowJs: true`，避免嚴格類型檢查阻礙進度。
  - **優先順序**: 優先為狀態介面 (State Interfaces) 和組件 Props 定義類型。複雜邏輯 (FFmpeg/Demucs 包裝器) 初期可先使用寬鬆類型 (`any`)，再逐步完善。

## 技術決策

| 技術 | 選擇 | 理由 |
|------------|--------|-----------|
| **框架** | Vue 3 (Composition API) | 使用者要求。比原生 JS 有更好的狀態管理。 |
| **構建工具** | Vite | 現有工具，速度快，支援原生 ESM。 |
| **樣式** | Tailwind CSS | 使用者要求。Utility-first 加速開發。 |
| **語言** | TypeScript | 使用者要求。為複雜狀態提供類型安全。 |
| **狀態管理** | Reactivity API (`ref`/`reactive`) | 對此規模的應用已足夠。Pinia 過於複雜。 |
| **圖示** | Lucide-vue-next | 簡潔、輕量、標準化的圖示集。 |

## 架構模式

### 組件結構
- **Smart/Dumb Components (智能/笨拙組件)**:
  - `App.vue`: 協調者 (Layout)。
  - `views/`: 主要畫面 (若加入路由，否則僅為 App 中的區塊)。
  - `components/`: 原子化 UI 元素 (按鈕、進度條)。
  - `composables/`: 邏輯提取 (例如 `useAudioPlayer`, `useProcessor`)。

### 服務層 (Service Layer)
- 現有的 `processor.js` 和 `audio-player.js` 將被重構為 TypeScript 類別/模組，但保留為「服務 (Services)」，Vue 層透過 Composables 與之互動。