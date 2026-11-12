# gulu Hugo + PaperMod

用户已提供仓库并授权上传、部署 GitHub Pages：`gulu-123/gulu-123.github.io`。站点地址为 `https://gulu-123.github.io/`，主分支 main。沿用该仓库更新，不创建新站点，不改动旧版 Sites。用户说仅草稿或审阅时不要发布。

## 内容维护

- 正式笔记存入 `content/notes/`，推荐 page bundle `content/notes/英文-slug/index.md`，图片放同目录并用相对文件名引用。已有平铺 Markdown 也受支持。
- 用 `archetypes/notes.md` 模板。必需字段 title、slug（与英文文件名保持一致）、date、categories、tags、summary。日期默认 Asia/Shanghai 的实际学习日期；分类为 Linux 内核、操作系统或 ROS。仅示例加 `demo: true` 并调用 demo-note shortcode，正式内容勿加。发布时移除 draft 或设为 false。
- 保留用户的代码、原始观察、未解问题；不要编造已经完成的学习、实验或项目。用户发来当天内容后可直接整理、构建并更新到当前网站，除非明确要求仅草稿或审阅。
- 项目存入 `content/projects/`。保持项目构想与实际成果的区分。

## 构建

使用 Hugo 0.169.0。便携版位于工作区 `.tools/hugo-0.169.0/hugo.exe`；`scripts/preview.ps1` 运行本地预览；`scripts/build.ps1` 构建 public。Windows 沙箱若无法运行 Go 可执行文件，使用经审批的 exec 权限运行。不得修改系统 PATH 或全局安装。

主题源码完整保存在 `themes/PaperMod`，保留 MIT 许可证。修改使用项目级 layouts、assets/css/extended，尽量不修改上游主题文件。

## 验证与交付

内容修改运行 Hugo 构建；布局修改检查浏览器桌面及手机、搜索、分类和文章目录。验证 GitHub Pages 项目子路径的构建，避免硬编码根路径。

部署配置位于 `.github/workflows/hugo.yaml`。推送 main 自动构建发布，另支持手动触发。Pages 的 baseURL 由 configure-pages 输出自动传入。每次源码更新后跟踪对应 Actions 运行到终态，成功后返回网站或文章链接；失败时检查日志并修复，不把代码已推送视为已部署。
