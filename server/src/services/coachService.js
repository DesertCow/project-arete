const pino = require('pino');

const prisma = require('../lib/prisma');
const { loadContextForPrompt, updateContextFile } = require('./contextManager');
const { getCoachResponse, streamCoachResponse } = require('./ai');
const { buildCoachSystemPrompt } = require('./coachPrompt');
const { getWeatherForPrompt } = require('./weatherService');
const { getUserDateTime } = require('../utils/userTime');

const logger = pino({ name: 'coachService' });

const CONTEXT_TAG_OPEN = '<context_update>';

// Parse the <context_update> block from the coach response and strip it from
// the user-facing text.
function parseContextUpdate(responseText) {
  const regex = /<context_update>([\s\S]*?)<\/context_update>/;
  const match = responseText.match(regex);

  let userFacingText = responseText;
  let contextUpdate = null;

  if (match) {
    userFacingText = responseText.replace(regex, '').trim();
    try {
      contextUpdate = JSON.parse(match[1].trim());
    } catch (err) {
      logger.warn({ raw: match[1] }, 'Failed to parse context update JSON');
    }
  }

  return { userFacingText, contextUpdate };
}

async function applyContextUpdates(userId, contextUpdate, existingFiles) {
  if (!contextUpdate) return;

  for (const [fileType, instruction] of Object.entries(contextUpdate)) {
    if (!instruction || typeof instruction !== 'string') continue;

    const existing = existingFiles.find((f) => f.fileType === fileType);
    if (!existing) continue;

    let newContent;

    if (instruction.startsWith('append: ')) {
      const appendText = instruction.slice('append: '.length);
      newContent = existing.content.trimEnd() + '\n' + appendText + '\n';
    } else if (instruction.startsWith('replace_section: ')) {
      const afterPrefix = instruction.slice('replace_section: '.length);
      const colonIdx = afterPrefix.indexOf(': ');
      if (colonIdx > -1) {
        const sectionName = afterPrefix.slice(0, colonIdx);
        const sectionContent = afterPrefix.slice(colonIdx + 2);
        const sectionRegex = new RegExp(`(## ${sectionName}[\\s\\S]*?)(?=\\n## |$)`, 'i');
        if (sectionRegex.test(existing.content)) {
          newContent = existing.content.replace(
            sectionRegex,
            `## ${sectionName}\n${sectionContent}\n`
          );
        } else {
          newContent =
            existing.content.trimEnd() + `\n\n## ${sectionName}\n${sectionContent}\n`;
        }
      }
    } else {
      // Plain string without a prefix — treat as an append.
      newContent = existing.content.trimEnd() + '\n' + instruction + '\n';
    }

    if (newContent) {
      try {
        await updateContextFile(userId, fileType, newContent);
        logger.info({ userId, fileType }, 'Context file updated by coach');
      } catch (err) {
        logger.error({ userId, fileType, err }, 'Failed to update context file');
      }
    }
  }
}

async function buildMessages(userId, newMessage, limit = 20) {
  const history = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const messages = history
    .reverse()
    .map((msg) => ({
      role: msg.role === 'USER' ? 'user' : 'assistant',
      content: msg.content,
    }))
    .filter((msg) => msg.content && msg.content.trim().length > 0);

  // The window can slice mid-exchange and leave a coach reply first; the API
  // requires the conversation to open on a user turn.
  while (messages.length > 0 && messages[0].role === 'assistant') {
    messages.shift();
  }

  messages.push({ role: 'user', content: newMessage });

  return messages;
}

async function saveChatMessage(userId, role, content, metadata = null) {
  return prisma.chatMessage.create({
    data: { userId, role, content, metadata },
  });
}

// One user read serves both the forecast lookup and the local clock.
// Weather is best-effort; the date/time always resolves (falling back to the
// default zone), so the coach never loses track of what day it is.
async function loadEnvironment(userId) {
  let user = null;
  try {
    user = await prisma.user.findUnique({ where: { id: userId } });
  } catch (err) {
    logger.warn({ err, userId }, 'User lookup failed — continuing without environment');
  }

  const userDateTime = getUserDateTime(user);

  let weatherText = null;
  try {
    const location = user?.sportProfile?.location;
    if (location?.lat && location?.lon) {
      weatherText = await getWeatherForPrompt(location.lat, location.lon, location.city);
    }
  } catch (err) {
    logger.warn({ err, userId }, 'Weather lookup failed — continuing without it');
  }

  return { weatherText, userDateTime };
}

async function handleCoachMessage(userId, message, mode = 'conversation') {
  const context = await loadContextForPrompt(userId);
  const { weatherText, userDateTime } = await loadEnvironment(userId);
  const systemPrompt = buildCoachSystemPrompt(context.formatted, mode, weatherText, userDateTime);
  const messages = await buildMessages(userId, message);

  await saveChatMessage(userId, 'USER', message);

  const rawResponse = await getCoachResponse(systemPrompt, messages);

  const { userFacingText, contextUpdate } = parseContextUpdate(rawResponse);
  await applyContextUpdates(userId, contextUpdate, context.files);

  await saveChatMessage(userId, 'COACH', userFacingText, {
    contextUpdateApplied: !!contextUpdate,
  });

  return userFacingText;
}

// Emits only text that cannot turn out to be part of the <context_update> tag.
// A naive "has the tag arrived yet" check leaks partial tags, because the tag
// can straddle two chunks.
function createTagSafeEmitter(onChunk) {
  let emitted = 0;

  return function flush(fullResponse, force = false) {
    const tagIdx = fullResponse.indexOf(CONTEXT_TAG_OPEN);
    let safeEnd;

    if (tagIdx !== -1) {
      safeEnd = tagIdx;
    } else if (force) {
      safeEnd = fullResponse.length;
    } else {
      // Hold back a trailing substring that could still grow into the tag.
      let hold = 0;
      for (let n = Math.min(CONTEXT_TAG_OPEN.length - 1, fullResponse.length); n > 0; n--) {
        if (fullResponse.endsWith(CONTEXT_TAG_OPEN.slice(0, n))) {
          hold = n;
          break;
        }
      }
      safeEnd = fullResponse.length - hold;
    }

    if (safeEnd > emitted) {
      onChunk(fullResponse.slice(emitted, safeEnd));
      emitted = safeEnd;
    }
  };
}

async function handleCoachMessageStream(userId, message, mode, onChunk) {
  const context = await loadContextForPrompt(userId);
  const { weatherText, userDateTime } = await loadEnvironment(userId);
  const systemPrompt = buildCoachSystemPrompt(context.formatted, mode, weatherText, userDateTime);
  const messages = await buildMessages(userId, message);

  await saveChatMessage(userId, 'USER', message);

  return new Promise((resolve, reject) => {
    let fullResponse = '';
    const flush = createTagSafeEmitter(onChunk);

    streamCoachResponse(
      systemPrompt,
      messages,
      (chunk) => {
        fullResponse += chunk;
        flush(fullResponse);
      },
      async (finalText, error) => {
        if (error) {
          logger.error({ err: error }, 'Stream error');
          return reject(error);
        }

        // Release anything still held back that was not part of the tag.
        flush(fullResponse, true);

        try {
          const { userFacingText, contextUpdate } = parseContextUpdate(fullResponse);
          await applyContextUpdates(userId, contextUpdate, context.files);
          await saveChatMessage(userId, 'COACH', userFacingText, {
            contextUpdateApplied: !!contextUpdate,
          });
          return resolve(userFacingText);
        } catch (err) {
          return reject(err);
        }
      }
    ).catch(reject);
  });
}

module.exports = {
  handleCoachMessage,
  handleCoachMessageStream,
  parseContextUpdate,
};
