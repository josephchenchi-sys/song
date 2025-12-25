---
description: "Task list template for feature implementation"
---

# Tasks: Video Vocal Remover

**Input**: Design documents from `/specs/001-video-vocal-remover/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 初始化 Vite 專案與原生 JS 結構
- [x] T002 安裝核心依賴: `demucs-web`, `ffmpeg.wasm`, `coi-serviceworker`
- [x] T003 [P] 設定 `coi-serviceworker` 於 `index.html` 與 `public/coi-serviceworker.js` 以支援 SharedArrayBuffer
- [x] T004 [P] 設定 `vite.config.js` 以在開發模式下提供 SharedArrayBuffer 支援的 Headers
- [x] T005 在 `src/css/style.css` 建立基本 CSS 結構

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 定義 `IVideoProcessor` 介面於 `src/js/contracts/processor.js` (改編自 contracts/processor.ts)
- [x] T007 實作狀態管理 Store 類別 (`SourceMedia`, `ProcessingState`, `ProcessedResult`) 於 `src/js/store.js`
- [x] T008 [P] 於 `src/js/processor.js` 建立實作 `IVideoProcessor` 的 `Processor` 類別骨架
- [x] T009 於 `src/js/audio-player.js` 建立 `AudioPlayer` 類別骨架用於播放控制
- [x] T010 建立主進入點 `src/js/app.js` 並串接基本模組匯入

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Process Video and Download (Priority: P1) 🎯 MVP

**Goal**: Users can upload video, process it to remove vocals, and download the instrumental version (original key).

**Independent Test**: Upload a sample video, wait for processing, download result, verify it is instrumental only.

### Implementation for User Story 1

- [x] T011 [P] [US1] 實作 `ffmpeg.wasm` 初始化與音訊提取邏輯於 `src/js/processor.js`
- [x] T012 [P] [US1] 實作 `demucs-web` 初始化與分離邏輯於 `src/js/processor.js`
- [x] T013 [US1] 實作檔案輸入處理與 `SourceMedia` 建立於 `src/js/app.js` (需驗證 MIME type 是否為支援的影片格式)
- [x] T014 [US1] 串接 `src/js/processor.js` 中的 `process()` 方法以整合提取 -> 分離流程
- [x] T015 [US1] 使用 `ffmpeg.wasm` 實作影片/音訊合成邏輯 (Video + Instrumental) 於 `src/js/processor.js`
- [x] T016 [US1] 實作 `renderDownload()` 方法於 `src/js/processor.js` (基本版: 無變調)
- [x] T017 [US1] 新增「下載」按鈕至 UI 並連接至 `src/js/app.js` 中的 `renderDownload`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Processing Progress Feedback (Priority: P2)

**Goal**: Users see visual feedback during the long processing steps.

**Independent Test**: Upload a large video, observe progress bar moving during extraction, separation, and rendering phases.

### Implementation for User Story 2

- [x] T018 [P] [US2] 建立進度條 UI 元件於 `index.html` 與 `src/css/style.css`
- [x] T019 [P] [US2] 在 `src/js/processor.js` 的 `ffmpeg.wasm` 操作中加入細粒度進度回調
- [x] T020 [P] [US2] 在 `src/js/processor.js` 的 `demucs-web` 分離中加入進度回調
- [x] T021 [US2] 在 `src/js/app.js` 中串接 `onProgress` 回調以更新 UI 進度條
- [x] T022 [US2] 在 `src/js/store.js` 實作狀態轉換 (IDLE -> EXTRACTING -> SEPARATING -> COMPLETED) 並更新 UI 文字

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Karaoke Preview Mode (Priority: P3)

**Goal**: Users can preview result, toggle vocals (guide track), and shift pitch (key) in real-time before downloading.

**Independent Test**: Preview processed video, toggle vocals on/off, shift key +2/-2, verify audio changes immediately. Download shifted version and verify key change.

### Implementation for User Story 3

- [x] T023 [P] [US3] 建立預覽 UI (影片播放器 + 控制項) 於 `index.html`
- [x] T024 [P] [US3] 在 `src/js/audio-player.js` 實作 `AudioContext` 設定以播放人聲與伴奏緩衝區
- [x] T025 [US3] 在 `src/js/audio-player.js` 實作「導唱開關」 (GainNode 控制) (預設: 開啟)
- [x] T026 [US3] 整合 Pitch Shift 庫 (推薦使用 `soundtouchjs` 或 AudioWorklet 實作) 於 `src/js/audio-player.js`
- [x] T027 [US3] 在 `src/js/audio-player.js` 實作 `setPitch(semitones)` 方法
- [x] T028 [US3] 實作同步邏輯: `<video>` 播放/暫停/搜尋事件控制 `AudioContext` 於 `src/js/audio-player.js`
- [x] T029 [US3] 更新 `src/js/processor.js` 中的 `renderDownload()` 以支援使用離線渲染或 FFmpeg 濾鏡進行變調
- [x] T030 [US3] 連接 UI 控制項 (開關, 升降 Key) 至 `src/js/app.js` 中的 `AudioPlayer`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T031 [P] 實作 OOM 錯誤處理 (在重型 WASM 操作周圍加上 try-catch) 並顯示使用者友善警示
- [x] T032 [P] 為行動裝置新增「建議使用桌面版」橫幅 (`src/js/app.js`)
- [x] T033 優化 UI 樣式 (響應式佈局, 載入狀態) 於 `src/css/style.css`
- [x] T034 驗證輸出準確性: 下載的檔案符合預覽設定 (Pitch Shift) 且影片長度正確
- [x] T035 建立 README 說明以便在本地運行

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational
- **User Story 2 (P2)**: Depends on US1 logic structure (callbacks need to be inserted into existing flow)
- **User Story 3 (P3)**: Depends on US1 (needs processed buffers)

### Parallel Opportunities

- Setup tasks T003, T004 can run in parallel
- Foundational tasks T008, T009 can run in parallel
- US1 tasks T011, T012 can run in parallel
- US2 tasks T018, T019, T020 can run in parallel
- US3 tasks T023, T024 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup + Foundational
2. Implement Video Upload -> Extract -> Separate -> Download (Original Key)
3. **STOP and VALIDATE**: Ensure basic separation works before adding UI complexity.

### Incremental Delivery

1. **v0.1**: Core Processing (US1) - "It works but it's ugly and quiet"
2. **v0.2**: Progress Feedback (US2) - "Now I know it's not broken"
3. **v0.3**: Karaoke Mode (US3) - "Full feature set with Preview & Pitch Shift"