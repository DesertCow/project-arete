const prisma = require('../lib/prisma');

// Canonical ordering: the sequence the coach prompt expects, and the order the
// API returns files in. Not alphabetical — it reads memory > goals > plan >
// history > health, which is how a coach would review an athlete.
const FILE_TYPE_ORDER = [
  'COACH_MEMORY',
  'GOALS',
  'TRAINING_PLAN',
  'TRAINING_HISTORY',
  'HEALTH_PROFILE',
];

// Files the athlete may edit through the API. The rest are written by the coach.
const USER_EDITABLE_FILE_TYPES = ['GOALS', 'HEALTH_PROFILE'];

const INITIAL_CONTENT = {
  COACH_MEMORY:
    '# Coach Memory\n\nNo coaching sessions yet. Context will build as we train together.\n',
  GOALS: "# Goals\n\nNo goals set yet. Tell your coach what you're training for.\n",
  TRAINING_PLAN:
    '# Training Plan\n\nNo plan generated yet. Set your goals first, then your coach will build a plan.\n',
  TRAINING_HISTORY: '# Training History\n\nNo training logged yet.\n',
  HEALTH_PROFILE:
    '# Health Profile\n\nNo health data yet. Connect your COROS watch or tell your coach about your baseline.\n',
};

function sortByFileType(files) {
  return [...files].sort(
    (a, b) => FILE_TYPE_ORDER.indexOf(a.fileType) - FILE_TYPE_ORDER.indexOf(b.fileType)
  );
}

// Safe to call repeatedly — skipDuplicates leans on @@unique([userId, fileType]),
// so existing files are never clobbered with starter content.
async function initializeContextFiles(userId) {
  await prisma.contextFile.createMany({
    data: FILE_TYPE_ORDER.map((fileType) => ({
      userId,
      fileType,
      content: INITIAL_CONTENT[fileType],
    })),
    skipDuplicates: true,
  });

  return getAllContextFiles(userId);
}

async function getAllContextFiles(userId) {
  let files = await prisma.contextFile.findMany({ where: { userId } });

  // Defensive: a user should always have all five. Backfill any that are absent.
  if (files.length < FILE_TYPE_ORDER.length) {
    const present = new Set(files.map((file) => file.fileType));
    const missing = FILE_TYPE_ORDER.filter((fileType) => !present.has(fileType));

    await prisma.contextFile.createMany({
      data: missing.map((fileType) => ({
        userId,
        fileType,
        content: INITIAL_CONTENT[fileType],
      })),
      skipDuplicates: true,
    });

    files = await prisma.contextFile.findMany({ where: { userId } });
  }

  return sortByFileType(files);
}

async function getContextFile(userId, fileType) {
  return prisma.contextFile.findUnique({
    where: { userId_fileType: { userId, fileType } },
  });
}

async function updateContextFile(userId, fileType, content) {
  try {
    return await prisma.contextFile.update({
      where: { userId_fileType: { userId, fileType } },
      data: { content, version: { increment: 1 } },
    });
  } catch (err) {
    // P2025: the row is missing (a user created before this file type existed).
    // Create it at version 1 rather than failing the write.
    if (err.code === 'P2025') {
      return prisma.contextFile.create({ data: { userId, fileType, content } });
    }
    throw err;
  }
}

// Phase 5 calls this to build the coach system prompt. Returns the formatted
// blob for the prompt plus the raw rows, so the chat service can write back to
// individual files afterwards without a second query.
async function loadContextForPrompt(userId) {
  const files = await getAllContextFiles(userId);

  const formatted = files
    .map((file) => `=== ${file.fileType} ===\n${file.content}`)
    .join('\n');

  return {
    formatted,
    files: files.map(({ id, fileType, content, version }) => ({
      id,
      fileType,
      content,
      version,
    })),
  };
}

module.exports = {
  FILE_TYPE_ORDER,
  USER_EDITABLE_FILE_TYPES,
  INITIAL_CONTENT,
  initializeContextFiles,
  getAllContextFiles,
  getContextFile,
  updateContextFile,
  loadContextForPrompt,
};
