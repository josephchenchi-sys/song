---
description: "Task list for Vue.js Refactoring"
---

# Tasks: Refactor Frontend to Vue.js

**輸入**: 設計文件位於 `/specs/002-refactor-frontend-vue/`
**先決條件**: plan.md (必要), spec.md (必要), research.md, data-model.md, contracts/

**組織**: 任務按階段分組，以實現從原生 JS 到 Vue.js 的漸進式遷移。

## 格式: `[ID] [P?] [Story] Description`

- **[P]**: 可並行執行 (不同檔案，無相依性)
- **[Story]**: 該任務屬於哪個使用者情境 (例如 US1, US2, US3, Infra)
- 描述中包含確切的檔案路徑

## 路徑慣例

- 根目錄: `/workspaces/song/`
- 原始碼: `src/` (將重構為 Vue 結構)
- 規格: `specs/002-refactor-frontend-vue/`

## Phase 1: 基礎設施與配置 (Infrastructure & Setup)

**目的**: 建立 Vue 3 開發環境，整合 Tailwind CSS 與 TypeScript。

- [ ] T001 [Infra] 安裝 Vue 3, TypeScript 及相關依賴 (`npm install vue @vitejs/plugin-vue typescript vue-tsc @types/node -D`)
- [ ] T002 [Infra] 初始化 `tsconfig.json` 並配置 TypeScript (允許 JS 漸進遷移 `allowJs: true`)
- [ ] T003 [Infra] 安裝並配置 Tailwind CSS (`npm install -D tailwindcss postcss autoprefixer`, `npx tailwindcss init -p`)
- [ ] T004 [Infra] 更新 `vite.config.js` 以支援 Vue 插件與 TypeScript
- [ ] T005 [Infra] 建立 Vue 專案基本結構 (`src/App.vue`, `src/main.ts`, `src/style.css` 引入 Tailwind)
- [ ] T006 [Infra] 修改 `index.html` 以指向新的進入點 `src/main.ts` 並移除舊的 script 標籤

---

## Phase 2: 核心邏輯遷移 (Core Logic Migration)

**目的**: 將現有的 JS 邏輯 (`processor.js`, `audio-player.js`) 封裝為 TypeScript 服務與 Vue Composables。

**⚠️ 關鍵**: 確保 WASM 實例不被深層響應式代理 (Deep Proxy)。

- [ ] T007 [P] [Infra] 將 `src/js/store.js` 重構為 Vue Composable `src/composables/useProcessing.ts` (定義 `ProcessingState` 與 `SourceMedia` 介面)
- [ ] T008 [P] [Infra] 建立 `src/services/ProcessorService.ts` (從 `processor.js` 遷移，定義 `IProcessor` 介面，保持 WASM 實例私有)
- [ ] T009 [P] [Infra] 建立 `src/services/AudioPlayerService.ts` (從 `audio-player.js` 遷移，定義播放控制介面)
- [ ] T010 [Infra] 建立 `src/composables/useAudioPlayer.ts` 以連接 `AudioPlayerService` 並暴露響應式 `PlaybackState`
- [ ] T011 [Infra] 確保 `ProcessorService` 與 `AudioPlayerService` 能正確處理 `SharedArrayBuffer` (驗證 `coi-serviceworker` 整合)

---

## Phase 3: 使用者情境 1 - 影片處理 UI (User Story 1 - Process Video)

**目標**: 使用者可上傳影片，查看處理進度，並在完成後看到結果。

- [ ] T012 [P] [US1] 建立 `src/components/ui/FileUpload.vue` 組件 (處理檔案拖放與選擇，驗證 MIME type)
- [ ] T013 [P] [US1] 建立 `src/components/ui/ProgressBar.vue` 組件 (使用 Tailwind 樣式顯示進度與狀態文字)
- [ ] T014 [US1] 在 `src/App.vue` 中整合 `FileUpload` 與 `useProcessing`，實作處理觸發邏輯 (`process()`)
- [ ] T015 [US1] 實作 `src/components/ProcessingLog.vue` (可選) 顯示詳細日誌
- [ ] T016 [US1] 驗證上傳 -> 處理 -> 完成 的流程在 Vue 環境下正常運作

---

## Phase 4: 使用者情境 2 - 卡拉 OK 預覽播放器 (User Story 2 - Karaoke Player)

**目標**: 使用者可預覽結果，切換人聲，調整 Key。

- [ ] T017 [P] [US2] 建立 `src/components/player/VideoPlayer.vue` (封裝 `<video>` 元素，同步邏輯)
- [ ] T018 [P] [US2] 建立 `src/components/player/PlayerControls.vue` (播放/暫停按鈕，進度條 `<input type="range">`)
- [ ] T019 [P] [US2] 建立 `src/components/player/KaraokeControls.vue` (人聲切換 Toggle，升降 Key 按鈕)
- [ ] T020 [US2] 在 `src/App.vue` (或 `src/components/KaraokePreview.vue`) 中整合播放器組件與 `useAudioPlayer`
- [ ] T021 [US2] 實作影片與音訊的同步邏輯 (在 `useAudioPlayer` 或 `VideoPlayer.vue` 中監聽 `timeupdate`)

---

## Phase 5: 使用者情境 3 - 下載功能 (User Story 3 - Download)

**目標**: 下載處理後的伴奏影片。

- [ ] T022 [US3] 在 `src/components/player/DownloadSection.vue` 中實作下載按鈕
- [ ] T023 [US3] 串接 `ProcessorService.renderDownload` 方法，並傳入當前的 Pitch Shift 設定

---

## Phase 6: 清理與優化 (Polish & Cleanup)

**目的**: 移除舊程式碼，優化 UX。

- [ ] T024 [Polish] 刪除舊的 `src/js/` 目錄與 `src/css/style.css` (確認所有功能已遷移)
- [ ] T025 [Polish] 優化 Tailwind 樣式 (RWD 適配，行動裝置視圖)
- [ ] T026 [Polish] 加入「行動裝置警告」橫幅組件 `src/components/ui/MobileWarning.vue`
- [ ] T027 [Polish] 執行完整測試 (上傳 -> 預覽 -> 變調 -> 下載) 確保無功能退化

## 依賴關係

- **Phase 1** 必須最先完成。
- **Phase 2** 必須在 UI 開發前完成 (Logic First)。
- **Phase 3, 4, 5** 依賴 Phase 2 的 Composables。
- **Phase 6** 最後執行。
