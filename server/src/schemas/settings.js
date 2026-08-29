const { z } = require('zod');

const locationSchema = z.object({
  city: z.string().min(1).max(200),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

const updateProfileSchema = z.object({
  location: locationSchema.optional(),
  primarySport: z.string().optional(),
  secondarySports: z.array(z.string()).optional(),
  experience: z.enum(['beginner', 'intermediate', 'advanced', 'elite']).optional(),
});

module.exports = { locationSchema, updateProfileSchema };
