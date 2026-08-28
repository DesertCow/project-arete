const { z } = require('zod');

const demoMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(20)
    .default([]),
});

module.exports = { demoMessageSchema };
