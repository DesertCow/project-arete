const express = require('express');

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { fileTypeEnum, updateContextSchema } = require('../schemas/context');
const {
  USER_EDITABLE_FILE_TYPES,
  getAllContextFiles,
  getContextFile,
  updateContextFile,
} = require('../services/contextManager');

const router = express.Router();

router.use(authenticate);

function publicContextFile(file) {
  return {
    id: file.id,
    fileType: file.fileType,
    content: file.content,
    version: file.version,
    updatedAt: file.updatedAt,
  };
}

// Context is user-scoped. Admins may read across users; nobody else can.
function authorizeOwnerOrAdmin(req, res, next) {
  const { userId } = req.params;
  if (req.user.id !== userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
    });
  }
  return next();
}

// Rejects a bad :fileType before it reaches Prisma, where an invalid enum would
// surface as a 500 instead of a 400.
function parseFileType(req, res, next) {
  const result = fileTypeEnum.safeParse(req.params.fileType);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid fileType',
        details: { fileType: [`Must be one of: ${fileTypeEnum.options.join(', ')}`] },
      },
    });
  }
  req.fileType = result.data;
  return next();
}

router.get('/:userId', authorizeOwnerOrAdmin, async (req, res, next) => {
  try {
    const files = await getAllContextFiles(req.params.userId);
    return res.json({ contextFiles: files.map(publicContextFile) });
  } catch (err) {
    return next(err);
  }
});

router.get('/:userId/:fileType', authorizeOwnerOrAdmin, parseFileType, async (req, res, next) => {
  try {
    const file = await getContextFile(req.params.userId, req.fileType);
    if (!file) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Context file not found' } });
    }
    return res.json({ contextFile: publicContextFile(file) });
  } catch (err) {
    return next(err);
  }
});

router.put(
  '/:userId/:fileType',
  authorizeOwnerOrAdmin,
  parseFileType,
  validate(updateContextSchema),
  async (req, res, next) => {
    const { userId } = req.params;
    const fileType = req.fileType;

    if (!USER_EDITABLE_FILE_TYPES.includes(fileType)) {
      return res.status(403).json({
        error: {
          code: 'FILE_NOT_EDITABLE',
          message: 'This context file is managed by your coach and cannot be edited directly.',
        },
      });
    }

    try {
      // Demo context is frozen. Check the file's owner, not just the caller, so
      // an admin cannot edit demo files either.
      const owner =
        userId === req.user.id
          ? req.user
          : await prisma.user.findUnique({ where: { id: userId } });

      if (!owner) {
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      }

      if (req.user.role === 'DEMO' || owner.role === 'DEMO') {
        return res.status(403).json({
          error: {
            code: 'DEMO_READ_ONLY',
            message: 'Demo account context files are read-only.',
          },
        });
      }

      const file = await updateContextFile(userId, fileType, req.validated.content);
      return res.json({ contextFile: publicContextFile(file) });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
