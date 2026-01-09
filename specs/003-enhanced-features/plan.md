# Feature 003: Enhanced Audio Features & History

## Goal
Implement advanced audio processing features (expanded pitch range, multi-format downloads) and a history management system to cache processed videos locally.

## Requirements

### 1. Enhanced Pitch Control
- **Range**: Support pitch shifting from -12 to +12 semitones.
- **UI**: Update controls to support this range intuitively.

### 2. Advanced Download Options
- **Formats**: Support both **MP4** (Video) and **MP3** (Audio only).
- **Types**:
  - **Instrumental**: Backing track only (pitch-shifted).
  - **Full Mix**: Original Vocals + Backing track (both pitch-shifted together).
  - **Vocals**: Extracted vocals only (pitch-shifted).
- **Implementation**: Perform mixing and encoding client-side using `ffmpeg.wasm`.

### 3. Video Cache & History (Persistence)
- **Storage**: Use `IndexedDB` (via `idb` library) to store processed blobs locally.
- **Capacity**: Limit storage (e.g., last 5-10 songs) or size to prevent quota errors.
- **UI**:
  - **Sidebar/List**: Show previously processed songs.
  - **Restore**: Click a history item to reload it into the player instantly.
  - **Upload Next**: Button to clear current workspace (saving to history first) and start fresh.

## Architecture

### Services
- **`StorageService`**: New service handling IndexedDB operations (`saveSong`, `getSongs`, `deleteSong`).
- **`ProcessorService`**:
  - Add `mixAudio(vocals, instrumental, pitch)` logic.
  - Add `encodeMP3(audioBuffer)` logic using FFmpeg.

### Components
- **`HistoryList.vue`**: New component for the sidebar.
- **`DownloadSection.vue`**: Refactor to a form/modal for download options.
- **`App.vue`**: Layout changes to accommodate the history sidebar.

## Risks
- **Browser Storage Limits**: Blobs are large. IndexedDB quota varies. Need robust error handling for "Quota Exceeded".
- **Memory Usage**: Loading multiple blobs into memory might crash tabs. Ensure we only load the *active* song's blobs into RAM.
