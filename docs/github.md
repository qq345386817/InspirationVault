# GitHub 项目采集与使用

`GitHub` 这条线面向你主动挑出来的独立 repo 链接，不是期刊式采集。

## 采集方式

现在支持直接脚本采集：

```bash
npm run collect:github -- https://github.com/glidea/banana-prompt-quicker
```

默认优先使用本机 Chrome。
如果你想强制切到 Playwright 自带浏览器，可以这样跑：

```bash
GITHUB_BROWSER=playwright npm run collect:github -- https://github.com/glidea/banana-prompt-quicker
```

也支持一次传多个 repo URL：

```bash
npm run collect:github -- https://github.com/glidea/banana-prompt-quicker https://github.com/owner/repo
```

## 这条链会自动做什么

1. 打开 GitHub repo 页面并提取仓库元信息
2. 抽取 repo 名、描述、README 摘要、topics、语言和社交预览图
3. 自动入库到 `vault/`
4. 刷新待 enrichment batch
5. 刷新独立页面

这条线当前按 `repo URL` 判断重复：

- 同一批里重复 URL 只保留一条
- 库里已经存在相同 URL，会自动复用已有 item
- 重复抓取同一个 repo 不会重复入库

## enrichment

GitHub 项目和 Spark / Weekly / UX Weekly / Swift Weekly 分开处理，使用单独的 skill 与 taxonomy：

- `.agents/skills/github-enrichment/`

你可以直接说：

- 用 `github-enrichment` 处理这次新抓的 GitHub 数据

## 展示入口

- [vault/site/github.html](../vault/site/github.html)
  只看 GitHub 项目

如果你想看单条卡片原文，去这里：

- [vault/items/github](../vault/items/github)

## 页面特性

`github.html` 现在会：

- 和 Spark、各类周报分开显示
- 保留仓库封面图
- 重点展示 repo 名、摘要、标签和技术关键词
- 适合浏览“值得记住的开源项目”和“未来可复用的工具形态”
