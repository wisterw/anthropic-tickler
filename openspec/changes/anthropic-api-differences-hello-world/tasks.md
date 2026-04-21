## 1. Tickler Foundation

- [x] 1.1 Set up a Node executable entrypoint and add/pin Anthropic SDK dependencies.
- [x] 1.2 Implement environment loading and validation for `ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY`, and `PROXY_TYPE`.
- [x] 1.3 Add a single documented run command and verify the tickler starts from a clean checkout.

## 2. Core Streaming Request Coverage

- [x] 2.1 Implement a streaming Messages API request path.
- [x] 2.2 Ensure request payload sets `model`, `stop_sequences`, `top_p`, `max_tokens`, `temperature`, and top-level system prompt.
- [x] 2.3 Build a small alternating `user`/`assistant` message array and add `cache_control` breakpoints on selected messages.

## 3. Advanced Feature Exercise

- [x] 3.1 Add a prompt path that requires structured output and enables extended thinking.
- [x] 3.2 Define at least one local tool via `tools` and implement `tool_use` to `tool_result` exchange handling.
- [x] 3.3 Add built-in server tool coverage (for example `web_search`) with clear gating and diagnostics.

## 4. Output Processing and Diagnostics

- [x] 4.1 Parse returned content blocks and check for structured output signals.
- [x] 4.2 Detect and report `thinking` content blocks.
- [x] 4.3 Detect and report Anthropic-style `tool_use` blocks.

## 5. Documentation and Bridge Readiness

- [x] 5.1 Document setup and runtime configuration, including base URL and proxy mode usage.
- [x] 5.2 Document each exercised feature and expected observable output.
- [x] 5.3 Add a short guide describing how tickler results will be used as a baseline for future bridge testing.
