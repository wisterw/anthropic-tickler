#!/usr/bin/env node

import process from 'node:process';

const args = parseArgs(process.argv.slice(2));
const mode = args.mode || 'basic';
if (!['basic', 'advanced'].includes(mode)) {
  fatal(`Invalid mode '${mode}'. Use --mode basic or --mode advanced.`);
}

const config = getConfig();
const promptByMode = {
  basic: 'How are you?',
  advanced:
    'What 3 publicly-traded US stock saw the largest drop in market capitalization today? Return strict JSON with key "rows" as an array where each row has company, ticker, marketCap, percentChange.'
};

const featureChecks = {
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

try {
  const baseRequest = buildRequest(mode, promptByMode[mode], config, featureChecks);

  logRuntime(config, mode, baseRequest);

  const first = await streamMessage(baseRequest, config, featureChecks);
  featureChecks.responseReceived = first.text.trim().length > 0;

  let finalText = first.text;

  if (mode === 'advanced') {
    const toolUse = first.toolUses.find((t) => t.name === 'format_market_rows');
    if (toolUse) {
      const toolResult = executeLocalTool(toolUse.input);
      const followUp = await sendToolResult(baseRequest, toolUse, toolResult, config);
      featureChecks.toolResultSent = true;
      if (followUp.text.trim().length > 0) {
        finalText = followUp.text;
        featureChecks.responseReceived = true;
      }
      featureChecks.thinkingBlockFound ||= followUp.hasThinking;
      featureChecks.toolUseBlockFound ||= followUp.hasToolUse;
    }

    const parsed = parseStructuredJson(finalText);
    if (parsed) {
      featureChecks.structuredOutputParsed = true;
      printTable(parsed.rows);
    } else {
      console.log('\nStructured output parse: not found');
    }
  }

  console.log('\nAnswer:\n');
  console.log(finalText || '(empty response text)');

  printFeatureSummary(featureChecks, mode);
  process.exit(evaluatePass(featureChecks, mode) ? 0 : 2);
} catch (error) {
  console.error('\nTickler request failed.');
  console.error(error instanceof Error ? error.message : String(error));
  printFeatureSummary(featureChecks, mode);
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

function buildRequest(mode, prompt, config, checks) {
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
      content: [{ type: 'text', text: prompt }]
    }
  ];

  const tools = [
    {
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
    }
  ];

  if (mode === 'advanced' && (args.enableBuiltInTool || process.env.ENABLE_BUILT_IN_TOOL === '1')) {
    tools.push({ type: 'web_search_20250305', name: 'web_search' });
    checks.builtInToolRequested = true;
  }

  const request = {
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
    max_tokens: 512,
    temperature: 0.2,
    top_p: 1,
    stop_sequences: ['</end>'],
    stream: true,
    system:
      'You are an API tickler assistant. Keep responses short. In advanced mode, call tools when needed and return structured JSON for rows.',
    messages,
    tools,
    thinking: mode === 'advanced' ? { type: 'enabled', budget_tokens: 256 } : undefined
  };

  checks.requestStreamEnabled = request.stream === true;
  checks.requestParametersSet =
    request.model &&
    Number.isFinite(request.max_tokens) &&
    Number.isFinite(request.temperature) &&
    Number.isFinite(request.top_p) &&
    Array.isArray(request.stop_sequences);
  checks.systemPromptSet = typeof request.system === 'string' && request.system.length > 0;
  checks.alternatingMessagesSet =
    messages.length >= 3 && messages[0].role === 'user' && messages[1].role === 'assistant' && messages[2].role === 'user';
  checks.cacheControlSet = Boolean(messages[0].content[0].cache_control);
  checks.structuredOutputRequested = mode === 'advanced';
  checks.thinkingRequested = mode === 'advanced' && Boolean(request.thinking);
  checks.localToolDeclared = true;

  return request;
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
        // keep partial input fallback
      }
    }
  }

  checks.thinkingBlockFound ||= hasThinking;
  checks.toolUseBlockFound ||= hasToolUse;

  return { text, toolUses, hasThinking, hasToolUse };
}

async function sendToolResult(baseRequest, toolUse, toolResult, config) {
  const followUp = {
    ...baseRequest,
    stream: false,
    messages: [
      ...baseRequest.messages,
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
  const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();

  return {
    text,
    hasThinking: blocks.some((b) => b.type === 'thinking'),
    hasToolUse: blocks.some((b) => b.type === 'tool_use')
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

function printTable(rows) {
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

function printFeatureSummary(checks, mode) {
  const entries = Object.entries(checks);
  console.log('\nFeature checks:');
  for (const [name, value] of entries) {
    const marker = value ? 'PASS' : 'WARN';
    console.log(`- ${marker}: ${name}`);
  }
  console.log(`- Mode: ${mode}`);
}

function evaluatePass(checks, mode) {
  const required = [
    'requestStreamEnabled',
    'requestParametersSet',
    'systemPromptSet',
    'alternatingMessagesSet',
    'cacheControlSet',
    'streamingEventsObserved',
    'responseReceived'
  ];

  if (mode === 'advanced') {
    required.push('structuredOutputRequested', 'thinkingRequested', 'localToolDeclared', 'toolUseBlockFound', 'toolResultSent');
  }

  return required.every((key) => checks[key]);
}

function logRuntime(config, mode, request) {
  console.log('Anthropic Tickler');
  console.log(`- mode: ${mode}`);
  console.log(`- base URL: ${config.baseUrl}`);
  console.log(`- transport scheme: ${config.transportScheme}`);
  console.log(`- model: ${request.model}`);
}

function fatal(message) {
  console.error(message);
  process.exit(1);
}
