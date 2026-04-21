## Context

The repository currently lacks a concrete, runnable example for teams moving from OpenAI-style integrations to Anthropic. The change targets developer enablement, not production runtime behavior. The proposal defines one new capability, `anthropic-api-difference-demo`, which must provide an executable hello-world and clear guidance on Anthropic-specific API behaviors that differ from OpenAI assumptions.

Constraints:
- Keep the example minimal and easy to run locally.
- Highlight differences that are stable and practical for first adoption.
- Avoid broad framework coupling so the sample stays portable.

## Goals / Non-Goals

**Goals:**
- Deliver one hello-world program that performs a successful Anthropic API call and demonstrates multiple Anthropic-specific features in one flow.
- Provide in-code and doc-level explanation of each demonstrated difference relative to OpenAI-equivalent usage.
- Make failure modes explicit for common migration mistakes (missing Anthropic headers/fields, wrong message formatting expectations, unsupported assumptions).

**Non-Goals:**
- Build a full migration toolkit for existing OpenAI codebases.
- Cover every Anthropic endpoint or all model/provider options.
- Introduce production deployment, secrets management infrastructure, or advanced observability.

## Decisions

1. Use a single script-first demo instead of framework integration.
Rationale: fastest path to a trustworthy hello-world and easiest to inspect line-by-line.
Alternative considered: embedding in an app route or CLI framework. Rejected because framework concerns obscure API differences.

2. Demonstrate differences through explicit feature blocks in one execution path.
Rationale: users can run once and observe each Anthropic-specific element without switching files.
Alternative considered: separate scripts per feature. Rejected because context switching increases onboarding friction.

3. Pair code comments with a concise companion README section.
Rationale: comments keep differences close to API calls; README provides quick-reference mapping from OpenAI concept to Anthropic practice.
Alternative considered: docs-only explanation. Rejected because docs without runnable code are less verifiable.

4. Validate required configuration at startup and fail with actionable messages.
Rationale: migration errors should fail fast and explain Anthropic-specific setup requirements.
Alternative considered: defer errors to API responses. Rejected because response-only debugging is slower for first-time users.

## Risks / Trade-offs

- [Feature drift as APIs evolve] -> Mitigation: centralize demonstrated features in one script and add a periodic maintenance task in docs.
- [Overloading a hello-world with too many concepts] -> Mitigation: limit to a curated set of high-signal differences and keep each block short.
- [Users infer this demo is production-ready] -> Mitigation: clearly label scope and non-goals in README and comments.
- [SDK-version compatibility issues] -> Mitigation: pin minimal supported SDK/runtime versions in setup instructions.
