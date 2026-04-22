## 1. Scenario Restructuring

- [x] 1.1 Refactor the tickler request setup so each mode defines two ordered prompt calls instead of a single prompt.
- [x] 1.2 Implement per-call request construction that applies `top_p` on the first call and `temperature` on the second call.
- [x] 1.3 Update the prompt definitions to use the revised basic and advanced prompt pairs.

## 2. Advanced Coverage Preservation

- [x] 2.1 Assign advanced-only features such as structured output and extended thinking to the appropriate advanced call while keeping the run behavior explicit.
- [x] 2.2 Preserve local tool and optional built-in tool coverage across the advanced mode sequence.
- [x] 2.3 Update output parsing so advanced call results still detect structured output, `thinking`, and `tool_use` signals.

## 3. Reporting and Documentation

- [x] 3.1 Add per-call diagnostics and overall mode-run pass/fail reporting.
- [x] 3.2 Update README and related documentation to explain the two-call flow, parameter split, and revised expected output.
- [x] 3.3 Verify the revised tickler runs cleanly in both modes and document any runtime prerequisites or limitations discovered during validation.
