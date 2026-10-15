# STW-8 core versus captured Compose v5.5.0

PASS — actual core analysis of all 23 fixed YAML fixtures, compared with the 46
captured CLI records in `results.json`. This is bounded static-subset agreement
and explicitly tested narrower behavior, **not full Compose or runtime parity**.

## Method and reproducibility

`packages/core/src/compose-cli.test.ts` reads each fixed fixture and runs the real
`analyzeCompose` implementation. It reads the captured outputs of the executable
identified in the existing evidence README: Compose v5.5.0, SHA-256
`4a728ee98f89005a90198a9be791e8fdaebbcb5e6af9721251efe0113df37759`.
The comparison does not rerun Docker, require Docker in tests, regenerate oracle
outputs, or add production filesystem hooks/dependencies.

```sh
mise exec -- pnpm exec vp test run packages/core/src/compose.test.ts packages/core/src/compose-parser.test.ts packages/core/src/compose-cli.test.ts
mise exec -- pnpm exec vp check packages/core/src/compose.ts packages/core/src/compose-parser.ts packages/core/src/compose.test.ts packages/core/src/compose-parser.test.ts packages/core/src/compose-cli.test.ts
```

Observed 2026-10-16: **129 tests passed in 3 files** (315ms); scoped formatting,
strict/type-aware lint/type checks clean across 5 files (204ms). Of these, 68 are
offline oracle-contract tests; 61 cover core/parser regressions and bounds. Every
fixture has independently specified core status/count expectations and assertions
against both captured exit codes. Tests also check fixture/record completeness,
version, digest, and primary/secondary flag distinction. No broad/full verification,
build, server, browser, or fresh CLI harness run was performed in this follow-up.

For supported static identities, comparisons normalize both sides independently
to sorted service names, dependency tuples `(source, target, condition, required,
restart)` and attachment tuples `(source, network|volume|bind|anonymous, target)`.
Missing restart normalizes to false; anonymous and bind attachments retain no
path values. Actual tuple equality checks target identities, counts, defaults,
mount categories, and dependency options, not merely success exit codes. Used
resource-name sets are compared against successful primary output; all declared
resource-name sets against secondary output. External flags are compared, but
runtime external names are deliberately absent from core reports/exports.

**Primary normal-consistency records are authoritative for concrete failures.**
Secondary `--no-interpolate` records unexpectedly skip missing-reference/cycle
consistency checks. They are used only as unresolved/declaration normalization
evidence, never as proof an application is valid.

## Per-fixture results

Counts are core `services/dependencies/attachments/networks/volumes/cycle-SCCs`.
N/I are captured primary/secondary exit codes. “Consistent” means only the stated
covered graph checks agree. “Narrower” means intentional unknown/unsupported scope,
with test assertions of the discrepancy rather than parity claims.

| Fixture                     | N/I | Core status; counts   | Comparison and classification                                                                                                                                                    |
| --------------------------- | --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01-depends-short            | 0/0 | complete; 2/1/2/1/0/0 | Consistent: service names, started/required default, false restart, implicit default attachments.                                                                                |
| 02-depends-long             | 0/0 | complete; 2/1/2/1/0/0 | Consistent: healthy/required/restart retained. Neither side establishes runtime health.                                                                                          |
| 03-missing-required         | 1/0 | invalid; 1/1/1/1/0/0  | Consistent primary undefined-service reference error; secondary retains declaration edge only.                                                                                   |
| 04-missing-optional         | 1/0 | invalid; 1/1/1/1/0/0  | Consistent primary error even required:false; target is concretely undeclared, not inactive.                                                                                     |
| 05-cycle                    | 1/0 | invalid; 2/2/2/1/0/1  | Consistent primary cycle failure and actual unconditional SCC; normalized edges match secondary.                                                                                 |
| 06-network-defaults         | 0/0 | complete; 3/0/3/1/0/0 | Consistent: absent, [] and {} all attach default, exactly one default resource.                                                                                                  |
| 07-network-explicit         | 0/0 | partial; 2/0/2/2/0/0  | Edges consistent; narrower for aliases (unsupported). Primary prunes unused network; core retains declaration like secondary.                                                    |
| 08-network-undeclared       | 1/0 | invalid; 1/0/1/0/0/0  | Consistent primary undefined-network error, missing edge retained but no invented resource.                                                                                      |
| 09-volumes                  | 0/0 | complete; 1/0/6/1/3/0 | Consistent named/bind/anonymous/long mount categories and target declaration keys. Primary prunes unused volume; core/secondary retain it.                                       |
| 10-volume-undeclared        | 1/0 | invalid; 1/0/2/1/0/0  | Consistent primary undefined-volume error; default network plus missing named-volume edge.                                                                                       |
| 11-external                 | 0/0 | partial; 1/0/2/1/1/0  | Graph/external flags consistent; narrower: existence explicitly not checked, runtime names not exported.                                                                         |
| 12-profile-required         | 1/0 | partial; 2/1/2/1/0/0  | Narrower: primary selects default active set and rejects inactive db. Core keeps declared conditional db and edge; no activation selected. Declaration graph matches secondary.  |
| 13-profile-optional         | 0/0 | partial; 2/1/2/1/0/0  | Narrower: primary removes inactive db but retains optional edge. Core keeps conditional declaration, not a missing error; declaration graph matches secondary.                   |
| 14-extension                | 0/0 | complete; 1/0/1/1/0/0 | Consistent graph; x-* ignored explicitly with info, never invalid.                                                                                                               |
| 15-unknown-service-field    | 1/1 | partial; 1/0/1/1/0/0  | Narrower: CLI schema rejects; core warns unsupported/unknown field, never claims full-schema acceptance.                                                                         |
| 16-unknown-top-field        | 1/1 | partial; 1/0/1/1/0/0  | Same narrower policy for unknown top-level fields.                                                                                                                               |
| 17-interpolated-reference   | 1/0 | partial; 1/1/1/1/0/0  | Narrower: primary substitutes empty and rejects; core targetName/targetId null, unresolved, no guessed missing target. Secondary retains expression.                             |
| 18-interpolation            | 0/0 | partial; 1/0/1/1/0/0  | Graph consistent; narrower values: no blank/default substitution or env resolution. Four unresolved diagnostics; escaped $$ not treated as unresolved. Core export omits values. |
| 19-include                  | 0/0 | partial; 1/1/1/1/0/0  | Narrower: CLI reads synthetic include and adds db. Core reads no file, only local web, dependency unresolved rather than falsely missing.                                        |
| 20-extends                  | 0/0 | partial; 1/0/0/0/0/0  | Narrower: CLI inherits base image/env/default network. Core no inheritance; image absent, conditional, no guessed default attachment.                                            |
| 21-profile-active           | 0/0 | partial; 2/1/2/1/0/0  | Declaration graph consistent with both records; narrower because CLI explicitly enables database, core still has no activation input.                                            |
| 22-network-explicit-default | 0/0 | complete; 1/0/1/1/0/0 | Consistent: implicit service attachment reuses explicitly declared default resource.                                                                                             |
| 23-network-null             | 1/1 | invalid; 1/0/0/0/0/0  | Consistent null service-networks shape error, no default inference. Not interchangeable with empty collection.                                                                   |

## Resolved correction and remaining boundaries

The earlier warning-only interpretation of an undeclared `required:false` target
was a research assumption, not product policy. It is removed. A concrete missing
target now produces an error-category reference diagnostic and `invalid` whether
required true or false. The obsolete deviation warning/code/coverage is gone.
Existing profiled targets are not undeclared; unresolved include/extends/dynamic
declarations still prevent false concrete errors. Focused regressions cover each
of these distinctions, including optional dependencies in incomplete contexts.

The table supersedes any earlier blanket statement that primary normalization
retains unused resources: captured primary fixture07/09 prunes unused declarations,
whereas secondary and this declaration atlas retain them. This is not an invented
attachment; core only creates edges from actual references/default rules.

Core remains a single-document bounded static graph analyzer, not schema/runtime
validation. Partial/invalid snapshots can contain useful declarations; complete
means only covered subset checks completed. Names/profiles/source paths may be
sensitive metadata; raw image/environment/command/mount/runtime-name values are
not exported. No application startup, profile compatibility for every activation
set, bind-path existence, image availability, health, or external existence is
proved. Parent separately confirmed the pinned spec raw URL returns HTTP200;
the CLI binary's embedded spec is not asserted to equal that reference snapshot.
