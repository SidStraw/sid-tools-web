# STW-12 — PostgreSQL EXPLAIN JSON review

## Post-M1/M2 integrated evidence — 2026-10-16

Parent reports refreshed full `mise exec -- pnpm verify` **PASS**, run `sh_140524f8c00181MFzT6IUIM6mS`: **307 unit/public tests + 54 production E2E tests**, 106 files formatted / 54 strict targets clean, build and audit pass, task cache **0/6**. This includes the eight new isolated source-locator tests and the rounded-zero production regression. The existing TypeScript 7 experimental-API build notice remains. These are parent-run integrated results, not a duplicate fullverify performed by this evidence lane. Oracle2, finalization and commit remain parent-owned; no Oracle2 outcome claimed here.

- Before PostgreSQL 18, per-loop Actual Rows averages are rounded to integers; PG18 can emit fractional values. This tool does not detect server version. Displayed zero can hide an actual per-loop average <0.5 under PG≤17 rounding; it does not establish zero true total rows. Comparisons/states/core numeric API unchanged.
- Beside derived rows, integral Actual Rows with loops>1 now shows a **conditional PG≤17 bound of 0.5 × loops rows**, e.g. **50000 rows at100000loops**. Products are not exact true totals. Fractional/missing rows and loops≤1 do not get this integer-rounding bound. Loops0 remains never-executed, with unavailable products/comparisons.
- Node timing rounded to3 decimals can introduce product error up to **0.0005 × loops ms**, e.g. **50ms at100000loops**. Applicable conditional note is adjacent to derived time; still not query wall-clock or self time. Buffers, statement timings and no-parent-child aggregation semantics unchanged.
- Core support-rule strings, page help, displayed-zero wording and the static JSON export notice disclose these assumptions. The notice includes both formulas and100000loop examples; no raw JSON/source content added to export.
- Executed production browser regression uses Plan Rows1 / Actual Rows0 / Loops100000 / Actual Total Time0.002: raw products stay0rows/200ms, visible rounding bounds50000rows/50ms, downloaded notice required, fractional/never-executed controls preserve distinctions. It passed in the parent integrated run above. Current synthetic screenshots independently show these adjacent bounds on desktop/mobile; screenshot refresh did not rebuild or change frozen source.

Historical authored-remediation scope: `.slim/deepwork/unfinished-cards-2026-10-15/stw-12-rounding-remediation.md`. Its pending statements describe the earlier handoff, superseded by the integrated results above. Evidence refresh handoff: `.slim/deepwork/unfinished-cards-2026-10-15/stw-12-evidence-refresh.md`.

## Reproduce

```sh
mise exec -- pnpm build
mise exec -- pnpm exec vp test run packages/core/src/explain.test.ts tests/explain-source.test.ts tests/package.test.ts
mise exec -- pnpm exec playwright test tests/e2e/explain.spec.ts tests/e2e/tools.spec.ts tests/e2e/sitemap.spec.ts tests/e2e/git-diff.spec.ts tests/e2e/env-check.spec.ts tests/e2e/semver.spec.ts
mise exec -- pnpm verify
```

Latest full acceptance-run counts are **307 unit/public + 54 E2E**, as attributed above. The earlier 2026-10-15 focused run (45 unit/public + 46 relevant E2E) predates M1/M2 and is not the current integrated total. Build first when reproducing package/browser tests so built public output is current. The isolated M1 suite is `tests/explain-source.test.ts`; no database or live production inputs are needed.

## Objective AC mapping

| AC                                                              | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Tree/cost/rows/loops/available timing/buffers, original JSON | Production `tests/e2e/explain.spec.ts` keyboard-selects synthetic Index Scan from native plan tree, checks exact cost/rows/loops/time/buffer/I/O values and units, and clicks timing pointer to select original `0.5` value. Downloaded typed report preserves pointers. Escaped keys, I/O `~1` pointer, last duplicate property/object and missing-field parent fallback all tested. 65 siblings prove lazy 60+5 batches keep last node navigable.                                                                                          |
| 2. EXPLAIN versus actuals; no fabricated time                   | Browser tests EXPLAIN-only null actuals, ANALYZE row/loop pairs with TIMING OFF (no times), partial pairs, omitted fields, invalid metric values and loops=0. Unknown values stay explicit, never silently zero. Error-containing sanitized trees remain clearly invalid, not implied successful.                                                                                                                                                                                                                                            |
| 3. Per-loop/inclusive/loops timing honesty                      | Child Actual Rows10/loop ×10 loops =100 approximate rows, but estimate gap stays10× against Plan Rows1, not100×. Child0.5ms/loop ×10 =5 approximate inclusive ms; parent8ms and child5ms are not summed. Statement9ms remains independent. Parent/child buffer hits12/10 stay separate, no22 or loops multiplication. UI/help/export notice explicitly forbid parent-child sums, subtraction/self time and wall-clock inference.                                                                                                             |
| 4. Fixed examples/estimate gap; not measured improvement        | Three deterministic authored PostgreSQL-shaped fixtures, synthetic provenance explicit in page/demo source/core examples/public test. Browser checks10× underestimate,100× overestimate, zero denominators, equality, never-executed and overflow states. No causal/index recommendation or optimization action/measurement. Unknown SQL/Filter fields are omitted, not interpreted/exported.                                                                                                                                                |
| 5. Local privacy, no persistence/share, clear                   | Browser permits only same-origin GET static assets while inspection/export occurs; localStorage/sessionStorage/query/hash remain empty, no runtime errors. Literal node/relation/schema/alias text creates no executable elements. Edit clears report/selection/source maps/download state and revokes tracked Blob URL. Clear, delayed core load, SPA history/re-entry/reload reset input/results. Shared nine-route mobile/no-JS/deep URL/canonical/sitemap/lazy/privacy regressions pass; hostile long text at320px has no page overflow. |

## Precise support and calculation limits

- Single native JSON statement wrapper, e.g. `[{"Plan":{"Node Type":"Seq Scan"}}]` (this minimal example lacks baseline metrics and would be incomplete). PostgreSQL **12–18 common field subset**, not server-version detection, full PostgreSQL support, other database format support or proof of actual execution. Bare Plan, text/YAML/XML and multiple statements rejected.
- Node Type required; Plans must be arrays of structurally valid nodes. Numeric metrics finite/nonnegative; loops and block counters safe integers; rows/cost/time may be fractional. Invalid string/null/boolean/negative/nonfinite values remain absent/null with diagnostics. Startup greater than Total invalid. Missing baseline cost/rows means incomplete coverage.
- Unknown fields are counted and omitted, never arbitrary JSON passthrough. Plan Width, Parallel Aware, Workers/JIT/Triggers/Filter and join/index-specific details are currently omitted too. Structural/limit errors return no truncated tree. Field errors may retain useful structure but top-level `valid/complete` and visible outcome remain honest.
- `analyze` mode means every node has valid Actual Rows/Loops pairs, not proof of command options. Timing is optional (TIMING OFF). Partial evidence or statement Execution Time with missing node pairs means partial-actuals; no evidence means explain-only. Missing metrics are unknown, not0.
- Cost is planner units, not ms. Actual Rows/Startup Time/Total Time are per-loop averages. Multiplication by loops is only a single-node approximation when operands exist and loops>0, never query wall-clock. Parent/child times and buffers are not summed/subtracted; no exclusive/self time. Parallel work may overlap. Statement timing remains independent.
- Gap factor uses larger/smaller positive **per-loop** rows; direction identifies under/overestimate, ≥10× warns. Plan-zero/actual-zero have explicit states without Infinity. Both zero with executed loop is equal. Loops0 preserves raw source zero but disables comparisons and multiplied quantities. Derived overflow is unknown/incomplete, no numeric Infinity/NaN.
- Buffer/I/O subset and full rules are static page help. Block counters and I/O times remain source quantities, not multiplied by loops. Absent keys are not invented zero counters.
- Bounds: **1,000,000 UTF-16 code units** (not bytes),96 JSON container levels,10,000 containers,2,000 plan nodes,32 plan levels. Includes omitted data; lexical quote-aware resource checks precede JSON.parse. Browser tests reject each bound and malformed JSON with static diagnostics/no echoed parser snippet. Source field names/values can still be sensitive even within the supported subset.

## Original source navigation and lifecycle

- Built public `@sid-tools/core/explain` module loads only on Run through dedicated lazy controller. Existing normalized/core parser unchanged. No package source aliases, database/client dependencies, SQL execution, repo/file reader, network/upload/storage/share actions or CSP widening.
- JSON Pointers are deterministic source positions, not line numbers or cross-edit IDs. App-side source locator only runs after the core returns a structurally accepted, bounded parsed tree. It scans quoted/escaped values without retaining generic original objects; indexes only requested source pointers and their ancestors. Key decoding/escaping follows JSON Pointer; duplicate keys follow **last value wins**, including invalidating stale descendant ranges when the last object lacks a previous field. M1 removes the prior per-duplicate global range scan; eight isolated tests in `tests/explain-source.test.ts` execute in the parent integrated run, alongside existing browser source-navigation cases.
- Source button selects exact original value. Missing fields go to nearest existing parent, visibly labeled. Structural/limit failures have pointers but no fabricated source ranges; unavailable source action is disabled. Raw original textarea remains the source of truth; no original lines claimed.
- Native disclosure lists + real buttons rather than an incomplete ARIA tree widget. Selected-node buttons expose `aria-pressed`; live status names selected pointer. Tree internally scrolls with keyboard focus, child branches lazy, siblings batched60, diagnostics paged50; one detail node at a time. Mobile stacks tree above details, wraps long names/pointers and keeps source textarea scrolling internal.
- Edit/run/demo/clear/dispose removes report, selection ID, source ranges/maps, detail text, diagnostics and download state; all scoped event handlers aborted and Blob URLs revoked. Revision token blocks late cleared/edited/disposed imports; no captured original-input snapshot. Source map is not exported. Re-export revokes prior Blob URL.
- JSON download is supported static core report + explicit local-only/no-measured-optimization notice. Not original arbitrary JSON, not an anonymizer; supported relation/schema/alias/Node Type text can contain secrets. Share only after manual inspection. No SQL/optimization recommendation included.

## Browser-test boundary

Initial large-fixture `locator.fill` calls timed out in Chromium text-insertion automation. Large fixtures (>50,000 code units) now set the actual textarea value and dispatch `input`, then use normal Run/render/download assertions; this tests app invalidation and exact parser limits **without claiming a megabyte native paste throughput benchmark**. Normal fixture editing, keyboard node activation and source selection use real browser input controls. No limit assertion removed, retries/timeout raised or test skipped. Raw source textarea uses `wrap=off` for contained code scrolling.

## Fixed synthetic examples and screenshots

`apps/web/src/pages/explain-demos.ts`:

1. **ANALYZE-shaped:** Nested Loop8ms/loop,1loop,Shared Hit Blocks12; child Index Scan0.5ms/loop,10loops,Plan Rows1 vs Actual Rows10,buffer hits10 and I/O Read Time0.2ms; independent statement Execution Time9ms. Child gap10×, derived100rows/5ms. Adapted from core `EXPLAIN_EXAMPLES.analyze-loops` with one explicit I/O metric to exercise its unit/source display.
2. **EXPLAIN-only:** Seq Scan,Plan Rows10,Total Cost25; no actual/statement times. Unknown labels, no invented zeros.
3. **Partial/never-executed:** Append missing loops and omitted Plan Width; child Index Scan loops0 with raw zero actualrows, no multiplied/comparison metric; second Seq Scan complete rows/loops without times. Incomplete outcome and statement3ms independent.

These are authored fixtures, **not live PostgreSQL/database measurements or evidence of performance improvement**.

All six current images captured **2026-10-16** from the existing post-M1/M2 built production output using agent-browser **HeadlessChrome148.0.0.0**, then read/visually reviewed (automated production tests use Chromium153.0.8010.12). No rebuild, source change or additional fullverify during this evidence refresh. The four original evidence paths were replaced with current images, preserving their design scenarios:

- [1440px — selected ANALYZE child, pointers/units/gap/buffers](desktop-analyze-child.png)
- [390px — stacked tree and metric details](mobile-analyze-child.png)
- [1440px — estimate only, honest unknown actuals](desktop-estimate-only.png)
- [1440px — partial actuals and never-executed child](desktop-partial-never-executed.png)
- [1440px — displayed zero with adjacent conditional rounding bounds](desktop-rounded-zero.png)
- [390px — displayed zero, wrapped bounds beside derived products](mobile-rounded-zero.png)

Rounded-zero screenshot fixture (authored, not a new app demo or database measurement):

```json
[
  {
    "Plan": {
      "Node Type": "Seq Scan",
      "Startup Cost": 0,
      "Total Cost": 20,
      "Plan Rows": 1,
      "Actual Rows": 0,
      "Actual Loops": 100000,
      "Actual Total Time": 0.002
    }
  }
]
```

In the current browser, ANALYZE child10loops shows conditional bounds5rows/0.005ms adjacent to100rows/5ms products. Rounded-zero100000loops shows conditional50000rows/50ms beside displayed0rows/200ms, explicitly **not** true-zero totals, exact true totals, version detection or query wall-clock. The forest master-detail hierarchy remains intact; mobile stacks the tree and cards while the rounding notes wrap within the derived block.

Current width observations: ANALYZE child390px document=390px viewport; rounded-zero390px document=390px and320px document=320px. No agent-browser runtime errors across the refreshed scenarios. Parent automated hostile/long-name containment evidence remains separate from these manual width observations. Existing forest/off-white shell and fonts retained. Strong selected-node green, restrained amber observation blocks, separate raw/derived/statement sections and always-visible timing caveat prevent units or unknown values being mistaken for optimization advice. Mobile action text has44px minimum height. Synthetic inputs only; no secrets or external assets added. Browser/server stopped after capture.
