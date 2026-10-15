# STW-8 — Compose static preflight

Accepted 2026-10-16: bounded core, public integration and production-browser evidence passed final verification and independent review. All examples are fixed synthetic data. This is not full Compose schema, CLI parity, runtime or health validation.

## Final acceptance

- Parent accepted fresh `mise exec -- pnpm verify` (run `sh_1417609c7001XrVxq346U7ND9b`): **827 unit/public tests, 138 production E2E tests, 204 formatted files, 103 strict/type-aware checked files**, build and audit PASS; **0/6 cache hits**. Existing TypeScript7 experimental API notice remains nonblocking.
- The initial full verification failed only six CLI evidence formatting checks. Exact six-file formatting repair preserved parsed YAML/JSON values, reran **129 focused tests**, and passed formatting checks. The fresh full verification above then passed; no source workaround or CLI result regeneration was needed.
- Independent Oracle attempt1 and structure gate **PASS, no material findings**. Review exercised bounded parser/graph/privacy behavior with synthetic built-module probes; structure checked public/private package boundaries, dedicated worker, route/SSG/test consistency and unchanged CSP. Parent accepted both reports.
- All five acceptance criteria below are supported by actual core/public/browser tests, **23 fixed fixtures / 46 official CLI config commands / 68 offline comparison tests**, and **10 individually reviewed production screenshots**. No Definition of Done items are configured. Finalization changes only documentation and CLI task metadata; valid full verification was not repeated for these changes.

## Reproduce

Use the project mise toolchain, then:

```sh
mise exec -- pnpm build
mise exec -- pnpm exec vp test run packages/core/src/compose.test.ts packages/core/src/compose-parser.test.ts packages/core/src/compose-cli.test.ts tests/package.test.ts
mise exec -- pnpm exec playwright test tests/e2e/compose.spec.ts tests/e2e/tools.spec.ts
```

For manual inspection, start `mise exec -- pnpm exec wrangler pages dev --ip 127.0.0.1 --port 4173 --show-interactive-dev-session=false` and open `/tools/compose/`. Choose a case, then explicitly Run. Source edits and demo loading never parse automatically. Stop your server afterward; Playwright needs the port free.

## Reference and oracle

- Schema reference: [pinned compose-spec snapshot](https://github.com/compose-spec/compose-spec/blob/914ec15d1fa498969c0df5c1d672306db3256089/schema/compose-spec.json), schema updated 2026-09-17. Parent confirmed its raw URL HTTP200. It is a reference, not a runtime schema download or a claim that CLI embeds that exact version.
- Actual standalone official Docker Compose **v5.5.0** captured by the separate CLI evidence owner: [method](cli/README.md), [46 results](cli/results.json), [23-fixture comparison](cli/comparison.md). This integration did not edit or rerun that evidence.
- Primary `config --format json --no-env-resolution --no-path-resolution` is the consistency oracle. Secondary adds `--no-interpolate`; in this version it accepts missing references and cycles rejected by primary, so exit0 is not consistency proof.
- Concrete undeclared dependencies, even required:false, are invalid like primary. Defined profiled optional dependencies remain declared and conditional, not undeclared. No profiles are selected. Interpolation, include/extends/files and profile activation deliberately remain narrower and unresolved/partial. CLI may substitute blanks/defaults or read support files; the product never does.
- Neither config acceptance nor complete static coverage proves image availability, external resource existence, Docker daemon behavior, service startup, health or completion.

## Design and source navigation

The accepted warm offwhite/forest shell and responsive navigation are retained. Seven panels lead from source to coverage, selected-service focus map, declaration inventory, references/cycles, diagnostics, and a deliberate metadata download.

The map is a safe app-owned HTML relationship view, not an extra SVG export or a deployment topology claim. Its left origin and three right tracks separate depends_on, network attachments and mounts. Mobile stacks those tracks without shrinking labels. Target cards exist only for actual accepted declarations; missing/unresolved records never invent nodes or certain connections. Conditional cards are dashed amber with explicit text; status is not color-only. Each track and full list paginates50 without truncating the accepted model. Counts and summary include all records, even when a focus/filter/page hides some.

Service/resource/reference/diagnostic controls select original core UTF16 end-exclusive ranges with 1-based line/column and YAML path. Implicit default resource has no fabricated declaration range. Dynamic keys use @dynamic:index, not interpolated expressions. Names and paths wrap in controls, and keyboard Enter works. Full accessible lists provide the same source navigation as the map.

Nine fixed cases cover declared dependency/network/named/bind/anonymous/default; profile/external; missing optional dependency/resources; conditional and unconditional SCCs; interpolation/include/extends; unsupported settings/extensions; null networks; YAML aliases; depth limit. Source is editable and never executed.

## Five accepted criteria and evidence

1. **Specification/source structure:** pinned reference and explicit coverage disclosures, diagnostics with actual paths/ranges, null networks invalid, unsupported aliases partial/no model, limit clears model. Public typed entry and actual worker tests exercise the parser, not a mocked result alone.
2. **Declarations/references/cycles:** dependency condition/required/restart, service profiles, distinct network/volume/bind/anonymous records, implicit default, external not-checked, unused declarations without inferred attachments. Missing optional target invalid; defined profiled optional target conditional. Actual declared SCCs distinguish unconditional/conditional, no invented execution order.
3. **Interpolation and multifile unknowns:** defaults never evaluated or replaced empty; dynamic references unresolved rather than literal missing. Include/extends/environment/files not read, inherited network default not guessed. Profile activation remains unknown; conditional does not mean active.
4. **Actual CLI comparison and runtime disclaimer:** inherited68 offline comparison tests independently compare23 fixtures with captured primary/secondary results; no obsolete optional-warning deviation. Root guide and page explain narrower scope, secondary limitation, and no health/runtime guarantee. CLI directory untouched by integration.
5. **Local privacy and clear:** no login, Docker calls, source network/storage/query/hash/share/logging. Dedicated Run-only worker and public-helper-only consented metadata summary; hostile invalid names remain plain text in diagnostics, no image/script execution. Editing/clear/cancel/back/reload/disposal discard results and revoke downloads.

## Executed validation

- Production build PASS: **17 core pack entries/declarations,16 SSG routes**, lazy Compose page and dedicated worker;0/2 cache hits. Existing TypeScript7 experimental API notice retained.
- Focused core/parser/CLI comparison/public suite: **142/142 tests**,4files (129 inherited +13 public). No inherited source/test edits.
- Production Playwright: **24/24 in23.8s**,12Compose+12shared, none skipped. Includes actual module worker, graph/source/keyboard, all statuses and distinctions, real summary download, redaction, request/storage/URL/log checks, stale reply/id/kind/shape,20s virtual-clock timeout, start/load/error/messageerror, edit/newrun/cancel/clear/dispose/back/reload, Blob timer/edit/dispose, delayed helper and export/import failures,320/390 layout and pagination.
- Scoped strict/type-aware check: **15 formatted files,10 typed files; zero warnings/lint/type errors**. Evidence README formatter separately checked. Scoped tracked whitespace check clean.
- Initial E2E failures were corrected test assumptions, not core workarounds: locator matched both record/resource; invalid hostile names are rejected but safely visible in diagnostic paths; valid long names use accepted grammar;60 anonymous mounts plus implicit default yield61 attachments and50+11 pages. Final24/24 rerun passed.
- Integration-only results above are supplemented by the accepted fresh root full verification, audit and independent reviews in [Final acceptance](#final-acceptance).

## Current screenshots — each individually reviewed

Captured via agent-browser sessionstw8 against the tested production build. HeadlessChrome148.0.0.0 useragent (Macintosh Intel MacOSX10_15_7), different from Playwright Chromium153.0.8010.12. Browser errors empty. No code changed after build/E2E/captures; only this evidence and ignored handoff were added afterward.

| Image                          | Viewport and observation                                                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `desktop-declared.png`         | 1440×1000 full page. Web focus, complete static subset,2services/2networks/3volumes/1dependency/6attachments. Separate tracks; all declared resources including unused volume, no inferred unused mount. |
| `mobile-declared.png`          | 390×844 full page. Stacked focus/inventory, readable wrapping, source internal scroll. Document width390=viewport390.                                                                                    |
| `desktop-profile-external.png` | 1440×1000 full page. Partial; declared optional profiled db dashed amber, external resource existence not-checked, no selected profiles.                                                                 |
| `mobile-profile-external.png`  | 390×844 full page. Same state with stacked service/target cards and explicit condition labels. Document390=viewport390.                                                                                  |
| `desktop-unresolved.png`       | 1440×1000 full page. Partial interpolation/include/extends, image and refs unresolved, zero fabricated networks/volumes,13 located diagnostics.                                                          |
| `desktop-cycles.png`           | 1440×1000 full page. Invalid unconditional SCC plus conditional testing-profile SCC, membership and actual dependencies shown, not an execution order.                                                   |
| `mobile-missing.png`           | 320×760 full page. Invalid missing dependency/network/volume, no target cards. Document320=viewport320.                                                                                                  |
| `mobile-unresolved.png`        | 320×760 full page. Partial dynamic references and redacted dynamic paths; narrow controls/diagnostics wrap. Document320=viewport320.                                                                     |
| `desktop-focus-detail.png`     | 1440×1000 viewport detail. Full-size readable dependency condition/required/restart, dashed declared profiled target, actual source ranges; separate shared external network card.                       |
| `mobile-focus-detail.png`      | 390×844 viewport detail. Full-size origin/conditional dependency/target stack; path/source buttons wrap within card, no clipped labels.                                                                  |

## Security, limits and cleanup

All user metadata uses textContent in app-owned HTML; no user markup/SVG/foreignObject/styles/links/external resources. The pinned reference link is fixed, not derived from worker input. No new drawing dependency or CSP widening. The page only imports public core types; actual analyzeCompose runs exclusively inside the dedicated worker. Summary helper lazy-loads only on deliberate download, never falls back to source/report stringify. Summary omits raw YAML/image/env/command/mount paths/values; names/profiles/source paths remain sensitive, so consent is required and reset on edits. Blob URLs revoke after1s/reset/disposal/failure; delayed imports recheck revision/report identity/consent.

Core bounds:500K UTF16; tokens/nodes100K; depth64; entries10K; scalar/token65,536; names/keys256; services/networks/volumes128 each; references4K; diagnostics500; work100K; path2048/total1M. A20s worker timeout bounds page waiting, not a performance guarantee. Unsupported/invalid/partial results may retain useful declarations, never imply full validity; limit has no model/export.

Accepted coverage limits: YAML anchors/aliases/tags/merge are unsupported even inside `x-*`, returning partial with no graph; common shared-anchor Compose patterns are therefore outside this first version. Each unsupported key/interpolated string can consume a diagnostic; realistic large or interpolation-heavy files may reach the500-diagnostic cap and fail safe with limit/no graph. Profiles are unselected, and `extends` conservatively marks services conditional; conditional does not assert an active deployment. Unknown interpolation stays unknown, even with defaults; no empty substitution, environment lookup or file inheritance. Unknown fields remain partial, not full-schema validation. External existence, startup and runtime health remain unverified.

Capture browser and localhost server were stopped. Finalization is restricted to evidence linkage, CLI completion of STW-8 and its isolated local commit. Reserved research/cards and progress remain untouched; no push or deployment is authorized or performed.
