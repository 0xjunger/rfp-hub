import { z } from 'zod';

export const publisherRoleEnum = z.enum(['publisher', 'admin']);

export const publisherSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  websiteUrl: z.string().url().nullable(),
  logoUrl: z.string().url().nullable(),
  contactEmail: z.string().email(),
  isVerified: z.boolean().default(false),
  apiKeyHash: z.string(),
  role: publisherRoleEnum.default('publisher'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createPublisherSchema = publisherSchema.omit({
  id: true,
  apiKeyHash: true,
  role: true,
  createdAt: true,
  updatedAt: true,
});

export const publicPublisherSchema = publisherSchema.omit({
  apiKeyHash: true,
});

export const createPublisherResponseSchema = z.object({
  publisher: publicPublisherSchema,
  apiKey: z.string(),
});

export const rotateKeyResponseSchema = z.object({
  apiKey: z.string(),
  message: z.string(),
});

export type PublisherRole = z.infer<typeof publisherRoleEnum>;
export type Publisher = z.infer<typeof publisherSchema>;
export type CreatePublisher = z.infer<typeof createPublisherSchema>;
export type PublicPublisher = z.infer<typeof publicPublisherSchema>;
