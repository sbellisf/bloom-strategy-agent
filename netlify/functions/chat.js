// netlify/functions/chat.js
// Locked-down proxy to the Anthropic API. Hardcodes model, caps tokens,
// whitelists tools, and restricts CORS to known origins.

const ALLOWED_ORIGINS = [
  'https://cheerful-pithivier-11d07e.netlify.app',
  // Add custom domains here as you wire them up, e.g.:
  // 'https://bloom.kydstudios.io',
];

const MODEL = 'claude-sonnet-4-20250514';   // server-enforced, client cannot override
const MAX_TOKENS_CAP = 2000;                // server-enforced upper bound
const ALLOWED_TOOLS = new Set(['web_search_20250305']);

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin);

  const cors = allowed
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Vary': 'Origin'
      }
    : { 'Vary': 'Origin' };

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: allowed ? 204 : 403, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!allowed) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Origin not allowed' }) };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // Validate request shape
  const { system, messages, max_tokens, tools } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing messages' }) };
  }
  if (system !== undefined && typeof system !== 'string') {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid system' }) };
  }

  // Cap max_tokens
  const requested = Number.isFinite(max_tokens) ? max_tokens : MAX_TOKENS_CAP;
  const safe_max_tokens = Math.min(Math.max(1, requested), MAX_TOKENS_CAP);

  // Whitelist tools
  let safe_tools;
  if (Array.isArray(tools)) {
    const filtered = tools.filter(t => t && ALLOWED_TOOLS.has(t.type));
    if (filtered.length > 0) safe_tools = filtered;
  }

  // Build sanitized payload
  const payload = {
    model: MODEL,
    max_tokens: safe_max_tokens,
    messages,
    ...(system ? { system } : {}),
    ...(safe_tools ? { tools: safe_tools } : {})
  };

  // Forward to Anthropic
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: text
    };
  } catch (err) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'Upstream error' }) };
  }
};
