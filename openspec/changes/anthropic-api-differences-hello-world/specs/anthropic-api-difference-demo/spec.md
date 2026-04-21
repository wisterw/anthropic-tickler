## ADDED Requirements

### Requirement: Runnable Anthropic Difference Hello-World
The repository SHALL include a hello-world program that executes successfully against the Anthropic Messages API and can be run with a single documented command.

#### Scenario: Successful local execution
- **WHEN** a developer sets the required API key environment variable and runs the documented command
- **THEN** the program completes an Anthropic API request and prints a success result with generated text

### Requirement: Anthropic-Specific Feature Demonstration
The hello-world program SHALL demonstrate Anthropic API features that are materially different from equivalent OpenAI API usage, and each demonstrated feature SHALL be identified with a brief explanation in code comments or adjacent documentation.

#### Scenario: Difference annotations are present
- **WHEN** a developer reads the sample and its companion documentation
- **THEN** they can identify each showcased Anthropic-specific feature and why it differs from an OpenAI-equivalent integration pattern

### Requirement: Migration-Focused Error Guidance
The sample SHALL validate required configuration and SHALL emit actionable error guidance for common OpenAI-to-Anthropic migration mistakes before or immediately after request execution.

#### Scenario: Missing configuration fails clearly
- **WHEN** the required API key or required request setup is absent
- **THEN** the program exits with an error that states the missing input and how to correct it

### Requirement: Capability Documentation Mapping
The change SHALL include documentation that maps each showcased behavior to a migration-oriented explanation so developers can adopt the same pattern in their own integrations.

#### Scenario: Behavior-to-guidance mapping exists
- **WHEN** a developer opens the change documentation for the demo
- **THEN** they find a concise mapping between each demonstrated behavior and the corresponding integration guidance
