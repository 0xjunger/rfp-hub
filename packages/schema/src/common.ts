import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export const sortSchema = z
  .string()
  .regex(/^[a-z_]+:(asc|desc)$/)
  .default('created_at:desc');

export const dateRangeSchema = z.object({
  after: z.coerce.date().optional(),
  before: z.coerce.date().optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;
export type Sort = z.infer<typeof sortSchema>;
