# Vault Commander

跨库管理控制台 — Obsidian 插件，提供仪表盘、搜索、笔记分发、洞察功能。

## 快速开始

```bash
npm install
npm run dev
```

## 开发

```bash
npm run dev           # 监听构建
npm run build         # 类型检查 + 生产构建
npm run typecheck     # 仅类型检查
npm run test          # 运行单元测试
npm run test:coverage # 测试 + 覆盖率
npm run format        # 格式化代码
```

## 项目结构

```
src/
├── main.ts          — 插件入口
├── settings.ts      — 设置页 UI
├── types/           — 类型定义
├── core/            — 核心逻辑（扫描、缓存、搜索、分析）
├── ui/              — Svelte 组件（仪表盘、共享组件）
├── views/           — Obsidian 视图注册
├── modals/          — 模态框
└── utils/           — 工具函数
```

## 技术栈

TypeScript + Svelte 4 + esbuild + MiniSearch + Chart.js

## 阶段

- Phase 1: MVP 核心骨架（仪表盘 + 跳转 + 配置管理）
- Phase 2: 跨库搜索
- Phase 3: 新建笔记分发
- Phase 4: 洞察与健康度分析
- Phase 5: 打磨优化

## 许可证

MIT
