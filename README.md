# Remote Sandbox Probe

一个静态探测页，用 **Vite + 原生 TypeScript + 原生 CSS** 构建（不使用 React / Vue / Angular），并由 **GitHub Actions** 自动构建、部署到 **GitHub Pages**。

页面展示：

- **UTC 时间**（每秒刷新，毫秒级显示）
- **构建信息**：读取同目录 `./version.json` 的 `commit` SHA 与 `buildTime`
- **仓库信息**（调用 GitHub 公共 API）：仓库全名、star 数、fork 数、最近一次 commit message
- **Refresh 按钮**：重新请求 GitHub API 与 `version.json`
- **暗色 / 亮色模式** 切换（localStorage 记忆，跟随系统偏好）
- **移动端自适应**（≤720px 单列布局）
- **错误兜底**：任何请求失败都会在对应卡片内显示错误信息，绝不白屏

## 仓库 URL

（push 后由 CI 部署，见下方 Pages URL；本 README 在首次 push 前占位）

- 仓库：<REPO_URL_PLACEHOLDER>
- Commit：<COMMIT_PLACEHOLDER>

## GitHub Pages URL

<PAGES_URL_PLACEHOLDER>

> 首次启用 Pages 后可能短暂 404，需等待 Actions `Deploy to GitHub Pages` 运行成功（通常 1–2 分钟）。

## 本地启动

```bash
npm install        # 安装依赖（vite + typescript）
npm run dev        # 本地开发服务器 http://localhost:5173
npm run build      # 类型检查 + 构建到 dist/
npm run preview    # 预览构建产物
```

`public/version.json` 在本地是 `{ "commit": "unknown", "buildTime": "local-dev" }`；真实值由 CI 在构建前注入（见 `.github/workflows/deploy.yml`）。

## 子路径处理（避免 JS/CSS 404）

- `vite.config.ts` 设置 `base: "./"`，使所有资源 URL 为**相对路径**，在 `https://<owner>.github.io/<repo>/` 子路径下也能正确加载。
- `version.json` 通过 `new URL("version.json", import.meta.url)` 相对解析，始终读取**同目录**下的文件。
- 仓库信息 API 的 owner/repo 从 `location.hostname` + `location.pathname` 推断，不硬编码。

## 自动部署

Push 到 `main` 触发 `.github/workflows/deploy.yml`：

1. `npm ci` 安装依赖
2. 写入 `public/version.json`（`GITHUB_SHA` + UTC build time）
3. `npm run build`（含 `tsc --noEmit` 类型检查）
4. `actions/upload-pages-artifact` + `actions/deploy-pages` 部署

## 不包含

- `node_modules/`、`dist/` 已在 `.gitignore` 中排除
- 未提交、未打印任何 token / secret；工作流仅使用默认 `GITHUB_TOKEN` 的最小权限（`contents: read` + `pages: write` + `id-token: write`）

## 目录结构

```
.
├── .github/workflows/deploy.yml   # CI 构建 + Pages 部署
├── public/version.json            # 占位，CI 注入真实值
├── src/main.ts                    # 应用逻辑
├── src/style.css                  # 原生 CSS（暗/亮主题 + 响应式）
├── index.html                     # 入口
├── vite.config.ts                 # base: "./" 子路径处理
├── tsconfig.json
├── package.json
└── README.md
```