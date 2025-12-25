# Data Model & State Definitions

**Feature**: Video Vocal Remover

## 核心實體 (Core Entities)

雖然本專案為純前端應用，無需資料庫 Schema，但以下物件模型將用於應用程式狀態管理。

### 1. SourceMedia (來源媒體)
描述使用者上傳的原始檔案。

```typescript
interface SourceMedia {
  id: string;              // UUID
  file: File;              // 原始 File 物件
  url: string;             // Blob URL (用於預覽播放)
  duration: number;        // 秒數
  format: string;          // e.g., 'video/mp4'
  size: number;            // Bytes
}
```

### 2. ProcessingState (處理狀態)
追蹤長時任務的進度。

```typescript
enum ProcessingStatus {
  IDLE = 'idle',
  LOADING_MODEL = 'loading_model',
  EXTRACTING_AUDIO = 'extracting_audio',
  SEPARATING = 'separating', // 最耗時步驟
  RENDERING = 'rendering',   // 合成影片中
  COMPLETED = 'completed',
  ERROR = 'error'
}

interface ProcessingState {
  status: ProcessingStatus;
  progress: number;        // 0-100
  error?: string;          // 錯誤訊息
  startTime?: number;      // Timestamp
  estimatedTime?: number;  // 剩餘時間估算 (Optional)
}
```

### 3. ProcessedResult (處理結果)
分離後的產物。

```typescript
interface ProcessedResult {
  sourceId: string;
  vocalsAudioBuffer: AudioBuffer;      // 用於預覽 (Web Audio API)
  instrumentalAudioBuffer: AudioBuffer;// 用於預覽 (Web Audio API)
  instrumentalVideoBlob: Blob;         // 最終合成的可下載影片 (僅伴奏)
  downloadUrl: string;                 // Blob URL for downloading
}
```

### 4. PlaybackSettings (播放設定)
卡拉 OK 預覽模式的控制狀態。

```typescript
interface PlaybackSettings {
  isPlaying: boolean;
  currentTime: number;     // 當前播放秒數
  volume: number;          // 主音量 0-1
  isVocalsEnabled: boolean;// 導唱開關 (True = 聽得到人聲)
  pitchShift: number;      // 半音 (Semitones), e.g., +2, -4, 0
  playbackRate: number;    // 預留，目前固定 1.0
}
```

## 資料流 (Data Flow)

1.  **Upload**: User selects File -> `SourceMedia` created -> Blob URL generated.
2.  **Process**:
    *   `ffmpeg.wasm` extracts audio from `SourceMedia`.
    *   `demucs-web` takes audio -> outputs raw PCM data for Vocals and Instrumental.
    *   Web Audio `AudioContext` decodes raw data -> `AudioBuffer` (stored in `ProcessedResult`).
    *   `ffmpeg.wasm` combines `SourceMedia` video stream + Instrumental Audio -> `instrumentalVideoBlob`.
3.  **Preview**:
    *   `AudioContext` plays `instrumentalAudioBuffer`.
    *   If `isVocalsEnabled` is true, also play `vocalsAudioBuffer`.
    *   Video element plays `SourceMedia` (muted) synced with AudioContext.
    *   Pitch Shift effect applied to AudioContext output node.
4.  **Download**:
    *   If `pitchShift` == 0: Download `ProcessedResult.downloadUrl`.
    *   If `pitchShift` != 0: Trigger `ffmpeg.wasm` (or offline audio rendering) to re-render audio with pitch shift applied, then mux with video -> New Blob -> Download.

## 狀態管理 (State Management)

使用簡單的 Store 模式 (Vanilla JS Class + EventTarget) 來管理上述狀態，確保 UI 與邏輯解耦。
