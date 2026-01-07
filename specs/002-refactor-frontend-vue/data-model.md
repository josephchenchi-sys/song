# 資料模型：002-refactor-frontend-vue

## 實體 (Entities)

### SourceMedia (來源媒體)
代表使用者上傳的原始影片檔案。

| 欄位 | 類型 | 描述 |
|-------|------|-------------|
| `id` | `string` (UUID) | 唯一識別碼 |
| `file` | `File` | 原始檔案物件 |
| `url` | `string` (BlobURL) | 預覽用的 Blob URL |
| `format` | `string` | MIME type (例如 'video/mp4') |
| `size` | `number` | 檔案大小 (Bytes) |
| `duration` | `number` | 影片長度 (秒) |

### ProcessingState (處理狀態)
追蹤處理流程的狀態。

| 欄位 | 類型 | 描述 |
|-------|------|-------------|
| `status` | `ProcessingStatus` (Enum) | 當前階段 |
| `progress` | `number` (0-100) | 當前階段的進度百分比 |
| `error` | `string \| null` | 錯誤訊息 |
| `logs` | `string[]` | 詳細處理日誌 |

**ProcessingStatus 列舉 (Enum)**:
- `IDLE`: 閒置
- `LOADING_MODEL`: 載入/下載模型中
- `EXTRACTING_AUDIO`: 正在提取音訊 (FFmpeg)
- `SEPARATING`: 正在分離人聲 (Demucs)
- `RENDERING`: 正在合成最終影片 (FFmpeg)
- `COMPLETED`: 完成
- `ERROR`: 發生錯誤

### ProcessedResult (處理結果)
處理完成後的產物。

| 欄位 | 類型 | 描述 |
|-------|------|-------------|
| `originalVideo` | `Blob` | 原始影片 (用於同步預覽) |
| `vocals` | `AudioBuffer` | 分離出的人聲 |
| `instrumental` | `AudioBuffer` | 分離出的伴奏 |
| `vocalsBlob` | `Blob` | 人聲檔案 (用於下載) |
| `instrumentalBlob` | `Blob` | 伴奏檔案 (用於下載) |

### PlaybackState (播放狀態)
播放器與卡拉 OK 控制狀態。

| 欄位 | 類型 | 描述 |
|-------|------|-------------|
| `isPlaying` | `boolean` | 是否正在播放 |
| `currentTime` | `number` | 當前播放時間 (秒) |
| `duration` | `number` | 總長度 (秒) |
| `isVocalsEnabled` | `boolean` | 是否開啟人聲 |
| `pitchShift` | `number` | 升降 Key 數值 (半音, -12 ~ +12) |
| `volume` | `number` | 音量 (0.0 ~ 1.0) |

## 響應式策略 (Reactivity Strategy)

使用 Vue 3 `reactive` 或 `ref` 封裝上述狀態。

```typescript
// composables/useProcessing.ts
export const useProcessing = () => {
  const state = reactive<{
    status: ProcessingStatus;
    progress: number;
    error: string | null;
    logs: string[];
  }>({
    status: ProcessingStatus.IDLE,
    progress: 0,
    error: null,
    logs: []
  });
  
  // ... 更新狀態的方法
  return { state };
}
```