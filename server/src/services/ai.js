const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Overridable so the model can be pinned without a code change.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

// Responses can lead with a thinking block, so content[0] is not reliably the
// answer. Pull the text blocks out by type and join them.
function extractText(message) {
  return (message.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

async function getCoachResponse(systemPrompt, messages) {
  if (process.env.AI_PROVIDER === 'claude') {
    return callClaude(systemPrompt, messages);
  }
  throw new Error(`Unsupported AI provider: ${process.env.AI_PROVIDER}`);
}

async function streamCoachResponse(systemPrompt, messages, onChunk, onDone) {
  if (process.env.AI_PROVIDER === 'claude') {
    return streamClaude(systemPrompt, messages, onChunk, onDone);
  }
  throw new Error(`Unsupported AI provider: ${process.env.AI_PROVIDER}`);
}

async function callClaude(systemPrompt, messages) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });
  return extractText(response);
}

async function streamClaude(systemPrompt, messages, onChunk, onDone) {
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  // 'text' fires only for text blocks, so thinking never reaches the client.
  stream.on('text', (text) => {
    onChunk(text);
  });

  stream.on('finalMessage', (message) => {
    onDone(extractText(message));
  });

  stream.on('error', (error) => {
    onDone(null, error);
  });

  return stream;
}

module.exports = { getCoachResponse, streamCoachResponse, MODEL };
