# Summary / Objective
This tickler is a utility executable designed to hit some selected Anthropic features.  When the tickler is working well against Anthropic we will use it to test an API bridge (to be defined separately).

# Settings / environment variables
The tickler app should be written in node. Some of the environment variables may include:
- ANTHROPIC_BASE_URL
- ANTHROPIC_API_KEY
- PROXY_TYPE (http vs https)

#  List of Anthropic features to exercise

## Core API usage
Use Anthropic's user-facing, real-time / streaming Messages API.
- specify `model`, for example `claude-haiku-4-5`
- specify `stop_sequences`
- specify `top_p`
- specify `max_tokens`
- specify `temperature`
- specify a system prompt via top-level parameter.
- process a small array of messages, alternating between `user` and `assistant` roles.
- request a prompt that results in structured output.
- Ask for extended thinking.
- Add `cache_control` cache breakpoint markers to some messages in the message array.
## Tool use (function calling)
- Create a simple tool.
- Invoke using the `tools` parameter.
- Include a `tool_use` and `tool_result` in the exchange.
- Include one of the built-in server tools, e.g. `web_search`.
## Output processing
- Ask for some structured output and return it appropriately.
- Check the `thinking` content block.
- Check for the Anthropic-style `tool_use` content block.