## Context

The existing tickler implementation issues one request in `basic` mode and one request in `advanced` mode. The revision changes the behavior to a two-call sequence inside each mode so the run can exercise `top_p` and `temperature` separately while still covering the same Anthropic-oriented diagnostics and bridge-baseline intent.

Constraints:
- The app remains a single local Node executable.
- Existing environment-driven runtime configuration remains in place.
- Advanced mode must continue to cover structured output, extended thinking, and tool-related behavior, even though the prompts are now split across two calls.
- The output should stay easy to compare across direct Anthropic runs and future bridge runs.

## Goals / Non-Goals

**Goals:**
- Run two prompt calls in each mode with deterministic ordering.
- Apply `top_p` only on the first call and `temperature` only on the second call.
- Preserve advanced-mode Anthropic coverage by assigning the richer feature set to the call that needs it.
- Report enough detail to tell which call passed or failed and whether the overall mode run passed.

**Non-Goals:**
- Re-architect the app into separate services or a multi-command harness.
- Add broader feature coverage beyond the revised prompt plan.
- Validate correctness of live market or weather content beyond successful execution and expected output shape.

## Decisions

1. Model each mode as a small ordered scenario containing two request definitions.
Rationale: a scenario list makes the change explicit and avoids scattering prompt-specific conditionals across the code.
Alternative considered: derive the second request by mutating the first request object. Rejected because it makes per-call differences harder to reason about and verify.

2. Keep advanced-only capabilities on the advanced calls, with structured output and tool coverage attached to the prompt that best exercises them.
Rationale: advanced mode still needs strong feature coverage, but not every call must carry every advanced feature if the run-level contract remains clear.
Alternative considered: duplicate all advanced features on both calls. Rejected because it increases noise and makes failures harder to isolate.

3. Track diagnostics at both call level and mode-run level.
Rationale: once one mode contains two requests, a single flat feature checklist is no longer enough to explain failures.
Alternative considered: only emit one aggregate pass/fail line. Rejected because it obscures which request failed and which parameter path was exercised.

4. Update documentation to describe per-call parameter coverage and overall pass semantics.
Rationale: bridge testing depends on operators understanding exactly what each run is expected to do.
Alternative considered: leave docs mostly unchanged and rely on source inspection. Rejected because it weakens the tickler as a reproducible baseline.

## Risks / Trade-offs

- [More requests per run increase total runtime and failure surface] -> Mitigation: keep each call small and print call-by-call results as they complete.
- [Advanced coverage may become uneven across the two calls] -> Mitigation: define explicitly which advanced call owns structured output and tool exercise requirements.
- [Operators may misread per-call failures as full regressions] -> Mitigation: print both per-call status and final mode-level pass/fail summary.
- [Live forecast and market prompts remain nondeterministic] -> Mitigation: validate execution success and response structure rather than factual correctness.
