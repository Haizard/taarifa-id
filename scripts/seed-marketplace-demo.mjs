import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { databaseUrl, createPoolConfig } = require('@taarifa/db');
const host = new URL(databaseUrl).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
  throw new Error(`Refusing to seed marketplace samples outside local PostgreSQL (configured host: ${host}).`);
}

const { Pool } = require('pg');
const pool = new Pool({ ...createPoolConfig(databaseUrl), max: 1 });
const logos = new Map([
  ['demo.hospital', '/images/providers/mwangaza-community-hospital.svg'],
  ['demo.school', '/images/providers/green-valley-school.svg'],
  ['demo.garage', '/images/providers/haraka-auto-assistance.svg'],
  ['demo.business', '/images/providers/moshi-roadside-rescue.svg'],
]);
const ratings = [5, 5, 4];
const dimensions = [
  { communication: 5, punctuality: 5, care: 5, outcome: 5 },
  { communication: 5, punctuality: 4, care: 5, outcome: 5 },
  { communication: 4, punctuality: 4, care: 5, outcome: 4 },
];
const reviewers = ['demo.individual', 'demo.family', 'demo.institution', 'demo.school'];
const sampleComments = [
  'Demo feedback: clear communication and a smooth service experience.',
  'Demo feedback: the team was helpful, professional, and on time.',
  'Demo feedback: good support and clear follow-up from the provider.',
];

try {
  await pool.query('BEGIN');
  const providerRows = await pool.query(`
    SELECT p.id, p.account_id, p.display_name, p.category, a.username
    FROM service_providers p JOIN accounts a ON a.id = p.account_id
    WHERE a.username = ANY($1::text[])
    ORDER BY a.username
  `, [[...logos.keys()]]);
  if (providerRows.rowCount !== logos.size) throw new Error(`Expected ${logos.size} demo providers, found ${providerRows.rowCount}.`);

  for (const provider of providerRows.rows) {
    const logoField = provider.username === 'demo.hospital' ? 'business_logo_url'
      : provider.username === 'demo.school' ? 'school_logo_url'
        : 'business_logo_url';
    const entityTable = provider.username === 'demo.school' ? 'schools' : 'businesses';
    const entityNameField = provider.username === 'demo.school' ? 'school_name' : 'business_name';
    const entity = await pool.query(`SELECT id FROM ${entityTable} WHERE account_id = $1 LIMIT 1`, [provider.account_id]);
    if (entity.rowCount) {
      await pool.query(`UPDATE ${entityTable} SET ${logoField} = $1 WHERE id = $2`, [logos.get(provider.username), entity.rows[0].id]);
    } else {
      await pool.query(`INSERT INTO ${entityTable} (account_id, ${entityNameField}, ${logoField}) VALUES ($1, $2, $3)`, [provider.account_id, provider.display_name, logos.get(provider.username)]);
    }

    const [service] = (await pool.query('SELECT id FROM provider_services WHERE provider_id = $1 AND is_active = true ORDER BY created_at LIMIT 1', [provider.id])).rows;
    if (!service) throw new Error(`No active service found for ${provider.display_name}.`);
    if (provider.username === 'demo.garage') {
      await pool.query(`UPDATE provider_services SET title = 'Demo · Mobile mechanic callout', description = 'DEMO SAMPLE: Example roadside callout rate for preview only. Agree the final price directly with the provider.', price_type = 'fixed', price_amount = '35000', updated_at = now() WHERE id = $1`, [service.id]);
    }

    const current = await pool.query(`
      SELECT count(*)::int AS count FROM service_reviews
      WHERE provider_id = $1 AND moderation_status NOT IN ('disputed', 'removed')
    `, [provider.id]);
    const needed = Math.max(0, 3 - current.rows[0].count);
    if (!needed) continue;

    for (let index = 0; index < needed; index++) {
      const reviewerUsername = reviewers[(current.rows[0].count + index) % reviewers.length];
      const reviewer = (await pool.query('SELECT id FROM accounts WHERE username = $1 AND deleted_at IS NULL', [reviewerUsername])).rows[0];
      if (!reviewer) throw new Error(`Missing local demo reviewer ${reviewerUsername}.`);
      const rating = ratings[(current.rows[0].count + index) % ratings.length];
      const answer = JSON.stringify({ demo_sample: true });
      const [request] = (await pool.query(`
        INSERT INTO service_requests (requester_account_id, provider_service_id, status, summary, answers, form_snapshot, region, district)
        VALUES ($1, $2, 'completed', 'Local demo sample service', $3::jsonb, '[]'::jsonb, $4, $5)
        RETURNING id
      `, [reviewer.id, service.id, answer, provider.category === 'school' ? 'Arusha' : 'Dar es Salaam', provider.category === 'school' ? 'Arusha City' : 'Kinondoni'])).rows;
      await pool.query(`
        INSERT INTO service_offers (request_id, provider_id, provider_service_id, message, status)
        VALUES ($1, $2, $3, 'Local demo sample response', 'accepted')
      `, [request.id, provider.id, service.id]);
      await pool.query(`
        INSERT INTO service_reviews (request_id, provider_id, reviewer_account_id, rating, rating_dimensions, review, edit_deadline, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, now() - interval '8 days', now() - interval '8 days', now() - interval '8 days')
      `, [request.id, provider.id, reviewer.id, rating, JSON.stringify(dimensions[index % dimensions.length]), sampleComments[index % sampleComments.length]]);
    }
  }
  await pool.query('COMMIT');
  process.stdout.write(`Seeded local marketplace brand marks and enough demo feedback for ${providerRows.rowCount} providers on ${host}.\n`);
} catch (error) {
  await pool.query('ROLLBACK');
  throw error;
} finally {
  await pool.end();
}
