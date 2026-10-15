import "./style.css";

/* ------------------------------------------------------------------ *
 *  Remote Sandbox Probe
 *  - UTC clock (1s tick)
 *  - ./version.json  (commit SHA, build time)
 *  - GitHub public API (repo full name, stars, forks, last commit)
 *  - Refresh button re-fetches version.json + GitHub API
 *  - Dark / light theme toggle (persisted)
 *  - Errors are rendered inline, never a white screen
 * ------------------------------------------------------------------ */

type VersionInfo = { commit?: string; sha?: string; buildTime?: string; builtAt?: string };
type RepoInfo = {
  full_name?: string;
  stargazers_count?: number;
  forks_count?: number;
  owner?: { login?: string };
  name?: string;
};

const pad = (n: number): string => String(n).padStart(2, "0");

/* ---------------- UTC clock (updates every second) ---------------- */
function tickClock(): void {
  const now = new Date();
  const h = pad(now.getUTCHours());
  const m = pad(now.getUTCMinutes());
  const s = pad(now.getUTCSeconds());
  const ms = String(now.getUTCMilliseconds()).padStart(3, "0");
  const clock = document.getElementById("utc-clock");
  const iso = document.getElementById("utc-iso");
  if (clock) clock.textContent = `${h}:${m}:${s}.${ms}`;
  if (iso) iso.textContent = `ISO: ${now.toISOString()}`;
}

/* ---------------- helper: show / hide inline error ---------------- */
function setError(id: string, msg: string | null): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (msg) {
    el.textContent = msg;
    el.classList.remove("hidden");
  } else {
    el.textContent = "";
    el.classList.add("hidden");
  }
}

/* ---------------- resolve the GitHub owner/repo from location ----- *
 * Works for both <user>.github.io/<repo>/ and custom domains.        */
function repoFromLocation(): string | null {
  try {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (window.location.hostname.endsWith(".github.io")) {
      // https://<owner>.github.io/<repo>/...  -> first path segment is repo
      if (parts.length >= 1) return `${window.location.hostname.split(".")[0]}/${parts[0]}`;
    }
    // https://github.com/<owner>/<repo>/... -> segments 0,1 are owner/repo
    if (parts.length >= 2 && parts[0]) return `${parts[0]}/${parts[1]}`;
  } catch {
    /* ignore */
  }
  return null;
}

/* ---------------- fetch ./version.json (relative, avoids 404) ------ */
async function loadVersion(): Promise<void> {
  const shaEl = document.getElementById("ver-sha");
  const timeEl = document.getElementById("ver-time");
  try {
    const url = new URL("version.json", import.meta.url).href;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as VersionInfo;
    const sha = data.commit ?? data.sha ?? "unknown";
    const time = data.buildTime ?? data.builtAt ?? "unknown";
    if (shaEl) {
      shaEl.textContent = sha;
      shaEl.title = sha;
      shaEl.classList.remove("bad");
    }
    if (timeEl) timeEl.textContent = time;
    setError("ver-err", null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (shaEl) shaEl.textContent = "—";
    if (timeEl) timeEl.textContent = "—";
    setError("ver-err", `version.json 读取失败：${msg}（检查是否部署到仓库根路径）`);
  }
}

/* ---------------- fetch GitHub public API ------------------------- */
async function loadRepo(): Promise<void> {
  const nameEl = document.getElementById("repo-name");
  const starEl = document.getElementById("repo-stars");
  const forkEl = document.getElementById("repo-forks");
  const commitEl = document.getElementById("repo-commit");
  const statusEl = document.getElementById("api-status");

  const repo = repoFromLocation();
  if (!repo) {
    const m = "无法从当前 URL 推断仓库名（需部署在 <owner>.github.io/<repo>/）";
    if (nameEl) nameEl.textContent = "—";
    setError("repo-err", m);
    if (statusEl) { statusEl.textContent = "失败"; statusEl.className = "v bad"; }
    return;
  }

  try {
    const api = `https://api.github.com/repos/${repo}`;
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    const res = await fetch(api, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = (await res.json()) as RepoInfo;

    if (nameEl) nameEl.textContent = data.full_name ?? `${data.owner?.login ?? "?"}/${data.name ?? "?"}`;
    if (starEl) starEl.textContent = String(data.stargazers_count ?? 0);
    if (forkEl) forkEl.textContent = String(data.forks_count ?? 0);
    setError("repo-err", null);
    if (statusEl) { statusEl.textContent = "成功"; statusEl.className = "v ok"; }

    // last commit (separate endpoint, best-effort)
    try {
      const cRes = await fetch(`${api}/commits?per_page=1`, { headers });
      if (cRes.ok) {
        const arr = (await cRes.json()) as Array<{ commit?: { message?: string } }>;
        const msg = arr?.[0]?.commit?.message;
        if (commitEl) commitEl.textContent = msg ? msg.split("\n")[0] : "—";
      } else if (commitEl) {
        commitEl.textContent = "—";
      }
    } catch {
      if (commitEl) commitEl.textContent = "—";
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (nameEl) nameEl.textContent = "—";
    if (starEl) starEl.textContent = "—";
    if (forkEl) forkEl.textContent = "—";
    if (commitEl) commitEl.textContent = "—";
    setError("repo-err", `GitHub API 请求失败：${msg}（可能触发匿名限流，请稍后点 Refresh 重试）`);
    if (statusEl) { statusEl.textContent = "失败"; statusEl.className = "v bad"; }
  }
}

/* ---------------- Refresh: re-fetch version.json + GitHub API ----- */
async function refreshAll(): Promise<void> {
  const btn = document.getElementById("refresh-btn") as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.textContent = "刷新中…"; }
  await Promise.all([loadVersion(), loadRepo()]);
  const last = document.getElementById("last-refresh");
  if (last) last.textContent = new Date().toISOString();
  const foot = document.getElementById("foot-note");
  if (foot) foot.textContent = `last refresh ${new Date().toISOString()}`;
  if (btn) { btn.disabled = false; btn.textContent = "Refresh"; }
}

/* ---------------- theme toggle (persisted) ------------------------ */
const THEME_KEY = "rsp-theme";
function applyTheme(t: "light" | "dark"): void {
  document.documentElement.setAttribute("data-theme", t);
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = t === "dark" ? "☀️ 亮色" : "🌙 暗色";
  try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ }
}
function initTheme(): void {
  let saved: string | null = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const t: "light" | "dark" =
    saved === "dark" || saved === "light" ? (saved as "light" | "dark") : prefersDark ? "dark" : "light";
  applyTheme(t);
}

/* ---------------- boot -------------------------------------------- */
function boot(): void {
  initTheme();

  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      applyTheme(cur === "dark" ? "light" : "dark");
    });
  }

  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) refreshBtn.addEventListener("click", () => { void refreshAll(); });

  // clock: update every second
  tickClock();
  window.setInterval(tickClock, 1000);

  // initial load
  void refreshAll();
}

// Guard so a thrown error still paints something instead of a white screen.
try {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  document.body.innerHTML = `<pre style="padding:20px;color:#d13c3c;white-space:pre-wrap">初始化失败：${msg}</pre>`;
}