# sid-tools-web

本專案計劃採 **monorepo**，開發工具不侷限於 Web，交付順序以 **Web 優先**。有發展空間的 CLI、IDE、本機分析與服務型工具先保留在題目池。

目前為研究與 Backlog 規劃階段，尚未初始化實際 apps／packages 或選定技術架構。

- [產品方向與交付形式](docs/product-direction.md)
- [37 張題目卡與完整篩選總覽](research/keyword-review-2026-10-04/README.md)
- [逐詞保留／排除紀錄](research/keyword-review-2026-10-04/keyword-decisions.json)

## 開啟卡片

```sh
pnpm install --frozen-lockfile
pnpm tasks
pnpm exec backlog task list --labels web-first --plain
pnpm exec backlog task list --labels later-delivery --plain
pnpm tasks:web
```

- STW-1～STW-37 皆為 `Needs Refinement`；24 張 Web 優先、13 張後續交付／探索。
- High／Medium／Low 是建議驗證及交付順序；Low 不表示題目沒有價值。
- `pnpm tasks:web` 啟動本機看板，終端機會顯示 URL；瀏覽器不會自動開啟。
- `pnpm tasks:doctor` 檢查卡片 ID 與相依關係。
- Backlog.md 1.53.0 為專案本地相依套件，使用 filesystem-only 模式，未啟用自動 commit 或遠端操作。

卡片透過 `pnpm exec backlog` 維護，請遵循 [AGENTS.md](AGENTS.md)。
