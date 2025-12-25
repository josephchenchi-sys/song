/**
 * Processor Interface Definition
 * 
 * 由於本專案為純前端，無後端 API。此檔案定義核心處理模組 (Processor) 的介面，
 * 做為 UI 層與邏輯層的 "Contract"。
 */

export interface IVideoProcessor {
  /**
   * 初始化 Processor (載入 WASM, Models)
   */
  init(): Promise<void>;

  /**
   * 開始處理流程
   * @param file 使用者上傳的影片檔
   * @param onProgress 進度回調函數
   */
  process(
    file: File,
    onProgress: (stage: string, percent: number) => void
  ): Promise<ProcessedOutput>;

  /**
   * 產生最終下載檔案 (支援變調)
   * @param settings 目前的播放設定 (包含 Key)
   */
  renderDownload(settings: { pitchShift: number }): Promise<Blob>;
}

export interface ProcessedOutput {
  vocals: AudioBuffer;       // Web Audio API buffer
  instrumental: AudioBuffer; // Web Audio API buffer
  originalVideo: Blob;       // 原始影片 (用於預覽畫面)
}
