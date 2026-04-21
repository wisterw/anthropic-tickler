## ADDED Requirements

### Requirement: Runnable Node Tickler
The repository SHALL include a Node-based tickler executable that can run with a single documented command and issue requests to Anthropic's streaming Messages API.

#### Scenario: Tickler executes successfully
- **WHEN** a developer sets required environment variables and runs the tickler command
- **THEN** the tickler performs a streaming Messages API request and reports successful completion

### Requirement: Environment-Driven Runtime Configuration
The tickler SHALL read and validate `ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY`, and `PROXY_TYPE` before sending requests.

#### Scenario: Missing environment variable is rejected
- **WHEN** one or more required environment variables are missing or invalid
- **THEN** the tickler exits with actionable error guidance identifying the invalid or missing variable

### Requirement: Core Messages Parameters Coverage
The tickler SHALL send a request that explicitly sets `model`, `stop_sequences`, `top_p`, `max_tokens`, `temperature`, and a top-level system prompt.

#### Scenario: Core request knobs are exercised
- **WHEN** the tickler constructs and sends its primary request
- **THEN** the request payload includes each required core parameter and logs that each parameter was set

### Requirement: Message Flow and Advanced Input Coverage
The tickler SHALL send a small message array with alternating `user` and `assistant` roles, SHALL request structured output, SHALL request extended thinking, and SHALL include `cache_control` breakpoints in selected messages.

#### Scenario: Advanced input elements are present
- **WHEN** the tickler builds the message input array
- **THEN** the array contains alternating roles and includes configured `cache_control` markers where specified

#### Scenario: Structured output and thinking are requested
- **WHEN** the tickler submits the request
- **THEN** the request includes instructions that require structured output and enables extended thinking output

### Requirement: Tool Use and Tool Exchange Coverage
The tickler SHALL define at least one simple tool via the `tools` parameter, SHALL include one built-in server tool invocation (for example `web_search`), and SHALL perform a `tool_use` and `tool_result` exchange in the conversation flow.

#### Scenario: Local tool appears in request
- **WHEN** the tickler sends a request with tools
- **THEN** the payload includes a locally defined tool schema in the `tools` parameter

#### Scenario: Tool exchange is completed
- **WHEN** the model emits a `tool_use` content block
- **THEN** the tickler executes or simulates the tool and sends a corresponding `tool_result` in follow-up messages

#### Scenario: Built-in server tool is exercised
- **WHEN** server-tool coverage is enabled for the run
- **THEN** the tickler requests one built-in server tool and captures success or clear failure diagnostics

### Requirement: Output Block Validation
The tickler SHALL parse response content blocks and SHALL explicitly check for structured output, `thinking` blocks, and Anthropic `tool_use` blocks in output processing.

#### Scenario: Output checks are reported
- **WHEN** a run completes
- **THEN** the tickler reports which expected output block types were observed and flags missing required blocks

### Requirement: Bridge-Readiness Documentation
The change SHALL include documentation that explains how the tickler output can be used as a baseline for future API bridge testing.

#### Scenario: Bridge usage guidance is documented
- **WHEN** a developer reads the companion documentation
- **THEN** they can identify how to run the tickler and interpret results for future bridge validation
