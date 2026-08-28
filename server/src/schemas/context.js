const { z } = require('zod');

const fileTypeEnum = z.enum([
  'COACH_MEMORY',
  'GOALS',
  'TRAINING_PLAN',
  'TRAINING_HISTORY',
  'HEALTH_PROFILE',
]);

const updateContextSchema = z.object({
  content: z.string().min(1).max(100000), // ~100KB, well above the 8K token target
});

const contextParamsSchema = z.object({
  userId: z.string().uuid(),
  fileType: fileTypeEnum.optional(),
});

module.exports = { fileTypeEnum, updateContextSchema, contextParamsSchema };
