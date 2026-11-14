# Third-party components

- Hugo 0.169.0, https://github.com/gohugoio/hugo/releases/tag/v0.169.0 . Windows portable binary is stored outside the source folder under workspace `.tools/`. Its archive SHA-256 was checked against the official checksums file.
- PaperMod, https://github.com/adityatelange/hugo-PaperMod . Source downloaded from the official master archive on 2026-11-11, then vendored unchanged under `themes/PaperMod`. Archive SHA-256: `bf3baf221f33e780b86a6370e81a949f11caaa75f0c3de54eaa2f1fc9781b5f2a`. MIT license: `themes/PaperMod/LICENSE`.
- Search uses the Fuse.js asset distributed with PaperMod; licenses and upstream files remain with the theme.

Project-level overrides are in `layouts/` and `assets/css/extended/`.

## Optional webfonts

- [Noto Serif SC](https://github.com/notofonts/noto-cjk) and [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) are loaded through Google Fonts with `display=swap`.
- [LXGW WenKai Screen](https://github.com/lxgw/LxgwWenKai-Screen) is loaded from the version-pinned `lxgw-wenkai-screen-webfont@1.7.0` jsDelivr package. Only the Screen family stylesheet is requested; its Unicode subsets use `font-display: swap`.

Font assets are fetched from those providers when available; the site keeps system-font fallbacks and remains readable without them. No font binaries are redistributed in this repository. No analytics, comment or account service is required.
