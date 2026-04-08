import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { submissions } from '@rfp-hub/db';
import { createSubmissionSchema } from '@rfp-hub/schema';
import { db } from '../db.js';
import { writeAuditLog } from '../services/audit.js';
import type { AppEnv } from '../types.js';

export const submitRoute = new OpenAPIHono<AppEnv>();

const submitOpportunity = createRoute({
  method: 'post',
  path: '/',
  request: {
    body: {
      content: { 'application/json': { schema: createSubmissionSchema } },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            submissionId: z.string().uuid(),
          }),
        },
      },
      description: 'Submission received',
    },
  },
  tags: ['Community'],
});

submitRoute.openapi(submitOpportunity, async (c) => {
  const body = c.req.valid('json');

  const result = await db
    .insert(submissions)
    .values({
      ...body,
      budgetMin: body.budgetMin != null ? String(body.budgetMin) : null,
      budgetMax: body.budgetMax != null ? String(body.budgetMax) : null,
    })
    .returning({ id: submissions.id });

  const submissionId = result[0].id;

  await writeAuditLog({
    entityType: 'submission',
    entityId: submissionId,
    action: 'create',
    performedBy: body.submitterEmail ?? 'anonymous',
  });

  return c.json(
    {
      message: 'Submission received and queued for review.',
      submissionId,
    },
    201,
  );
});
