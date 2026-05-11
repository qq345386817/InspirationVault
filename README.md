# 灵感库流水线

这个项目现在是一条 `采集 -> 入库 -> enrichment -> 展示 -> AI 提案` 的外脑流水线。

目标不是单纯“抓网页”，而是把不同来源的内容沉淀成可持续使用的知识库。当前仓库已经支持五类 source：

- `codepen`
  面向交互灵感、创意编码和视觉模式
- `iosdevweekly`
  面向 iOS 技术周报、工具、代码和行业内容
- `uxweekly`
  面向体验设计周报、案例、工具资源和产品发现
- `fatbobmanweekly`
  面向 Swift、SwiftUI、Apple 平台开发和工程工具
- `github`
  面向独立保存的 GitHub repo、开源工具、产品原型和实现参考

## 文档入口

按 source 拆开的使用文档在这里：

- [Spark 采集与使用](docs/spark.md)
- [Weekly 采集与使用](docs/weekly.md)
- [UX 周报采集与使用](docs/ux-weekly.md)
- [Swift 周报采集与使用](docs/fatbobman-weekly.md)
- [GitHub 项目采集与使用](docs/github.md)

日常使用时，优先直接看上面几个文档；总 README 只保留公共规则和项目结构。

## 公共规则

### 去重规则

- 同一次导入里如果出现重复 URL，只保留一条
- 如果 vault 里已经存在相同 URL，新导入会自动跳过
- 当前按 URL 判断重复
- 如果重复 URL 出现在不同 issue 里，系统会复用已有 item，但保留新的 issue appearance
- `vault:import` 默认会批量读取 `vault/inbox/*.json`
- 成功导入后的 JSON 会自动移到 `vault/inbox/processed/`

### 入库结构

重要目录：

- `vault/raw/`
  保存原始归档，作为事实层
- `vault/items/`
  每条内容一份 Markdown 卡片
- `vault/assets/`
  配图、缩略图、预览图等本地素材
- `vault/db/inspiration.sqlite`
  SQLite 索引
- `vault/enrichment/batches/`
  待 AI 或人工补充的 batch
- `vault/site/`
  静态展示页输出
- `.agents/skills/inspiration-briefing/`
  项目提案 Skill

### 当前数据分层

1. 采集层  
负责拿原始条目和来源上下文。

2. 入库层  
负责确定性写入 `raw json / markdown card / sqlite row / item appearance`。

3. enrichment 层  
负责补中文、分类、摘要、决策字段。

4. briefing 层  
负责把现有内容组合成项目方向，而不是只给搜索结果。

### 决策字段

为了让这个项目更像“外脑”，现在每条 item 都可以补这些字段：

- `fit_for_projects`
- `fit_for_scenes`
- `complexity_level`
- `implementation_cost`
- `platform_fit`
- `novelty_score`
- `reuse_confidence`
- `personal_rating`
- `favorite`
- `used_in_projects`
- `rejected_reason`
- `revisit_later`
- `taste_profile`

## 展示入口

- [vault/site/index.html](/Users/wangyin/Downloads/CodepenSpark/vault/site/index.html)
  总入口

source 专属入口见：

- [Spark 文档](docs/spark.md)
- [Weekly 文档](docs/weekly.md)
- [UX 周报文档](docs/ux-weekly.md)
- [Swift 周报文档](docs/fatbobman-weekly.md)
- [GitHub 项目文档](docs/github.md)

## 常用命令

从固定收件箱导入 JSON：

```bash
npm run vault:import
```

按需直接导入一个指定 JSON：

```bash
npm run vault:import -- /path/to/export.json
```

准备当前所有待 enrichment 条目的 batch：

```bash
npm run vault:prepare-enrichment
```

按 source 准备 batch：

```bash
npm run vault:prepare-enrichment -- codepen
npm run vault:prepare-enrichment -- iosdevweekly
npm run vault:prepare-enrichment -- uxweekly
npm run vault:prepare-enrichment -- fatbobmanweekly
npm run vault:prepare-enrichment -- github
```

回写 enrichment 结果：

```bash
npm run vault:apply-enrichment -- /path/to/enrichment.json
```

手动重建展示页：

```bash
npm run vault:render-gallery
```

清理 weekly 非核心栏目条目：

```bash
npm run vault:cleanup-weekly
```
