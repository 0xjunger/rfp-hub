import { zodToJsonSchema } from 'zod-to-json-schema';
import { fundingOpportunitySchema } from './opportunity.js';
import { fundingSourceSchema } from './source.js';
import { submissionSchema } from './submission.js';
import { publicPublisherSchema } from './publisher.js';

export function generateJsonSchemas() {
  return {
    fundingOpportunity: zodToJsonSchema(fundingOpportunitySchema, 'FundingOpportunity'),
    fundingSource: zodToJsonSchema(fundingSourceSchema, 'FundingSource'),
    submission: zodToJsonSchema(submissionSchema, 'Submission'),
    publisher: zodToJsonSchema(publicPublisherSchema, 'Publisher'),
  };
}
