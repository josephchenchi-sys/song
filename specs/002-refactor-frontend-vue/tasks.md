---
description: "Task list for Vue.js Refactoring with TDD"
---

# Tasks: Refactor Frontend to Vue.js (TDD)

**輸入**: 設計文件位於 `/specs/002-refactor-frontend-vue/`
**先決條件**: plan.md (必要), spec.md (必要), research.md, data-model.md, contracts/

**組織**: 任務按階段分組，嚴格遵循 TDD (Test-Driven Development) 流程。
**TDD 規則**: 每個功能實作前**必須**先撰寫失敗的測試。

## 格式: `[ID] [P?] [Story] Description`

- **[P]**: 可並行執行 (不同檔案，無相依性)
- **[Story]**: 該任務屬於哪個使用者情境 (例如 US1, US2, US3, Infra)
- 描述中包含確切的檔案路徑

## 路徑慣例

- 根目錄: `/workspaces/song/`
- 原始碼: `src/`
- 測試: `src/__tests__/` (Vitest 預設)

## Phase 1: 基礎設施與測試環境 (Infrastructure & Test Setup)

**目的**: 建立 Vue 3 + TypeScript + Tailwind 開發環境，並配置 Vitest 測試框架。

- [x] T001 [Infra] 安裝 Vue 3, TypeScript 及相關依賴 (`npm install vue @vitejs/plugin-vue typescript vue-tsc @types/node -D`)
- [x] T002 [Infra] 安裝 Vitest 與 Vue Test Utils (`npm install vitest @vue/test-utils jsdom -D`)
- [x] T003 [Infra] 配置 `vite.config.js` 以支援 Vue, TypeScript 與 Vitest (包含 `test: { environment: 'jsdom' }`)
- [x] T004 [Infra] 初始化 `tsconfig.json` (配置 `types: ["vitest/globals"]` 與 `allowJs: true`)
- [x] T005 [Infra] 安裝並配置 Tailwind CSS (`npm install -D tailwindcss postcss autoprefixer`, `npx tailwindcss init -p`)
- [x] T006 [Infra] 建立 Vue 專案基本結構 (`src/App.vue`, `src/main.ts`, `src/style.css` 引入 Tailwind)
- [x] T007 [Infra] 修改 `index.html` 指向 `src/main.ts` 並移除舊 script，保留 `coi-serviceworker.js`
- [x] T008 [Infra] 撰寫第一個簡單測試 `src/components/__tests__/HelloWorld.spec.ts` 驗證環境配置正確

---

## Phase 2: 核心邏輯遷移 (TDD: Core Logic)

**目的**: 將 JS 邏輯遷移至 TypeScript Services 與 Vue Composables。
**測試策略**: 針對 Composables 與 Services 撰寫單元測試。Mock WASM 依賴。

- [x] T009 [Infra] 建立 `src/types/index.ts` 定義 `ProcessingState`, `SourceMedia`, `IProcessor` 介面
- [x] T010 [P] [Infra] **(Test)** 建立 `src/composables/__tests__/useProcessing.spec.ts` (測試狀態初始化與更新邏輯)
- [x] T011 [P] [Infra] **(Impl)** 實作 `src/composables/useProcessing.ts` 直到測試通過
- [x] T012 [P] [Infra] **(Test)** 建立 `src/services/__tests__/ProcessorService.spec.ts` (Mock `ffmpeg`/`demucs` 驗證 `process` 流程調用)
- [x] T013 [P] [Infra] **(Impl)** 實作 `src/services/ProcessorService.ts` (遷移 `processor.js` 邏輯，保持 WASM 私有)
- [x] T014 [P] [Infra] **(Test)** 建立 `src/services/__tests__/AudioPlayerService.spec.ts` (Mock `AudioContext` 驗證播放控制)
- [x] T015 [P] [Infra] **(Impl)** 實作 `src/services/AudioPlayerService.ts` (遷移 `audio-player.js` 邏輯)
- [x] T016 [Infra] **(Test)** 建立 `src/composables/__tests__/useAudioPlayer.spec.ts` (測試與 Service 的整合)
- [x] T017 [Infra] **(Impl)** 實作 `src/composables/useAudioPlayer.ts`

---

## Phase 3: 使用者情境 1 - 影片處理 UI (TDD: US1)

**目標**: 使用者可上傳影片，查看處理進度，並在完成後看到結果。

- [x] T018 [US1] **(Test)** 建立 `src/components/ui/__tests__/FileUpload.spec.ts` (驗證檔案選擇事件與 MIME 檢查)
- [x] T019 [US1] **(Impl)** 實作 `src/components/ui/FileUpload.vue`
- [x] T020 [US1] **(Test)** 建立 `src/components/ui/__tests__/ProgressBar.spec.ts` (驗證 Props 傳入進度時樣式改變)
- [x] T021 [US1] **(Impl)** 實作 `src/components/ui/ProgressBar.vue`
- [x] T022 [US1] **(Test)** 建立 `src/views/__tests__/ProcessView.spec.ts` (整合測試：模擬上傳觸發處理流程)
- [x] T023 [US1] **(Impl)** 在 `src/App.vue` (或 View 組件) 中整合 `FileUpload`, `ProgressBar` 與 `useProcessing`

---

## Phase 4: 使用者情境 2 - 卡拉 OK 預覽播放器 (TDD: US2)

**目標**: 使用者可預覽結果，切換人聲，調整 Key。

- [x] T024 [P] [US2] **(Test)** 建立 `src/components/player/__tests__/PlayerControls.spec.ts` (驗證播放/暫停與 Seek 事件發送)
- [x] T025 [P] [US2] **(Impl)** 實作 `src/components/player/PlayerControls.vue`
- [x] T026 [P] [US2] **(Test)** 建立 `src/components/player/__tests__/KaraokeControls.spec.ts` (驗證 Toggle 與 Pitch 按鈕事件)
- [x] T027 [P] [US2] **(Impl)** 實作 `src/components/player/KaraokeControls.vue`
- [x] T028 [US2] **(Test)** 建立 `src/components/player/__tests__/VideoPlayer.spec.ts` (驗證 Video 元素屬性綁定)
- [x] T029 [US2] **(Impl)** 實作 `src/components/player/VideoPlayer.vue`
- [x] T030 [US2] **(Impl)** 整合 `src/components/KaraokePreview.vue` 連接 UI 與 `useAudioPlayer`

---

## Phase 5: 使用者情境 3 - 下載功能 (TDD: US3)

**目標**: 下載處理後的伴奏影片。

- [x] T031 [US3] **(Test)** 建立 `src/components/player/__tests__/DownloadSection.spec.ts` (驗證點擊下載時調用 Service)
- [x] T032 [US3] **(Impl)** 實作 `src/components/player/DownloadSection.vue`
- [x] T033 [US3] **(Impl)** 更新 `src/services/ProcessorService.ts` 確保 `renderDownload` 支援新架構

---

## Phase 6: 清理與優化 (Polish)

- [x] T034 [Polish] 刪除舊的 `src/js/` 目錄與 `src/css/style.css`
- [x] T035 [Polish] **(Test)** 執行所有測試 `npm run test` 確保覆蓋率與通過率
- [x] T036 [Polish] 加入 `src/components/ui/MobileWarning.vue` (簡單實作，可選測試)

## 依賴關係

- **Phase 1** 為環境基礎，優先執行。
- **Phase 2** (Logic) 必須在 **Phase 3+** (UI) 之前完成，確保 UI 有可測試的邏輯依賴。
- 每個功能皆遵循 **Red (寫測試) -> Green (寫實作)** 循環。
