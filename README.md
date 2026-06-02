# 控制台

Obsidian 跨库管理插件。在同一界面管理多个 Obsidian 知识库，支持仪表盘、跨库搜索、笔记分发导入、任务追踪、健康度分析。

## 功能

| 模块 | 说明 |
|------|------|
| 仪表盘 | 拖拽布局、堆叠卡片、多库统计概览 |
| 任务待办 | 自动识别 `#task`/`#todo` 标签笔记中的 `- [ ]` 列表 |
| 跨库搜索 | MiniSearch 全文检索，高亮匹配 |
| 笔记分发 | 将当前笔记一键发送到其他库 |
| 笔记导入 | 从外库浏览并导入笔记到当前库 |
| 健康度 | 活跃度、链接完整性评分 |
| 标签云 | 前 20 高频标签，跟随库切换 |
| 调试面板 | 事件日志、扫描状态、错误追踪 |
| 活跃动态 | 24h/7d/30d 新增与修改进度条 |

## 安装

1. 下载 [最新 Release](https://github.com/Aze333Sun/obsidian-vault-commander/releases)
2. 解压到 `<vault>/.obsidian/plugins/vault-commander/`
3. 在 Obsidian 设置中启用插件
4. 点击左边栏图标或 `Ctrl+P` → 打开控制台

## 开发

```bash
npm install
npm run dev           # 监听构建
npm run build         # 类型检查 + 生产构建
npm run test          # 运行 76 个单元测试
npm run test:coverage # 本地覆盖率
npm run format        # 格式化代码
```

## 技术栈

TypeScript + Svelte 4 + esbuild + MiniSearch + idb-keyval + Vitest

## 项目结构

```
src/
├── main.ts          — 插件入口
├── settings.ts      — 设置页 UI
├── types/           — 类型定义
├── core/            — 扫描器、缓存、搜索引擎、分发器、分析器、事件总线
├── ui/              — Dashboard + 组件（卡片/任务/标签/健康度/分页/调试）
├── views/           — Obsidian ItemView 注册
├── modals/          — 搜索/新建/分发/导入/预览模态框
└── utils/           — 路径/时间/文件/模板/链接解析/性能/调试/i18n
test/                — 11 个测试文件，76 个用例
```

## 许可证

MIT
