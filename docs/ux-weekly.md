# UX 周报采集与使用

`体验碎周报` 这条线面向体验设计、交互案例、推荐阅读、工具资源和产品发现。

## 采集方式

现在支持直接脚本采集：

```bash
npm run collect:uxweekly -- https://www.ftium4.com/ux-weekly-246.html
```

默认优先使用本机 Chrome。  
如果你想强制切到 Playwright 自带浏览器，可以这样跑：

```bash
UX_WEEKLY_BROWSER=playwright npm run collect:uxweekly -- https://www.ftium4.com/ux-weekly-246.html
```

也支持一次传多个 issue URL：

```bash
npm run collect:uxweekly -- https://www.ftium4.com/ux-weekly-246.html https://www.ftium4.com/ux-weekly-247.html
```

## 这条链会自动做什么

1. 打开 `体验碎周报` 页面并解析栏目
2. 提取 issue 元信息和条目上下文
3. 自动入库到 `vault/`
4. 刷新待 enrichment batch
5. 刷新画廊

默认只保留这几个核心栏目：

- `大产品小细节`
- `推荐阅读`
- `工具资源`
- `产品发现`

像 `招聘信息 / 招聘 / 好工作 / 工作机会 / 求职招聘` 这类栏目会默认排除，不进入最终收集结果。

当前会保留这些结构字段：

- `published_at`
- `comment`
- `section_name`
- `section_slug`
- `position_in_issue`
- `position_in_section`
- `source_image_url`

## enrichment

UX 周报和 Spark / iOS Weekly 已经完全分开，使用单独的 skill 与 taxonomy：

- `.agents/skills/uxweekly-enrichment/`

你可以直接说：

- “用 `uxweekly-enrichment` 处理这次新抓的 UX 周报数据”

## 展示入口

- [vault/site/ux-weekly.html](/Users/wangyin/Downloads/CodepenSpark/vault/site/ux-weekly.html)
  只看 UX 周报

如果你想看单条卡片原文，去这里：

- [vault/items/uxweekly](/Users/wangyin/Downloads/CodepenSpark/vault/items/uxweekly)

## 页面特性

`ux-weekly.html` 现在会：

- 和 `iOS Dev Weekly` 分开显示
- 保留配图预览
- 强调 `Section / Issue / Published`
- 支持 `Section` chips
- 不混入 Spark 的 `Source` 浏览语义
