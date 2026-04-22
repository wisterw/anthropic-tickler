# anthropic-tickler

Node-based tickler executable for exercising selected Anthropic API features and collecting bridge-baseline run results.

## Requirements

- Node.js 20+
- Anthropic API key

## Setup

1. Install dependencies:
   - `npm install`
2. Set required environment variables:
   - `ANTHROPIC_BASE_URL` (optional, defaults to `https://api.anthropic.com`)
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

Each mode now runs two ordered calls:

- `basic`:
  - Call 1 prompt: `How are you?`
  - Call 2 prompt: `is that a fact or a feeling?`
- `advanced`:
  - Call 1 prompt: `What 3 publicly-traded US stock saw the largest drop in market capitalization today?`
  - Call 2 prompt: `Return a table of city name, forecast high temperature for today, and forecast low temperature for today for the top 5 cities in the US`

Parameter coverage is split by call:

- Call 1 exercises `top_p`
- Call 2 exercises `temperature`

## Feature Coverage

The tickler exercises the following Anthropic behaviors:

- Two ordered streaming Messages API calls per mode
- Shared request knobs on each call: `model`, `stop_sequences`, `max_tokens`, top-level `system`
- Per-call parameter split: `top_p` on call 1, `temperature` on call 2
- Alternating `user` and `assistant` messages
- `cache_control` markers on message content
- Advanced call 1 structured-output prompt plus local tool exchange
- Advanced call 2 extended thinking request
- Advanced-sequence tool declaration via `tools`
- Advanced call 1 local `tool_use` -> `tool_result` exchange path
- Optional advanced call 2 built-in server tool request
- Output inspection for `thinking` and `tool_use` content blocks per call
- Per-call diagnostics plus overall mode-run pass/fail summary

## Expected Output

Each run prints:

- Runtime configuration summary (mode, base URL, model)
- Per-call headers, prompt text, and parameter-under-test labels
- Structured output table in advanced call 1 when parseable
- Assistant answer text for each call
- Feature-by-feature status (`PASS` or `WARN`) for each call
- Overall mode summary showing which call passed or failed
- Process exit status:
  - `0` pass for the full mode run
  - `1` request/config/runtime error
  - `2` run completed but one or more required call checks failed for the selected mode

## Bridge Baseline Usage

Use successful Anthropic-native runs as baseline evidence before bridge testing:

1. Run `basic` and `advanced` directly against Anthropic.
2. Capture per-call logs and the overall mode summary.
3. Keep the same prompts/settings when the bridge is introduced.
4. Compare bridge run outputs against baseline pass/fail and per-feature diagnostics.

This tickler is intentionally capability-focused. It checks clean execution and feature activation, not correctness of external market data values.

## Validation Notes

- Full end-to-end verification requires a valid `ANTHROPIC_API_KEY` and outbound network access to the configured Anthropic-compatible endpoint.
- If `--enable-built-in-tool` is used, built-in server tool behavior may vary by model or account capability; the tickler reports request and observed results separately.
