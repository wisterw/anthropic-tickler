## Why

Developers who already use the OpenAI API need a concrete, minimal example that demonstrates Anthropic-specific API features and patterns they cannot infer from one-to-one endpoint mapping. A focused hello-world sample reduces onboarding time and prevents incorrect assumptions when porting code.

## What Changes

- Add a runnable hello-world example that calls the Anthropic Messages API and intentionally exercises Anthropic-specific behaviors that differ from OpenAI equivalents.
- Document feature-by-feature differences in the sample flow (for example: prompt caching, betas/headers, tool schema handling differences, and event-stream semantics).
- Include clear setup and execution instructions so users can run the example with a single command.
- Add basic validation and error output that highlights mismatch or unsupported assumptions common in OpenAI-first code.

## Capabilities

### New Capabilities
- `anthropic-api-difference-demo`: Provide a canonical hello-world program and documentation that demonstrate Anthropic API features that are materially different from OpenAI API usage.

### Modified Capabilities
- None.

## Impact

- Affected code: new example program and supporting docs under repository example/docs areas.
- Affected APIs: Anthropic Messages API usage patterns, including headers/options used for Anthropic-specific features.
- Dependencies: may add or pin Anthropic SDK/runtime requirements for the example environment.
- Systems: no production runtime impact; developer enablement/documentation surface only.
