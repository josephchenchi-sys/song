# 實作計畫：使用 Vue.js 重構前端 (002-refactor-frontend-vue)

**分支**: `002-refactor-frontend-vue` | **日期**: 2026-01-07 | **規格**: [spec.md](./spec.md)
**輸入**: 來自 `/specs/002-refactor-frontend-vue/spec.md` 的功能規格

## 摘要

本計畫旨在將現有的影片去人聲工具前端從原生 JavaScript 重構為 **Vue 3 (Composition API)**。核心目標是提升代碼可維護性、引入 **TypeScript** 進行類型安全檢查，並使用 **Tailwind CSS** 優化 UI 樣式。重構將採取漸進式策略，優先遷移核心邏輯為 Services，再逐步替換 UI 組件。

## 技術背景

**語言/版本**: TypeScript 5.0+, Vue 3.4+ (Composition API)  
**主要依賴**: Vite (Build Tool), Tailwind CSS (Styling), `demucs-web`, `@ffmpeg/ffmpeg`, `soundtouchjs`  
**測試工具**: Vitest (Unit/Component), Vue Test Utils  
**儲存**: 無 (純前端處理)  
**測試**: **TDD (測試驅動開發)**。所有邏輯 (Services/Composables) 與 UI 組件皆須先寫測試再實作。  
**目標平台**: 支援 SharedArrayBuffer 的桌面版瀏覽器 (Chrome/Edge/Firefox)  
**專案類型**: 單頁應用程式 (Web Application)  
**效能目標**: 維持現有處理速度，確保 Vue 響應式系統不會造成 WASM 效能退化。  
**限制**: 必須配置 COOP/COEP Headers 以支援 SharedArrayBuffer。  
**規模**: 中小型前端專案，約 10-15 個組件。

## 憲章檢查 (Constitution Check)

- [x] **語言優先**: 檔案內容、註解與設計文件皆使用繁體中文。
- [x] **簡潔至上**: 使用 Vue Reactivity API 代替 Pinia，減少額外抽象。
- [x] **靜態架構**: 保持 GitHub Pages 部署能力。
- [x] **Git 紀律**: 透過功能分支與原子化提交進行開發。
- [x] **規格保存**: 所有 `.specify/` 目錄下的文件均已妥善保存。

## 專案結構

### 文件 (此功能相關)

```text
specs/002-refactor-frontend-vue/
├── plan.md              # 本計畫文件
├── research.md          # 技術研究報告
├── data-model.md        # 資料模型定義
├── quickstart.md        # 快速上手指南
└── contracts/           # 介面契約定義
    └── processor.ts
```

### 原始碼結構

```text
src/
├── assets/              # 靜態資源
├── components/          # Vue 組件
│   ├── ui/              # 通用按鈕、進度條等
│   ├── player/          # 播放器相關組件
│   └── processor/       # 處理流程組件
├── composables/         # 邏輯封裝 (useProcessing, useAudioPlayer)
├── services/            # 核心服務 (Processor, AudioPlayer 類別)
├── types/               # TypeScript 類型定義
├── App.vue              # 根組件
├── main.ts              # 入口點
└── style.css            # Tailwind 與全域樣式
```

**結構決策**: 採用組件化架構，將重型處理邏輯抽離至 `services/` 以免受 Vue 響應式系統干擾，透過 `composables/` 與 UI 層對接。

## 複雜度追蹤

| 違規事項 | 必要性 | 拒絕簡單方案的原因 |
|-----------|------------|-------------------------------------|
| 無 | N/A | 本計畫嚴格遵守憲章規範。 |