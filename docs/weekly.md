# Weekly 采集与使用

`iOS Dev Weekly` 这条线面向 iOS 技术周报、工具、代码和行业内容。

## 采集方式

`iOS Dev Weekly` 现在支持直接脚本采集：

```bash
npm run collect:iosdevweekly -- https://iosdevweekly.com/issues/747/
```

默认优先使用本机 Chrome。  
默认会排除这些非核心栏目，只保留技术相关部分：

- `Sponsored Link`
- `Books`
- `Videos`
- `Jobs`
- `And finally...`

如果你想强制切到 Playwright 自带浏览器，可以这样跑：

```bash
WEEKLY_BROWSER=playwright npm run collect:iosdevweekly -- https://iosdevweekly.com/issues/747/
```

如果你确实想把 `And finally...` 也一起收进来，可以显式打开：

```bash
WEEKLY_INCLUDE_AND_FINALLY=1 npm run collect:iosdevweekly -- https://iosdevweekly.com/issues/747/
```

如果你想保留 `Sponsored Link`：

```bash
WEEKLY_INCLUDE_SPONSORED=1 npm run collect:iosdevweekly -- https://iosdevweekly.com/issues/747/
```

如果你想保留 `Books`：

```bash
WEEKLY_INCLUDE_BOOKS=1 npm run collect:iosdevweekly -- https://iosdevweekly.com/issues/746/
```

如果你想保留 `Videos`：

```bash
WEEKLY_INCLUDE_VIDEOS=1 npm run collect:iosdevweekly -- https://iosdevweekly.com/issues/746/
```

如果你想保留 `Jobs`：

```bash
WEEKLY_INCLUDE_JOBS=1 npm run collect:iosdevweekly -- https://iosdevweekly.com/issues/746/
```

如果你之前已经把这些非核心栏目导入过库，现在想把旧数据也清掉，可以运行：

```bash
npm run vault:cleanup-weekly
```

也支持一次传多个 issue URL：

```bash
npm run collect:iosdevweekly -- https://iosdevweekly.com/issues/747/ https://iosdevweekly.com/issues/748/
```

## 这条链会自动做什么

1. 打开 issue 页面并解析栏目
2. 保留 `Sponsored Link`
3. 自动入库到 `vault/`
4. 刷新待 enrichment batch
5. 刷新画廊

当前会保留这些周报结构字段：

- `published_at`
- `comment`
- `section_name`
- `section_slug`
- `position_in_issue`
- `position_in_section`
- `is_sponsored`

## enrichment

Weekly 数据和 Spark 已经完全分开，使用单独的 skill 与 taxonomy：

- `.agents/skills/weekly-enrichment/`

你可以直接说：

- “用 `weekly-enrichment` 处理这次新抓的周报数据”

## 展示入口

- [vault/site/weekly.html](/Users/wangyin/Downloads/CodepenSpark/vault/site/weekly.html)
  只看 Weekly 技术周报

如果你想看单条卡片原文，去这里：

- [vault/items/iosdevweekly](/Users/wangyin/Downloads/CodepenSpark/vault/items/iosdevweekly)

## 页面特性

`weekly.html` 现在已经按周报内容做了专门处理：

- 不显示预览图
- 强调 `Section / Issue / Published`
- 支持 `Section` chips
- 支持 `Sponsored` 过滤
- 不再混入 Spark 的 `Source` 浏览语义
