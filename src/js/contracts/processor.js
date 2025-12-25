/**
 * Interface definition for VideoProcessor
 */
export class IVideoProcessor {
  async init() { throw new Error("Method not implemented."); }
  
  /**
   * @param {File} file 
   * @param {(stage: string, percent: number) => void} onProgress 
   */
  async process(file, onProgress) { throw new Error("Method not implemented."); }
  
  /**
   * @param {{ pitchShift: number }} settings 
   */
  async renderDownload(settings) { throw new Error("Method not implemented."); }
}
