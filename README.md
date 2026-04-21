# anthropic-tickler

Node-based tickler executable for exercising selected Anthropic API features and collecting bridge-baseline run results.

## Requirements

- Node.js 20+
- Anthropic API key

## Setup

1. Install dependencies:
   - `npm install`
2. Set required environment variables:
   - `ANTHROPIC_BASE_URL` (required)
   - `ANTHROPIC_API_KEY` (required)
   - `TRANSPORT_SCHEME` (`http` or `https`, optional, defaults to `https`)

Example PowerShell session:

```powershell
$env:ANTHROPIC_BASE_URL = "https://api.anthropic.com"
$env:ANTHROPIC_API_KEY = "your-key"
$env:TRANSPORT_SCHEME = "https"
```

Optional toggles:

- `ANTHROPIC_MODEL` (default: `claude-haiku-4-5`)
- `ENABLE_BUILT_IN_TOOL=1` or CLI `--enable-built-in-tool` to request built-in server tool coverage (`web_search_20250305`)

## Run

- Basic mode:
  - `npm run tickler:basic`
- Advanced mode:
  - `npm run tickler:advanced`
- Generic:
  - `npm run tickler -- --mode basic`
  - `npm run tickler -- --mode advanced --enable-built-in-tool`

## Feature Coverage

The tickler exercises the following Anthropic behaviors:

- Streaming Messages API request path
- Request knobs: `model`, `stop_sequences`, `top_p`, `max_tokens`, `temperature`, top-level `system`
- Alternating `user` and `assistant` messages
- `cache_control` markers on message content
- Advanced mode structured-output prompt
- Advanced mode extended thinking request
- Tool declaration via `tools`
- Local `tool_use` -> `tool_result` exchange path
- Optional built-in server tool request
- Output inspection for `thinking` and `tool_use` content blocks

## Expected Output

Each run prints:

- Runtime configuration summary (mode, base URL, model)
- Structured output table in advanced mode when parseable
- Assistant answer text
- Feature-by-feature status (`PASS` or `WARN`)
- Process exit status:
  - `0` pass
  - `1` request/config/runtime error
  - `2` run completed but required feature checks failed for the selected mode

## Bridge Baseline Usage

Use successful Anthropic-native runs as baseline evidence before bridge testing:

1. Run `basic` and `advanced` directly against Anthropic.
2. Capture logs and feature-check summaries.
3. Keep the same prompts/settings when the bridge is introduced.
4. Compare bridge run outputs against baseline pass/fail and per-feature diagnostics.

This tickler is intentionally capability-focused. It checks clean execution and feature activation, not correctness of external market data values.
