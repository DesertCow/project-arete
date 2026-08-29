const { z } = require('zod');

function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

const locationSchema = z.object({
  city: z.string().min(1).max(200),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  // IANA zone name, e.g. "America/Phoenix". Rejected early so a typo cannot
  // silently push the coach onto the default zone.
  timezone: z
    .string()
    .min(1)
    .max(64)
    .refine(isValidTimeZone, { message: 'Must be a valid IANA timezone, e.g. America/Phoenix' })
    .optional(),
});

const updateProfileSchema = z.object({
  location: locationSchema.optional(),
  primarySport: z.string().optional(),
  secondarySports: z.array(z.string()).optional(),
  experience: z.enum(['beginner', 'intermediate', 'advanced', 'elite']).optional(),
});

module.exports = { locationSchema, updateProfileSchema };
