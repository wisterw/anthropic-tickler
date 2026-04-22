## ADDED Requirements

### Requirement: Two-Call Mode Execution
The tickler SHALL execute two ordered prompt calls for each supported mode instead of one standalone request.

#### Scenario: Basic mode runs two calls
- **WHEN** a developer runs the tickler in `basic` mode
- **THEN** the tickler sends exactly two prompt calls in sequence and reports the result for each call

#### Scenario: Advanced mode runs two calls
- **WHEN** a developer runs the tickler in `advanced` mode
- **THEN** the tickler sends exactly two prompt calls in sequence and reports the result for each call

### Requirement: Per-Call Parameter Split
The tickler SHALL set `top_p` on the first call in a mode run and SHALL set `temperature` on the second call in that same mode run.

#### Scenario: First call exercises top_p
- **WHEN** the tickler builds the first request in either mode
- **THEN** the request includes `top_p` and does not rely on `temperature` as the parameter under test for that call

#### Scenario: Second call exercises temperature
- **WHEN** the tickler builds the second request in either mode
- **THEN** the request includes `temperature` and does not rely on `top_p` as the parameter under test for that call

### Requirement: Revised Prompt Set
The tickler SHALL use the revised prompt set for each mode.

#### Scenario: Basic prompts are fixed
- **WHEN** the tickler runs in `basic` mode
- **THEN** the first prompt is `How are you?` and the second prompt is `is that a fact or a feeling?`

#### Scenario: Advanced prompts are fixed
- **WHEN** the tickler runs in `advanced` mode
- **THEN** the first prompt asks for the three publicly traded US stocks with the largest market-cap drop today with structured fields and the second prompt asks for a table of city name, forecast high temperature for today, and forecast low temperature for today for the top five US cities

### Requirement: Advanced Coverage Assignment
The tickler SHALL preserve advanced Anthropic feature coverage across the advanced mode run, including structured output, extended thinking, and tool-related handling.

#### Scenario: Advanced run still requests structured output and thinking
- **WHEN** the tickler performs the advanced mode sequence
- **THEN** at least one advanced call requests structured output and enables extended thinking for that run

#### Scenario: Advanced run still exercises tool behavior
- **WHEN** the tickler performs the advanced mode sequence
- **THEN** the run includes the existing tool declaration and reports any observed `tool_use` and `tool_result` behavior for the advanced sequence

### Requirement: Run-Level Pass and Diagnostics
The tickler SHALL report both per-call status and overall mode-run status.

#### Scenario: Mode passes only when both calls succeed
- **WHEN** both calls in a mode complete without an execution error and required checks for that mode are satisfied
- **THEN** the tickler reports the mode run as passed

#### Scenario: Mode failure identifies the failed call
- **WHEN** one of the two calls in a mode fails or misses a required check
- **THEN** the tickler reports the overall mode run as failed and identifies which call failed and why
