import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3001),

  DATABASE_URL: Joi.string().required(),

  MEILI_HOST: Joi.string().uri().required(),
  MEILI_API_KEY: Joi.string().required(), // ← celui lu par meili.service.ts
  MEILI_INDEX_TOOLS: Joi.string().required(),

  ADMIN_KEY: Joi.string().min(8).required(),

  THROTTLE_TTL_MS: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(300),
});
