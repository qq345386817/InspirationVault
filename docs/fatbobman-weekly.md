# Swift 周报采集与使用

`肘子的 Swift 周报` 这条线面向 Swift、SwiftUI、Apple 平台开发、工程实践和开发工具。

## 采集方式

现在支持直接脚本采集：

```bash
npm run collect:fatbobmanweekly -- https://fatbobman.com/zh/weekly/issue-087/
```

默认优先使用本机 Chrome。
如果你想强制切到 Playwright 自带浏览器，可以这样跑：

```bash
FATBOBMAN_WEEKLY_BROWSER=playwright npm run collect:fatbobmanweekly -- https://fatbobman.com/zh/weekly/issue-087/
```

也支持一次传多个 issue URL：

```bash
npm run collect:fatbobmanweekly -- https://fatbobman.com/zh/weekly/issue-087/ https://fatbobman.com/zh/weekly/issue-088/
```

## 这条链会自动做什么

1. 打开 `肘子的 Swift 周报` 页面并解析栏目
2. 提取 issue 元信息和条目上下文
3. 自动入库到 `vault/`
4. 刷新待 enrichment batch
5. 刷新独立页面

默认只保留这些核心栏目：

- `原创`
- `精选资源`
- `近期推荐`
- `工具`

`诚聘 / 招聘 / 工作机会 / 职位` 这类栏目会默认排除，不进入最终收集结果。

## enrichment

Swift 周报和 Spark / iOS Weekly / UX Weekly 已经完全分开，使用单独的 skill 与 taxonomy：

- `.agents/skills/fatbobmanweekly-enrichment/`

你可以直接说：

- 用 `fatbobmanweekly-enrichment` 处理这次新抓的 Swift 周报数据

## 展示入口

- [vault/site/fatbobman-weekly.html](../vault/site/fatbobman-weekly.html)
  只看 Swift 周报

如果你想看单条卡片原文，去这里：

- [vault/items/fatbobmanweekly](../vault/items/fatbobmanweekly)

## 页面特性

`fatbobman-weekly.html` 现在会：

- 和 `iOS Dev Weekly`、`UX 周报`、`Spark` 分开显示
- 强调 `Section / Issue / Published`
- 支持 `Section` chips
- 不混入其他 source 的浏览语义
