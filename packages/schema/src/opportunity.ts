import { z } from 'zod';

export const rfpTypeEnum = z.enum(['rfp', 'grant', 'bounty', 'fellowship', 'hackathon']);

export const opportunityStatusEnum = z.enum(['draft', 'open', 'closing_soon', 'closed', 'awarded']);

const publisherTypeEnum = z.enum(['community', 'verified_publisher']);

export const fundingOpportunitySchema = z.object({
  // Identity
  id: z.string().uuid(),
  externalId: z.string().max(500).nullable(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),

  // Content
  title: z.string().min(1).max(500),
  description: z.string(), // Markdown
  summary: z.string().max(280),
  rfpType: rfpTypeEnum,

  // Funding
  fundingMechanism: z.string().max(100).nullable(),
  budgetMin: z.number().nonnegative().nullable(),
  budgetMax: z.number().nonnegative().nullable(),
  prizePool: z.number().nonnegative().nullable(),
  currency: z.string().length(3).default('USD'),

  // Dates
  opensAt: z.coerce.date().nullable(),
  closesAt: z.coerce.date().nullable(),
  projectDuration: z.string().max(100).nullable(),

  // Classification
  status: opportunityStatusEnum,
  categories: z.array(z.string()),
  ecosystems: z.array(z.string()),
  tags: z.array(z.string()),

  // Source & Provenance
  sourceId: z.string().uuid(),
  applicationUrl: z.string().url(),
  sourceUrl: z.string().url(),

  // Provenance
  submittedBy: z.string().max(255),
  submittedAt: z.coerce.date(),
  verifiedBy: z.string().max(255).nullable(),
  verifiedAt: z.coerce.date().nullable(),
  publisherType: publisherTypeEnum,

  // Metadata
  eligibility: z.array(z.string()),
  requiredCredentials: z.array(z.string()),
  contactEmail: z.string().email().nullable(),
  logoUrl: z.string().url().nullable(),

  // System
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  version: z.number().int().positive().default(1),
  isActive: z.boolean().default(true),
  duplicateOf: z.string().uuid().nullable(),
});

export const createOpportunitySchema = fundingOpportunitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  verifiedBy: true,
  verifiedAt: true,
  duplicateOf: true,
});

export const updateOpportunitySchema = createOpportunitySchema.partial();

export const searchOpportunitiesSchema = z.object({
  q: z.string().max(500).optional(),
  type: z
    .string()
    .transform((v) => v.split(','))
    .pipe(z.array(rfpTypeEnum))
    .optional(),
  ecosystem: z.string().optional(),
  status: z
    .string()
    .transform((v) => v.split(','))
    .pipe(z.array(opportunityStatusEnum))
    .optional(),
  funder: z.string().optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  min_budget: z.coerce.number().nonnegative().optional(),
  max_budget: z.coerce.number().nonnegative().optional(),
  closing_after: z.coerce.date().optional(),
  closing_before: z.coerce.date().optional(),
  sort: z
    .string()
    .regex(/^(created_at|closes_at|budget_max|budget_min|prize_pool|title):(asc|desc)$/)
    .default('created_at:desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export const exportOpportunitiesSchema = z.object({
  q: z.string().max(500).optional(),
  type: z
    .string()
    .transform((v) => v.split(','))
    .pipe(z.array(rfpTypeEnum))
    .optional(),
  ecosystem: z.string().optional(),
  status: z
    .string()
    .transform((v) => v.split(','))
    .pipe(z.array(opportunityStatusEnum))
    .optional(),
  funder: z.string().optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  min_budget: z.coerce.number().nonnegative().optional(),
  max_budget: z.coerce.number().nonnegative().optional(),
  closing_after: z.coerce.date().optional(),
  closing_before: z.coerce.date().optional(),
  format: z.enum(['json', 'csv']).default('json'),
  limit: z.coerce.number().int().min(1).max(10000).default(10000),
});

export const bulkImportSchema = z.object({
  opportunities: z.array(createOpportunitySchema).min(1).max(100),
});

export const bulkImportResponseSchema = z.object({
  imported: z.number(),
  duplicates: z.number(),
  errors: z.array(z.object({ index: z.number(), message: z.string() })),
});

export type FundingOpportunity = z.infer<typeof fundingOpportunitySchema>;
export type CreateOpportunity = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunity = z.infer<typeof updateOpportunitySchema>;
export type SearchOpportunities = z.infer<typeof searchOpportunitiesSchema>;
