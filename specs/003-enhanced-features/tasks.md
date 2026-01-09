---
description: "Task list for Enhanced Features"
---

# Tasks: Feature 003

## Phase 1: Storage Infrastructure (IndexedDB)
- [ ] T001 [Infra] Create `src/services/StorageService.ts` to handle IndexedDB (schema: id, name, blobs, date).
- [ ] T002 [Infra] **(Test)** Create `src/services/__tests__/StorageService.spec.ts`.
- [ ] T003 [Logic] Update `useProcessing.ts` to integrate with `StorageService` (save on complete, load from history).

## Phase 2: History UI & Upload Next
- [ ] T004 [UI] Create `src/components/history/HistoryList.vue` (list view with restore/delete actions).
- [ ] T005 [UI] **(Test)** Create `src/components/history/__tests__/HistoryList.spec.ts`.
- [ ] T006 [UI] Update `App.vue` layout to include a sidebar/drawer for History.
- [ ] T007 [UI] Add "Upload Next Song" button in `ProcessorSection` or `App.vue` that resets state.

## Phase 3: Enhanced Pitch Control
- [ ] T008 [Logic] Update `useAudioPlayer.ts` and `AudioPlayerService.ts` to validate pitch range (-12 to +12).
- [ ] T009 [UI] Update `KaraokeControls.vue` to prevent going beyond +/- 12 and verify UI.

## Phase 4: Advanced Downloads (MP3 & Full Mix)
- [ ] T010 [Logic] Update `ProcessorService.ts`: Implement `mixAudio` (combining vocal+inst buffers).
- [ ] T011 [Logic] Update `ProcessorService.ts`: Implement `encodeMP3` (using ffmpeg).
- [ ] T012 [Logic] Update `ProcessorService.ts`: Update `renderDownload` to accept `format` (mp3/mp4) and `type` (inst/full/vocals).
- [ ] T013 [UI] Refactor `DownloadSection.vue` to include dropdowns for Format and Type.
- [ ] T014 [UI] **(Test)** Update `src/components/player/__tests__/DownloadSection.spec.ts`.

## Phase 5: Verification
- [ ] T015 [QA] Verify storage limits and error handling (Quota Exceeded).
- [ ] T016 [QA] Full regression test of upload -> process -> pitch shift -> download.
