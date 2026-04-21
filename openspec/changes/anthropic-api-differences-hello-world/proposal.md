# Summary / Objective
This tickler is a utility executable designed to hit some selected Anthropic features.  When the tickler is working well against Anthropic we will use it to test an API bridge (to be defined separately).

# Core Behavior
The tickler app will issue simple prompts to the connected LLM and check the response for errors.  There are two modes: basic and advanced.  Here are sample prompts for each mode:
- for basic mode: `How are you?`
- for advanced mode: `What 3 publicly-traded US stock saw the largest drop in market capitalization today?` (show company name, ticker symbol, market cap, and % change -- this also exercises the external tool and structured output requirement).  This will be different on different days and that is ok -- we are not trying to verify the correctness of the information, just the clean execution of the request.

An overall `pass` results if the prompt returns an answer (any answer), without an error, while tickling all parameters and features covered in that mode.  The results do not have to be deterministically the same each time.  Else, a `fail` is returned.  This will be the result if no answer is returned, or if an answer is returned with an error.  In the case of `fail`, the app should state (if available) the details about what passed and what failed on a feature-by-feature basis.

# Settings / environment variables
The tickler app should be written in node. Some of the environment variables may include:
- ANTHROPIC_BASE_URL. Required.
- ANTHROPIC_API_KEY.  Required.
- TRANSPORT_SCHEME.  Which protocol (http vs https) the app will use to connect to the Anthropic API.  If not specified, assume https.

#  List of Anthropic features to exercise

## Core API usage
Use Anthropic's user-facing, real-time / streaming Messages API.  You can use parameter values close to or equal to the default values because we are testing the capability of the API to accept the parameters, not the actual effect of the parameters.
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
## Output processing
- In advanced mode, return the structured output in a table format.
- Check the `thinking` content block and return the result (found or not found).  Neither result is fatal; it's just additional session data.
- Check for the Anthropic-style `tool_use` content block.