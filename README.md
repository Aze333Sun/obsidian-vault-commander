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

### 从 Release 安装

1. 从 [Releases](https://github.com/Aze333Sun/obsidian-vault-commander/releases) 下载最新版本
2. 解压 `main.js`、`manifest.json`、`styles.css` 到 `<vault>/.obsidian/plugins/vault-commander/`
3. 重启 Obsidian，在 设置 → 第三方插件 中启用「控制台」
4. 点击左边栏 ◇ 图标或 `Ctrl+P` → 打开控制台

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/Aze333Sun/obsidian-vault-commander.git
cd obsidian-vault-commander

# 安装依赖
npm install

# 构建产物
npm run build
# 产物在项目根目录: main.js, styles.css, manifest.json
```

## 使用方法

### 基本操作

| 操作 | 方式 |
|------|------|
| 打开控制台 | 左边栏 ◇ 图标 / `Ctrl+P` → 打开控制台 |
| 刷新扫描 | 标题栏 ↻ 按钮 |
| 跨库搜索 | 标题栏 🔍 按钮 / `Ctrl+Shift+F` |
| 新建分发 | 标题栏 + 按钮 |
| 导入笔记 | 标题栏 ↓ 按钮 |

### 添加外库

1. 打开设置 → 控制台
2. 点击「添加分库」，填写名称和路径（如 `E:/Obsidian`）
3. 点击刷新，外库笔记即出现在仪表盘

### 任务管理

在笔记 frontmatter 中添加 `tags: [task]` 或 `tags: [todo]`，内容中的 `- [ ]` 列表会自动识别：

```markdown
---
tags:
  - task
---

- [ ] 完成需求文档 🔺 📅 2026-06-10
- [x] 已完成的旧任务
```

- `🔺⏫` = 高优先级，`🔼` = 中，`🔽` = 低
- `📅 2026-06-10` = 截止日期
- 点击复选框直接切换完成状态

### 拖拽布局

- 仪表盘模块可拖拽重新排列
- 左右两栏各 8 格，拖放到空位即可

### 堆叠卡片

- 外库以正方形卡片堆叠在顶部
- 点击选中 → 卡片弹出到右侧 → 内容筛选为该库
- 再次点击或点击「全部」→ 恢复汇总视图

## 开发

```bash
npm install          # 安装依赖
npm run dev          # 监听构建（开发用）
npm run build        # 类型检查 + 生产构建
npm run typecheck    # 仅类型检查
npm run test         # 运行 76 个单元测试
npm run test:coverage # 本地覆盖率报告
npm run format       # 格式化代码
```

### 构建产物部署

```bash
# 构建并复制到测试库
npm run build
cp main.js manifest.json styles.css "你的库路径/.obsidian/plugins/vault-commander/"
```

### CI/CD

Push 到 `dev` 或 `main` 分支自动触发：
- TypeScript 类型检查
- 76 个单元测试
- Prettier 格式校验
- 构建产物检查（bundle < 1MB）
- 推送到 `main` 时自动创建 Draft Release

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
