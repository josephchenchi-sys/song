<!--
Sync Impact Report:
- Version change: (New) -> 1.0.0
- List of modified principles: Established initial principles (Language, Simplicity, Architecture, Discipline, Preservation).
- Added sections: Technical Constraints, Development Workflow.
- Templates requiring updates: ✅ None (Generic templates suffice).
- Follow-up TODOs: None.
-->

# song Constitution

## Core Principles

### I. Language First (語言優先)
所有文件、規格說明及程式碼註解**必須**使用繁體中文（Traditional Chinese）撰寫。技術專有名詞若無通用中文譯名，可保留英文。

### II. Keep It Simple (簡潔至上)
避免過度設計（Over-engineering）。除非絕對必要，否則不應建立額外的抽象層或檔案。解決方案應直接且易於理解。除非使用者特別要求，否則不要建立新的 Markdown 文件來記錄變更或總結工作。

### III. Static Web Architecture (靜態網頁架構)
本專案為靜態網站（Static Website）。核心技術堆疊為 HTML, CSS, JavaScript。架構**必須**支援部署至 GitHub Pages。避免引入複雜的後端依賴或資料庫，除非有明確的外部 API 整合需求。

### IV. Git & Task Discipline (版本與任務紀律)
Git 操作**必須**貫穿開發流程的每個階段，確保變更有跡可循。`tasks.md` **必須**與實際進度保持同步（打勾確認）。implement 階段需特別注意任務狀態的更新。

### V. Spec Preservation (規格保存)
`.specify/` 目錄下的規格文件是專案的單一真理來源（SSOT）。工具或自動化腳本**絕不可**在未經使用者明確指示的情況下刪除或覆蓋這些規格文件（特別是在套用框架模板時）。

## Technical Constraints (技術限制)

專案技術選擇應遵循以下限制：
1.  **前端基礎**: 優先使用原生 Web 技術 (Vanilla JS/CSS) 或輕量級函式庫，以維持部署的單純性。
2.  **部署目標**: GitHub Pages。任何建置流程（Build Process）產出的靜態檔案必須能直接在此環境運作。

## Development Workflow (開發流程)

1.  **規劃 (Plan)**: 根據需求更新規格與計畫。
2.  **實作 (Implement)**: 
    -   執行前確認 `tasks.md` 狀態。
    -   實作過程中頻繁提交 Git (Atomic Commits)。
    -   隨時注意不要覆蓋 `.specify/` 內的檔案。
3.  **驗證 (Verify)**: 確認功能符合繁體中文規格書的描述。

## Governance

本憲章（Constitution）是專案的最高指導原則。所有程式碼變更（PRs）與設計決策皆須符合上述原則。

**修改程序**:
-   任何原則的增刪修訂皆須經過使用者批准。
-   版本號依據語意化版本（Semantic Versioning）規則編排。

**Version**: 1.0.0 | **Ratified**: 2025-12-25 | **Last Amended**: 2025-12-25