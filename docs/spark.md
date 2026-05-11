# Spark 采集与使用

`CodePen Spark` 这条线面向交互灵感、创意编码和视觉模式。

## 推荐采集方式

当前推荐主路径是 **Tampermonkey 用户脚本**。  
原因很直接：它运行在你已经手动打开并完成验证的真实浏览器页面里，稳定性比脚本自动开页高很多。

### 1. 安装并启用用户脚本

1. 安装 Tampermonkey
2. 新建脚本
3. 把 [userscripts/codepen-spark-export.user.js](/Users/wangyin/Downloads/CodepenSpark/userscripts/codepen-spark-export.user.js) 的内容粘进去并保存

### 2. 从 Spark 页面导出 JSON

1. 在正常浏览器里打开目标页面，例如：

```text
https://codepen.io/spark/505
```

2. 如果页面要求验证，就手动通过
3. 页面正常显示后，点击右下角 `导出 Spark JSON` 按钮
4. 脚本会导出当前页面中非 `Sponsored` 的条目 JSON

导出的字段与当前 `vault:import` 兼容，包含：

- `issueId`
- `issueTitle`
- `url`
- `pageTitle`
- `items[].title`
- `items[].href`
- `items[].description`
- `items[].sourceImageUrl`
- `items[].imageSourceType`
- `items[].itemType`

### 3. 导入到 vault

把导出的 JSON 放到固定收件箱目录：

- [vault/inbox](/Users/wangyin/Downloads/CodepenSpark/vault/inbox)

然后直接执行：

```bash
npm run vault:import
```

导入后，再告诉我：

- “用 `inspiration-enrichment` 处理这次新抓的数据”

我会继续补中文、分类、决策字段，并刷新画廊。

## 备用采集方式

仓库里仍然保留了 `collect:spark`：

```bash
npm run collect:spark -- https://codepen.io/spark/505
```

它现在是备用路径，不建议作为日常主方案。原因是目标站一旦重新触发风控，这条链路的稳定性仍然不可控。

如果你仍然想连续抓多个 Spark，可以一次传多个 URL：

```bash
npm run collect:spark -- https://codepen.io/spark/506 https://codepen.io/spark/507 https://codepen.io/spark/508
```

## enrichment 与提案

Spark 数据的 enrichment skill 是：

- `.agents/skills/inspiration-enrichment/`

当你已经收集了一些条目，想基于它们做项目方向提案时，可以让我使用：

- `.agents/skills/inspiration-briefing/`

例如：

- “用 `inspiration-briefing` 给 playful 的工具站提 3 个方向”
- “从现有 vault 里找适合 AI 产品首页、成本不要太高的方向”

## 展示入口

- [vault/site/spark.html](/Users/wangyin/Downloads/CodepenSpark/vault/site/spark.html)
  只看 Spark 灵感

如果你想看单条卡片原文，去这里：

- [vault/items/codepen](/Users/wangyin/Downloads/CodepenSpark/vault/items/codepen)

## 配图策略

当前展示层优先使用 Spark 卡片原图，而不是截图。

顺序是：

1. 从 Spark 页面提取卡片配图 URL
2. 下载原图到 `vault/assets/...`
3. 生成：
   - `thumbnail`
   - `preview`
   - `hero`
4. 画廊优先使用：
   - `thumbnail_path`
   - `preview_image_path`
   - `hero_image_path`
   - `source_image_path`
   - `screenshot_path`

整页截图或目标页截图目前只是未来 fallback，不是主路径。
