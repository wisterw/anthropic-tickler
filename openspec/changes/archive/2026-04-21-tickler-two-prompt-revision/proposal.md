## Why

The current tickler covers Anthropic features through one curated request per mode, but it does not reflect the revised runtime plan to exercise multiple calls with parameter separation. We need a follow-on change so the app can validate a two-prompt sequence per mode without rewriting the historical contract of the completed baseline change.

## What Changes

- Revise the tickler run model so each mode performs two prompt calls instead of one.
- Require the first call in each mode to exercise `top_p` and the second call to exercise `temperature`.
- Define the new prompt set for basic mode and advanced mode, including a second advanced prompt that exercises forecast-style tabular output.
- Update pass/fail semantics so a mode passes only when both calls complete and required feature checks are reported for the run.
- Update documentation and diagnostics to explain per-call coverage and the new overall baseline for future bridge comparisons.

## Capabilities

### New Capabilities
- `tickler-two-prompt-flow`: Covers the revised two-call execution model, per-call parameter coverage, updated prompts, and run-level reporting.

### Modified Capabilities

## Impact

- Affects the Node tickler entrypoint and request-construction flow in `src/tickler.js`.
- Affects runtime output and feature diagnostics because checks now need to distinguish call-level and run-level results.
- Affects documentation in `README.md` and any companion notes that describe the baseline behavior for bridge testing.
