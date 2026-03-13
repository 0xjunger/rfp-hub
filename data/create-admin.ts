import crypto from 'node:crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { publishers } from '../packages/db/src/schema.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const name = process.argv[2] ?? 'Admin';
const email = process.argv[3] ?? 'admin@rfphub.io';

const slug =
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') +
  '-' +
  Date.now().toString(36);

const apiKey = `rfphub_admin_${crypto.randomBytes(32).toString('hex')}`;
const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

const client = postgres(databaseUrl);
const db = drizzle(client);

async function main() {
  const result = await db
    .insert(publishers)
    .values({
      name,
      slug,
      contactEmail: email,
      isVerified: true,
      apiKeyHash,
      role: 'admin',
    })
    .returning();

  console.log('Admin publisher created:');
  console.log(`  ID:    ${result[0].id}`);
  console.log(`  Name:  ${name}`);
  console.log(`  Email: ${email}`);
  console.log(`  Role:  admin`);
  console.log('');
  console.log('API Key (save this — it will NOT be shown again):');
  console.log(`  ${apiKey}`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
