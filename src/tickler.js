#!/usr/bin/env node

import process from 'node:process';

const args = parseArgs(process.argv.slice(2));
const mode = args.mode || 'basic';
if (!['basic', 'advanced'].includes(mode)) {
  fatal(`Invalid mode '${mode}'. Use --mode basic or --mode advanced.`);
}

const config = getConfig();
const scenarios = buildScenarios(mode, args);

try {
  logRuntime(config, mode, scenarios);

  const callResults = [];
  for (const scenario of scenarios) {
    console.log(`\n=== ${scenario.label} ===`);
    console.log(`Prompt: ${scenario.displayPrompt}`);
    console.log(`Parameter under test: ${scenario.parameterUnderTest}`);

    const callResult = await runScenarioCall(scenario, config);
    callResults.push(callResult);

    printCallOutput(callResult);

    if (callResult.error) {
      break;
    }
  }

  printModeSummary(mode, callResults);
  process.exit(evaluateModePass(mode, callResults) ? 0 : 2);
} catch (error) {
  console.error('\nTickler run failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode') {
      parsed.mode = argv[i + 1];
      i += 1;
    } else if (arg === '--enable-built-in-tool') {
      parsed.enableBuiltInTool = true;
    }
  }
  return parsed;
}

function getConfig() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const baseUrlRaw = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  const transportScheme = (process.env.TRANSPORT_SCHEME || process.env.PROXY_TYPE || 'https').toLowerCase();

  const errors = [];
  if (!apiKey) {
    errors.push('ANTHROPIC_API_KEY is required.');
  }
  if (!['http', 'https'].includes(transportScheme)) {
    errors.push('TRANSPORT_SCHEME must be http or https.');
  }

  if (errors.length > 0) {
    fatal(['Configuration error(s):', ...errors].join('\n- '));
  }

  let baseUrl = baseUrlRaw.trim();
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `${transportScheme}://${baseUrl}`;
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ''),
    transportScheme
  };
}

function buildScenarios(selectedMode, parsedArgs) {
  const builtInToolEnabled = Boolean(parsedArgs.enableBuiltInTool || process.env.ENABLE_BUILT_IN_TOOL === '1');

  const scenarioMap = {
    basic: [
      {
        id: 'basic-call-1',
        label: 'Basic call 1',
        displayPrompt: 'How are you?',
        prompt: 'How are you?',
        parameterUnderTest: 'top_p',
        systemPrompt: 'You are an API tickler assistant. Keep responses short and conversational.',
        top_p: 1,
        includeLocalTool: false,
        includeBuiltInTool: false,
        expectStructuredOutput: false,
        enableThinking: false
      },
      {
        id: 'basic-call-2',
        label: 'Basic call 2',
        displayPrompt: 'is that a fact or a feeling?',
        prompt: 'is that a fact or a feeling?',
        parameterUnderTest: 'temperature',
        systemPrompt: 'You are an API tickler assistant. Keep responses short and conversational.',
        temperature: 0.2,
        includeLocalTool: false,
        includeBuiltInTool: false,
        expectStructuredOutput: false,
        enableThinking: false
      }
    ],
    advanced: [
      {
        id: 'advanced-call-1',
        label: 'Advanced call 1',
        displayPrompt:
          'What 3 publicly-traded US stock saw the largest drop in market capitalization today? (show company name, ticker symbol, market cap, and % change)',
        prompt:
          'What 3 publicly-traded US stock saw the largest drop in market capitalization today? You must call the format_market_rows tool before your final answer. If live data is unavailable, use placeholder values such as "Unavailable" so the tool exchange still completes. Return strict JSON with key "rows" as an array where each row has company, ticker, marketCap, percentChange.',
        parameterUnderTest: 'top_p',
        systemPrompt:
          'You are an API tickler assistant. Keep responses short. You must call the format_market_rows tool exactly once before your final answer, then return only strict JSON for rows.',
        top_p: 1,
        includeLocalTool: true,
        includeBuiltInTool: false,
        expectStructuredOutput: true,
        enableThinking: false,
        forceLocalTool: true
      },
      {
        id: 'advanced-call-2',
        label: 'Advanced call 2',
        displayPrompt:
          'Return a table of city name, forecast high temperature for today, and forecast low temperature for today for the top 5 cities in the US',
        prompt:
          'Return a markdown table of city name, forecast high temperature for today, and forecast low temperature for today for the top 5 cities in the US. Use available tools when needed.',
        parameterUnderTest: 'temperature',
        systemPrompt:
          'You are an API tickler assistant. Keep responses short and return a markdown table when tabular output is requested.',
        temperature: 1,
        includeLocalTool: false,
        includeBuiltInTool: builtInToolEnabled,
        expectStructuredOutput: false,
        enableThinking: true
      }
    ]
  };

  return scenarioMap[selectedMode];
}

async function runScenarioCall(scenario, config) {
  const checks = createFeatureChecks();
  const request = buildRequest(scenario, checks);

  try {
    const first = await streamMessage(request, config, checks);
    checks.responseReceived = first.text.trim().length > 0;

    let finalText = first.text;
    let structuredRows = null;

    if (scenario.includeLocalTool) {
      const toolUse = first.toolUses.find((tool) => tool.name === 'format_market_rows');
      if (toolUse) {
        const toolResult = executeLocalTool(toolUse.input);
        const followUp = await sendToolResult(request, toolUse, toolResult, config);
        checks.toolResultSent = true;
        if (followUp.text.trim().length > 0) {
          finalText = followUp.text;
          checks.responseReceived = true;
        }
        checks.thinkingBlockFound ||= followUp.hasThinking;
        checks.toolUseBlockFound ||= followUp.hasToolUse;
      }
    }

    if (scenario.expectStructuredOutput) {
      const parsed = parseStructuredJson(finalText);
      if (parsed) {
        checks.structuredOutputParsed = true;
        structuredRows = parsed.rows;
      }
    }

    return {
      scenario,
      request,
      checks,
      finalText,
      structuredRows,
      passed: evaluateCallPass(scenario, checks)
    };
  } catch (error) {
    return {
      scenario,
      request,
      checks,
      finalText: '',
      structuredRows: null,
      error: error instanceof Error ? error.message : String(error),
      passed: false
    };
  }
}

function createFeatureChecks() {
  return {
    requestStreamEnabled: false,
    requestParametersSet: false,
    systemPromptSet: false,
    alternatingMessagesSet: false,
    cacheControlSet: false,
    structuredOutputRequested: false,
    thinkingRequested: false,
    localToolDeclared: false,
    builtInToolRequested: false,
    streamingEventsObserved: false,
    responseReceived: false,
    thinkingBlockFound: false,
    toolUseBlockFound: false,
    toolResultSent: false,
    structuredOutputParsed: false
  };
}

function buildRequest(scenario, checks) {
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'I am preparing a test transcript. Keep context concise.',
          cache_control: { type: 'ephemeral' }
        }
      ]
    },
    {
      role: 'assistant',
      content: [{ type: 'text', text: 'Acknowledged. Proceeding with concise context.' }]
    },
    {
      role: 'user',
      content: [{ type: 'text', text: scenario.prompt }]
    }
  ];

  const tools = [];
  if (scenario.includeLocalTool) {
    tools.push({
      name: 'format_market_rows',
      description: 'Format market rows into normalized table-ready data.',
      input_schema: {
        type: 'object',
        properties: {
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                company: { type: 'string' },
                ticker: { type: 'string' },
                marketCap: { type: 'string' },
                percentChange: { type: 'string' }
              },
              required: ['company', 'ticker', 'marketCap', 'percentChange']
            }
          }
        },
        required: ['rows']
      }
    });
    checks.localToolDeclared = true;
  }

  if (scenario.includeBuiltInTool) {
    tools.push({ type: 'web_search_20250305', name: 'web_search' });
    checks.builtInToolRequested = true;
  }

  const request = {
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
    max_tokens: scenario.enableThinking ? 1536 : 512,
    stop_sequences: ['</end>'],
    stream: true,
    system: scenario.systemPrompt,
    messages,
    ...(tools.length > 0 ? { tools } : {}),
    ...(scenario.forceLocalTool ? { tool_choice: { type: 'tool', name: 'format_market_rows' } } : {}),
    ...(scenario.top_p !== undefined ? { top_p: scenario.top_p } : {}),
    ...(scenario.temperature !== undefined ? { temperature: scenario.temperature } : {}),
    ...(scenario.enableThinking ? { thinking: { type: 'enabled', budget_tokens: 1024 } } : {})
  };

  checks.requestStreamEnabled = request.stream === true;
  checks.requestParametersSet = validateRequestParameters(request, scenario.parameterUnderTest);
  checks.systemPromptSet = typeof request.system === 'string' && request.system.length > 0;
  checks.alternatingMessagesSet =
    messages.length >= 3 && messages[0].role === 'user' && messages[1].role === 'assistant' && messages[2].role === 'user';
  checks.cacheControlSet = Boolean(messages[0].content[0].cache_control);
  checks.structuredOutputRequested = scenario.expectStructuredOutput;
  checks.thinkingRequested = scenario.enableThinking && Boolean(request.thinking);

  return request;
}

function validateRequestParameters(request, parameterUnderTest) {
  const hasSharedCore = Boolean(request.model) && Number.isFinite(request.max_tokens) && Array.isArray(request.stop_sequences);
  if (!hasSharedCore) {
    return false;
  }

  if (parameterUnderTest === 'top_p') {
    return Number.isFinite(request.top_p) && request.temperature === undefined;
  }

  if (parameterUnderTest === 'temperature') {
    return Number.isFinite(request.temperature) && request.top_p === undefined;
  }

  return false;
}

async function streamMessage(payload, config, checks) {
  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': config.apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  const toolUses = [];
  const pendingInputJson = new Map();
  let hasThinking = false;
  let hasToolUse = false;

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';

    for (const frame of frames) {
      const eventLine = frame.split('\n').find((line) => line.startsWith('event:'));
      const dataLine = frame.split('\n').find((line) => line.startsWith('data:'));
      if (!eventLine || !dataLine) {
        continue;
      }
      const eventName = eventLine.replace('event:', '').trim();
      if (eventName !== 'ping') {
        checks.streamingEventsObserved = true;
      }

      const rawData = dataLine.replace('data:', '').trim();
      if (rawData === '[DONE]') {
        continue;
      }

      let data;
      try {
        data = JSON.parse(rawData);
      } catch {
        continue;
      }

      if (eventName === 'content_block_delta' && data.delta?.type === 'text_delta') {
        text += data.delta.text;
      }

      if (eventName === 'content_block_start' && data.content_block?.type === 'thinking') {
        hasThinking = true;
      }

      if (eventName === 'content_block_start' && data.content_block?.type === 'tool_use') {
        hasToolUse = true;
        toolUses.push({
          id: data.content_block.id,
          name: data.content_block.name,
          input: data.content_block.input || {}
        });
      }

      if (eventName === 'content_block_delta' && data.delta?.type === 'input_json_delta') {
        const index = data.index;
        const current = pendingInputJson.get(index) || '';
        pendingInputJson.set(index, `${current}${data.delta.partial_json}`);
      }
    }
  }

  for (const [index, partial] of pendingInputJson.entries()) {
    if (toolUses[index]) {
      try {
        toolUses[index].input = JSON.parse(partial);
      } catch {
        // Keep the partial input fallback if JSON assembly fails.
      }
    }
  }

  checks.thinkingBlockFound ||= hasThinking;
  checks.toolUseBlockFound ||= hasToolUse;

  return { text, toolUses, hasThinking, hasToolUse };
}

async function sendToolResult(baseRequest, toolUse, toolResult, config) {
  const { tool_choice: _toolChoice, ...requestWithoutToolChoice } = baseRequest;
  const followUp = {
    ...requestWithoutToolChoice,
    stream: false,
    messages: [
      ...requestWithoutToolChoice.messages,
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: toolUse.id,
            name: toolUse.name,
            input: toolUse.input || {}
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult)
          },
          {
            type: 'text',
            text: 'Return only strict JSON with key "rows" using the tool result.'
          }
        ]
      }
    ]
  };

  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': config.apiKey
    },
    body: JSON.stringify(followUp)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Follow-up tool_result request failed: HTTP ${response.status}: ${text}`);
  }

  const json = await response.json();
  const blocks = Array.isArray(json.content) ? json.content : [];
  const text = blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return {
    text,
    hasThinking: blocks.some((block) => block.type === 'thinking'),
    hasToolUse: blocks.some((block) => block.type === 'tool_use')
  };
}

function executeLocalTool(input) {
  const rows = Array.isArray(input?.rows) ? input.rows : [];
  return {
    rows: rows.map((row) => ({
      company: String(row.company || '').trim(),
      ticker: String(row.ticker || '').trim().toUpperCase(),
      marketCap: String(row.marketCap || '').trim(),
      percentChange: String(row.percentChange || '').trim()
    }))
  };
}

function parseStructuredJson(text) {
  if (!text) {
    return null;
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed.rows)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function printCallOutput(callResult) {
  if (callResult.structuredRows) {
    printStructuredTable(callResult.structuredRows);
  }

  console.log('\nAnswer:\n');
  console.log(callResult.finalText || '(empty response text)');

  if (callResult.error) {
    console.log(`\nCall error: ${callResult.error}`);
  }

  printFeatureSummary(callResult.checks);
  console.log(`- Call result: ${callResult.passed ? 'PASS' : 'FAIL'}`);
}

function printStructuredTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('\nStructured output table: no rows returned');
    return;
  }

  console.log('\nStructured output table:\n');
  console.log('| Company | Ticker | Market Cap | % Change |');
  console.log('| --- | --- | --- | --- |');
  for (const row of rows) {
    console.log(`| ${row.company || ''} | ${row.ticker || ''} | ${row.marketCap || ''} | ${row.percentChange || ''} |`);
  }
}

function printFeatureSummary(checks) {
  console.log('\nFeature checks:');
  for (const [name, value] of Object.entries(checks)) {
    const marker = value ? 'PASS' : 'WARN';
    console.log(`- ${marker}: ${name}`);
  }
}

function evaluateCallPass(scenario, checks) {
  const required = [
    'requestStreamEnabled',
    'requestParametersSet',
    'systemPromptSet',
    'alternatingMessagesSet',
    'cacheControlSet',
    'streamingEventsObserved',
    'responseReceived'
  ];

  if (scenario.expectStructuredOutput) {
    required.push('structuredOutputRequested', 'structuredOutputParsed');
  }

  if (scenario.enableThinking) {
    required.push('thinkingRequested');
  }

  if (scenario.includeLocalTool) {
    required.push('localToolDeclared', 'toolUseBlockFound', 'toolResultSent');
  }

  return required.every((key) => checks[key]);
}

function evaluateModePass(selectedMode, callResults) {
  const expectedCalls = buildScenarios(selectedMode, args).length;
  if (callResults.length !== expectedCalls) {
    return false;
  }

  return callResults.every((callResult) => callResult.passed);
}

function printModeSummary(selectedMode, callResults) {
  console.log('\nMode summary:');
  for (const callResult of callResults) {
    const status = callResult.passed ? 'PASS' : 'FAIL';
    console.log(`- ${status}: ${callResult.scenario.label}`);
    if (callResult.error) {
      console.log(`  reason: ${callResult.error}`);
    }
  }
  console.log(`- Mode: ${selectedMode}`);
  console.log(`- Overall result: ${evaluateModePass(selectedMode, callResults) ? 'PASS' : 'FAIL'}`);
}

function logRuntime(config, selectedMode, selectedScenarios) {
  console.log('Anthropic Tickler');
  console.log(`- mode: ${selectedMode}`);
  console.log(`- base URL: ${config.baseUrl}`);
  console.log(`- transport scheme: ${config.transportScheme}`);
  console.log(`- model: ${process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5'}`);
  console.log(`- call count: ${selectedScenarios.length}`);
}

function fatal(message) {
  console.error(message);
  process.exit(1);
}
