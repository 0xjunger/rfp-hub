import { z } from 'zod';

export const createPublisherSchema = z.object({
  name: z.string().min(1).max(255),
  contactEmail: z.string().email(),
  websiteUrl: z.string().url().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  role: z.enum(['publisher', 'admin']).default('publisher'),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  isVerified: z.boolean().default(false),
});

export const publicPublisherSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  websiteUrl: z.string().url().nullable(),
  logoUrl: z.string().url().nullable(),
  contactEmail: z.string().email(),
  isVerified: z.boolean(),
  role: z.enum(['publisher', 'admin']),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createPublisherResponseSchema = z.object({
  publisher: publicPublisherSchema,
  apiKey: z.string(),
});

export const rotateKeyResponseSchema = z.object({
  apiKey: z.string(),
  message: z.string(),
});
