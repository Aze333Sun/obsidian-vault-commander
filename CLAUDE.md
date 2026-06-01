# Vault Commander — CLAUDE.md

> Claude Code 启动时自动读取此文件建立上下文。

## 项目概述

Obsidian 插件，实现跨库管理控制台。
功能：仪表盘、跨库搜索、笔记分发、知识库洞察。
技术栈：TypeScript + Svelte 4 + esbuild + MiniSearch。

## 目录结构

```
src/
├── main.ts          — 插件入口（生命周期、命令注册）
├── settings.ts      — 设置页 UI（Obsidian SettingTab）
├── constants.ts     — 常量（默认设置、忽略列表）
├── types/           — 类型定义
│   ├── settings.ts  — PluginSettings, VaultConfig
│   ├── snapshot.ts  — VaultSnapshot, NoteChange
│   ├── search.ts    — SearchParams, SearchResult
│   ├── events.ts    — 事件类型
│   └── analyzer.ts  — TrendData, HealthScore
├── core/            — 核心逻辑（与 UI 无关）
│   ├── scanner.ts   — VaultScanner（全量/增量扫描）
│   ├── cache.ts     — VaultCache（IndexedDB 持久化）
│   ├── search-engine.ts — SearchEngine（MiniSearch 封装）
│   ├── dispatcher.ts    — NoteDispatcher（新建分发）
│   ├── analyzer.ts      — InsightsAnalyzer（趋势/健康度）
│   └── event-bus.ts     — EventBus（发布订阅）
├── ui/              — Svelte 组件
│   ├── Dashboard.svelte
│   ├── components/  — TopBar, QuickLaunch, VaultStatsCard 等
│   └── shared/      — LoadingSpinner, EmptyState, ErrorBanner
├── views/           — Obsidian 视图注册
│   └── dashboard-view.ts — ItemView + Svelte 挂载
├── modals/          — 模态框
│   ├── search-modal.ts
│   ├── new-note-modal.ts
│   └── ui/          — SearchModal.svelte, NewNoteModal.svelte
└── utils/           — 工具函数
    ├── path.ts, time.ts, file.ts
    ├── template.ts  — TemplateEngine（占位符替换）
    ├── link-parser.ts — wikilink/embed 解析
    ├── file-type-filter.ts — 扩展名过滤
    ├── concurrency.ts — ConcurrencyController
    ├── chunked-scanner.ts — 时间片分块扫描
    ├── performance.ts — PerformanceMonitor
    └── i18n.ts      — 国际化
```

## 构建命令

```bash
npm run dev           # 监听构建（开发用）
npm run build         # 类型检查 + 生产构建
npm run typecheck     # 仅类型检查
npm run test          # 运行单元测试
npm run test:coverage # 测试 + 覆盖率报告
npm run format        # 格式化代码
npm run build:deploy  # 构建 + 部署到 Obsidian
```

## 代码规范

- **命名**：类 `PascalCase`，方法 `camelCase`，文件 `kebab-case`
- **CSS 前缀**：所有 class 名前缀 `vc-`
- **事件名**：`module:action` 格式（如 `scan:complete`、`note:created`）
- **分层**：`core/` 不依赖 `ui/`，`ui/` 通过 props/callbacks 通信
- **错误**：使用 `VaultError` 自定义错误类（code + message）
- **国际化**：文案通过 `t(key)` 获取，不使用硬编码字符串
- **常量**：`UPPER_SNAKE_CASE`

## 关键约定

### 扫描
- **主库扫描**：使用 `app.metadataCache.getFileCache(file)`，零 I/O
- **外库扫描**：使用 `fs.promises` 异步 API
- **文件过滤**：在目录遍历最上游执行，只处理 `.md`（及用户配置的扩展名），附件文件不 stat 不 read
- **增量扫描**：基于 `mtime` 对比 `CachedFileMeta`
- **防并发**：`isScanning` 锁防止重复扫描
- **可中断**：`AbortController` 支持取消
- **分块处理**：超过 50 个文件的任务使用 `ChunkedScanner`，每块后 yield 主线程

### 搜索
- **懒加载**：首次搜索时才构建全文索引
- **字段加权**：title(3) > tags(2) > content(1)
- **Debounce**：用户输入 300ms 防抖
- **可取消**：前次搜索未完成时 `AbortController.abort()`
- **上限**：默认返回最多 50 条结果

### 缓存
- `VaultSnapshot`：IndexedDB 持久化（`idb-keyval`）
- `PluginSettings`：`plugin.data`（Obsidian 自动管理）
- 缓存一致性：通过 mtime 对比检测变更

### 大文件
- > 10MB：跳过全文索引，仅 stat
- 500KB ~ 10MB：只读前 500KB 用于索引
- < 500KB：正常处理

### 文件类型
- 默认：仅 `.md`
- 可配置：用户在设置中添加扩展名
- 硬编码排除：图片/PDF/音频/视频/压缩包/二进制文件
- 配置变更后自动触发增量重扫

## 测试规范

- 测试框架：Vitest
- 测试目录：`test/`（与 `src/` 结构对应）
- Mock 位置：`test/mocks/obsidian.ts`
- 辅助工具：`test/helpers/vault-builder.ts`（创建临时文件结构）
- 覆盖率目标：`statements >= 80%`，`branches >= 75%`
- 测试文件命名：`模块名.test.ts`
- 描述规范：`describe('ModuleName')` → `it('应该...')`

## 依赖

### 生产依赖
- `minisearch` ^7.0 — 全文搜索引擎
- `idb-keyval` ^6.0 — IndexedDB 轻量封装

### 可选依赖（按需加载）
- `chart.js` ^4.0 + `svelte-chartjs` ^3.0 — 图表（Phase 4）

### 开发依赖
- `svelte` ^4.2 + `esbuild-svelte` + `svelte-preprocess`
- `obsidian` ^1.4（类型定义）
- `vitest` ^1.0
- `typescript` ^5.3 + `@types/node`
- `prettier` ^3.0

## 设计文档

设计文档位于 Obsidian vault 的 `项目设计/Obsidian控制台/` 目录：
- 项目实现.md — 实现规范（主要参考）
- 分析/插件架构.md — 架构与类图
- 分析/功能设计.md — 组件树与接口
- 分析/技术选型.md — 技术决策记录
- 开发计划.md — 当前 Sprint 任务
