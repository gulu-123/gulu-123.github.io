# gulu · Hugo + PaperMod

个人学习与项目站点，使用 Hugo **0.169.0** 与本地保存的 PaperMod 主题。

网站：https://gulu-123.github.io/ · 仓库：https://github.com/gulu-123/gulu-123.github.io

## 本地预览

安装 Hugo 0.169.0 后，在项目目录中运行：

```shell
hugo server
```

预览地址：http://localhost:1313/ 。无需 Node.js、Go、npm 依赖或数据库。主题源码已包含在仓库中。

## 看什么

- `/`：介绍、三个学习方向、最新笔记。
- `/notes/`：PaperMod 文章列表。
- `/notes/reading-example/`：正文、目录、代码高亮与复制、表格、脚注示例。
- `/projects/`：项目构想及详情。
- `/archives/`：时间归档。
- `/search/`：本地全文搜索。
- `/about/`：个人介绍。

目前所有文章和项目均为明确标注的示例。首页不把这些内容当作真实完成的学习经历。支持黑白主题切换及手机布局。

## 每日更新

以后在这个 Codex 项目里发当天学习内容、代码或截图，即可整理成标准 Hugo Markdown。源码推送 main 后，由 GitHub Actions 自动构建并更新网站。希望先审阅时，说明“仅草稿，不发布”。

笔记放在 `content/notes/`。图片较多时推荐 page bundle：

```text
content/notes/2026-11-11-linux-scheduling/
  index.md
  experiment.png
```

Frontmatter 示例：

```yaml
---
title: "今天的学习主题"
slug: 2026-11-11-linux-scheduling
date: 2026-11-11T20:00:00+08:00
categories: ["Linux 内核"]
tags: ["源码阅读"]
summary: "这次学习解决的问题。"
draft: false
---
```

分类可选 Linux 内核、操作系统、ROS。slug 是稳定的英文链接，修改标题不会改变网址。普通记录勿加 `demo: true` 或演示 shortcode。草稿设 `draft: true`，默认不构建。

项目放在 `content/projects/`；样式在 `assets/css/extended/gulu.css`；主题原始文件位于 `themes/PaperMod`，定制模板在项目 `layouts/` 中，未直接修改上游主题。

## 构建

```shell
hugo --minify
```

静态页面输出到 `public/`。它是构建产物，Git 已忽略该目录。`AGENTS.md` 和 `scripts/` 是可选的本地维护文件，也已从仓库排除，构建与发布不依赖它们。

## GitHub Pages 部署

配置文件：`.github/workflows/hugo.yaml`。支持 main 分支推送后自动发布，以及 Actions 页面手动触发。

部署流程：

1. 使用仓库 `gulu-123/gulu-123.github.io`，主分支 main。
2. 将本目录源码上传，主题已保存在源码内，不需要额外拉取子模块；不要上传 `public/`、工作区 `.tools/` 或私密文件。
3. 在仓库 Settings → Pages 选择 GitHub Actions。
4. 推送更新或手动运行工作流。它会安装固定版本 Hugo，并使用 Pages 返回的 baseURL 构建，兼容 `/仓库名/` 子路径。
5. 确认 Actions 中 build、deploy 都成功后检查线上页面。

已在本地验证站点根路径及模拟项目子路径的页面、资源与搜索链接。

参考：[Hugo 官方 GitHub Pages 部署文档](https://gohugo.io/host-and-deploy/deploy-to-github-pages/)、[PaperMod](https://github.com/adityatelange/hugo-PaperMod)。组件和许可证记录见 THIRD_PARTY.md。
