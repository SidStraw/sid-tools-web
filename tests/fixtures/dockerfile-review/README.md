# Public Dockerfile fixture

Unmodified `24/bookworm-slim/Dockerfile` from [nodejs/docker-node at 84410eeaede25daf49826da8265fbf548cc604fe](https://github.com/nodejs/docker-node/blob/84410eeaede25daf49826da8265fbf548cc604fe/24/bookworm-slim/Dockerfile), retrieved 2026-10-23 Asia/Taipei.

SHA256: `6bfd5dfbca7b0ec447144cefc6a912a36d7c9d1289dacc9d2316e2aea842ce45`. MIT license included as `LICENSE`, from the same commit. No image built and no commands executed.

`report.json` is the actual local Hadolint 2.15.1 result wrapped by the CLI. Raw output is retained in `docs/validation/stw-32/hadolint-raw.json`. Tests rerun the real verified native binary and compare the complete report to this artifact; they do not substitute mocked engine output. Fixed settings disable inline ignores and environment overrides.
