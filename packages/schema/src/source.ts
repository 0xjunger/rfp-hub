import { z } from 'zod';

export const fundingSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).nullable(),
  websiteUrl: z.string().url().nullable(),
  logoUrl: z.string().url().nullable(),
  contactEmail: z.string().email().nullable(),
  ecosystems: z.array(z.string()),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type FundingSource = z.infer<typeof fundingSourceSchema>;
