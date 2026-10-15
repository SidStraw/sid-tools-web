Verdict: official Compose v5.5.0 oracle captured; [23-fixture static-core comparison](comparison.md) PASS. [Final STW-8 acceptance](../README.md#final-acceptance) records fresh full verification and independent review PASS.

# STW-8 isolated CLI evidence

Observed on 2026-10-16 using `/usr/local/bin/docker-compose`, reporting
`Docker Compose version v5.5.0`. Executable SHA-256:
`4a728ee98f89005a90198a9be791e8fdaebbcb5e6af9721251efe0113df37759`.
No downloads, Docker plugin invocation, Docker daemon operations, or service execution.

## Reproduce

From the repository root, with Python 3 and that exact installed standalone Compose:

```sh
python3 docs/validation/stw-8/cli/run.py
mise exec -- pnpm exec vp fmt docs/validation/stw-8/cli/results.json
```

The second command applies repository formatting to the generated JSON without
changing its captured values; `run.py` itself emits unformatted JSON.

The script runs `version`, `config --help`, and **46 config commands** over 23
fixed fixture files, in fresh temporary working directories. Each fixture is copied
to `compose.yaml`; two synthetic support files are also copied. It passes a fresh,
allowlisted environment (`subprocess.run(env=...)`, equivalent to `env -i`), fresh
HOME and DOCKER_CONFIG, bounded PATH, and `COMPOSE_DISABLE_ENV_FILE=1`. No inherited
variables, host `.env`, user Docker configuration, or credentials are used.
Temporary files are removed automatically. Only `results.json` is rewritten.

Primary command in each synthetic working directory:

```sh
/usr/local/bin/docker-compose --project-name stw8oracle --file compose.yaml \
  config --format json --no-env-resolution --no-path-resolution
```

The secondary command additionally passes `--no-interpolate`. Fixture 21 adds
`--profile database` before the project flags. No `--no-consistency` is used.
`results.json` records every exact argv, exit code, stdout, stderr, version, help,
binary hash, environment template, 20-second command timeout, and 64-KiB output
guard. Fixture count is capped at 32. Small controlled fixtures bound expected
output; exceeding the guard aborts recording. Error paths are replaced by
`<fixture-dir>`; warning timestamps remain actual observed CLI output and vary
on rerun. JSON normalization details can vary with CLI versions, so do not treat
this as an unversioned snapshot oracle.

## Observed results

`N` is primary normal-consistency exit code; `I` adds `--no-interpolate`.

| Fixture                     | N / I | Observed result                                                                                                                                                                     |
| --------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01-depends-short            | 0 / 0 | List normalizes to `condition: service_started`, `required: true`.                                                                                                                  |
| 02-depends-long             | 0 / 0 | Preserves healthy condition, required true, restart true; no healthcheck exists in fixture.                                                                                         |
| 03-missing-required         | 1 / 0 | Primary rejects undefined service `missing`.                                                                                                                                        |
| 04-missing-optional         | 1 / 0 | **Also rejects undefined service despite `required: false`.**                                                                                                                       |
| 05-cycle                    | 1 / 0 | Primary reports `first -> second -> first`.                                                                                                                                         |
| 06-network-defaults         | 0 / 0 | Absent, empty list and empty map service networks all attach implicit default.                                                                                                      |
| 07-network-explicit         | 0 / 0 | List/map attachments normalize; primary prunes unused network, secondary retains its declaration.                                                                                   |
| 08-network-undeclared       | 1 / 0 | Primary rejects undefined network.                                                                                                                                                  |
| 09-volumes                  | 0 / 0 | Named, bind, anonymous and long syntax normalize distinctly; primary prunes unused volume, secondary retains it. Relative bind sources stay relative.                               |
| 10-volume-undeclared        | 1 / 0 | Primary rejects undefined named volume.                                                                                                                                             |
| 11-external                 | 0 / 0 | External network/volume names retained; existence not tested.                                                                                                                       |
| 12-profile-required         | 1 / 0 | Inactive profiled dependency is undefined in primary active model.                                                                                                                  |
| 13-profile-optional         | 0 / 0 | Primary omits inactive db service but retains optional depends_on edge to db.                                                                                                       |
| 14-extension                | 0 / 0 | `x-` fields accepted.                                                                                                                                                               |
| 15-unknown-service-field    | 1 / 1 | Unknown service property rejected.                                                                                                                                                  |
| 16-unknown-top-field        | 1 / 1 | Unknown top-level property rejected.                                                                                                                                                |
| 17-interpolated-reference   | 1 / 0 | Primary warns, substitutes empty dependency name, then rejects it; secondary retains expression.                                                                                    |
| 18-interpolation            | 0 / 0 | Primary warns and blanks missing `$VAR`/`${VAR}`, resolves both defaults to `fallback`; JSON keeps escaped `$$SYNTHETIC_UNSET`. Secondary preserves all expressions/default syntax. |
| 19-include                  | 0 / 0 | Synthetic local include adds db; reference resolves.                                                                                                                                |
| 20-extends                  | 0 / 0 | Synthetic local base supplies image and BASE environment alongside CHILD.                                                                                                           |
| 21-profile-active           | 0 / 0 | Explicit database profile includes both services and valid edge.                                                                                                                    |
| 22-network-explicit-default | 0 / 0 | Explicit empty top-level default network is attached.                                                                                                                               |
| 23-network-null             | 1 / 1 | YAML null service networks rejected: `must be a array`.                                                                                                                             |

### Critical handoff observations

1. **In this executable, `--no-interpolate` accepts missing references and cycles
   rejected by the primary command.** No explicit `--no-consistency` was supplied.
   Its exit 0 is not evidence of model consistency. Keep primary results as the
   validation oracle and secondary output only as unresolved normalization evidence.
2. `required: false` differs between an undeclared dependency (rejected) and an
   existing but inactive profiled dependency (accepted). Do not erase this observed
   CLI distinction to fit a predicted interpretation of the specification.
3. Empty collection networks and null networks are not interchangeable in this CLI.
4. CLI config accepts `service_healthy` without an actual healthcheck and accepts
   synthetic external resource names. A successful config command is not runtime
   or health validation.

## Scope and integration boundary

This is an observed **official CLI normalization/validation** reference. The completed
[core comparison](comparison.md) tests the actual analyzer against these captured
records in 68 offline contract tests, without a runtime CLI dependency. The product intentionally analyzes a narrower
single-document, static graph subset. It must preserve unresolved interpolation
rather than blank unknown values, and mark profiles/include/extends/multi-file or
unsupported semantics honestly instead of pretending to resolve them. The synthetic
include/extends cases demonstrate what the official CLI can resolve using controlled
files; the browser analyzer is not expected to read those files. Static graph
warnings may intentionally be more conservative; the comparison explains and tests
each narrower case. Concrete undeclared optional dependencies now error like primary;
existing profiled optional targets remain declared and conditional, not undeclared.

No proof is provided about images, bind-path existence, external-resource existence,
service startup, health, deployment, daemon behavior, or complete Compose schema
conformance. No full verify, build, server, app/core changes, Backlog mutations, or
commits were performed in this lane.

Specification reference supplied by the research lane:
[`compose-spec/compose-spec@914ec15d1fa498969c0df5c1d672306db3256089`](https://github.com/compose-spec/compose-spec/blob/914ec15d1fa498969c0df5c1d672306db3256089/schema/compose-spec.json).
Parent subsequently confirmed the pinned raw URL HTTP200. The CLI binary's embedded
specification is not asserted to equal that snapshot. Final verification and accepted
limitations are linked above; this CLI capture lane itself did not run the full suite.

## Files

- `run.py`: standard-library isolated reproduction harness.
- `results.json`: captured version/help and 46 actual config command records.
- `fixtures/01-*.yaml` through `fixtures/23-*.yaml`: enumerated table above.
- `fixtures/support/synthetic-included.yaml`, `synthetic-base.yaml`: only local
  files referenced by include/extends fixtures.
- `README.md`: command, safety boundary, observed results, and integration handoff.
