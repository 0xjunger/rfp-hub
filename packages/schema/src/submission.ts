import { z } from 'zod';
import { rfpTypeEnum } from './opportunity.js';

export const submissionStatusEnum = z.enum(['pending', 'approved', 'rejected']);

export const submissionSchema = z.object({
  id: z.string().uuid(),

  // Content (mirrors opportunity fields)
  title: z.string().min(1).max(500),
  description: z.string(),
  summary: z.string().max(280),
  rfpType: rfpTypeEnum,
  applicationUrl: z.string().url(),
  sourceUrl: z.string().url(),

  // Funding
  budgetMin: z.number().nonnegative().nullable(),
  budgetMax: z.number().nonnegative().nullable(),
  currency: z.string().length(3).default('USD'),

  // Dates
  opensAt: z.coerce.date().nullable(),
  closesAt: z.coerce.date().nullable(),

  // Classification
  categories: z.array(z.string()),
  ecosystems: z.array(z.string()),
  tags: z.array(z.string()),

  // Submitter info
  submitterEmail: z.string().email().nullable(),
  submitterName: z.string().max(255).nullable(),

  // Moderation
  status: submissionStatusEnum,
  reviewedBy: z.string().max(255).nullable(),
  reviewedAt: z.coerce.date().nullable(),
  reviewNotes: z.string().nullable(),
  opportunityId: z.string().uuid().nullable(), // FK to created opportunity if approved

  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createSubmissionSchema = submissionSchema.omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
  opportunityId: true,
  createdAt: true,
  updatedAt: true,
});

export const reviewSubmissionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNotes: z.string().optional(),
});

export const listSubmissionsSchema = z.object({
  status: submissionStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Submission = z.infer<typeof submissionSchema>;
export type CreateSubmission = z.infer<typeof createSubmissionSchema>;
export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;
export type ListSubmissions = z.infer<typeof listSubmissionsSchema>;
