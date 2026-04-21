## Context

The change is now a Node-based tickler executable whose primary purpose is to exercise selected Anthropic API features in a consistent, repeatable way. The output will later be used to validate an API bridge (defined separately), so the design must emphasize deterministic behavior, explicit request/response handling, and observable feature coverage.

Constraints:
- Must run as a simple local Node program.
- Must support configurable endpoint and proxy mode through environment variables.
- Must hit the user-facing streaming Messages API and process Anthropic-specific content blocks.
- Must include tool use, including at least one built-in server tool.

## Goals / Non-Goals

**Goals:**
- Provide a single tickler executable that exercises the selected Anthropic features from the revised proposal.
- Ensure request construction covers required knobs (`model`, `stop_sequences`, `top_p`, `max_tokens`, `temperature`, top-level system prompt).
- Ensure output processing verifies structured output, `thinking` blocks, and `tool_use` blocks.
- Enable future API bridge testing by keeping behavior explicit, logged, and easy to replay.

**Non-Goals:**
- Build the bridge itself.
- Cover all Anthropic features or production hardening concerns.
- Introduce a framework-based app or multi-service architecture.

## Decisions

1. Use a single Node executable as the tickler entrypoint.
Rationale: keeps execution reproducible and easy to invoke from local runs and future bridge harnesses.
Alternative considered: multi-file demo app. Rejected to reduce setup and integration overhead.

2. Build one curated streaming request path that includes alternating `user`/`assistant` messages, cache breakpoints, and extended thinking.
Rationale: a single end-to-end flow better reflects how these features interact in real API calls.
Alternative considered: isolated mini-calls per feature. Rejected because it under-tests feature interaction.

3. Include tool use in the same exchange with both local tool definition and built-in server tool invocation.
Rationale: validates function-calling shape plus Anthropic server-tool behavior in one run.
Alternative considered: only local tools. Rejected because proposal explicitly calls for built-in server tool coverage.

4. Treat environment configuration as first-class (`ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY`, `PROXY_TYPE`) with startup validation.
Rationale: bridge testing requires endpoint/proxy variation without code edits.
Alternative considered: hardcoded defaults only. Rejected because it blocks bridge and proxy test permutations.

5. Add explicit response assertions for structured output and Anthropic block types.
Rationale: bridge validation needs machine-checkable evidence that critical features were exercised.
Alternative considered: print-only output inspection. Rejected as too brittle and manual.

## Risks / Trade-offs

- [A single request may become too complex to debug] -> Mitigation: log feature checkpoints and keep each feature block explicitly labeled.
- [Built-in server tools may require account/model support variability] -> Mitigation: fail with clear skip/error messaging and document prerequisites.
- [Streaming and tool exchange ordering bugs] -> Mitigation: structure handlers around event types and add end-of-run validation checks.
- [Proxy/base URL misconfiguration causes opaque failures] -> Mitigation: validate env vars at startup and print resolved runtime configuration safely.
