const { z } = require('zod');

const coachMessageSchema = z.object({
  message: z.string().min(1).max(10000),
});

module.exports = { coachMessageSchema };
