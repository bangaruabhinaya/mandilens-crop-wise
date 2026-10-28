require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  console.log('🔄 Connecting to Supabase PostgreSQL...');

  const client = new Client({
    host: process.env.DB_HOST || 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: parseInt(process.env.DB_PORT || '6543', 10),
    user: process.env.DB_USER || 'postgres.faeyciyndbzieyjhwrfw',
    password: process.env.DB_PASSWORD || 'Bangaru@0711',
    database: process.env.DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL successfully!');

    // 1. Run Migration
    console.log('📄 Applying schema migration: 20261027000001_init_crop_market.sql ...');
    const migrationSql = fs.readFileSync(path.join(__dirname, 'migrations', '20261027000001_init_crop_market.sql'), 'utf8');
    await client.query(migrationSql);
    console.log('✅ Schema migration applied successfully!');

    // 2. Run Seed
    console.log('🌱 Applying seed data: seed.sql ...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await client.query(seedSql);
    console.log('✅ Seed data applied successfully!');

    // 3. Verify counts
    const cropsCount = await client.query('SELECT COUNT(*) FROM crops');
    const marketsCount = await client.query('SELECT COUNT(*) FROM markets');
    const quotesCount = await client.query('SELECT COUNT(*) FROM market_quotes');
    const decisionsCount = await client.query('SELECT COUNT(*) FROM selling_decisions');

    console.log(`\n🎉 Verification of Supabase Database:`);
    console.log(`   - Crops in Supabase: ${cropsCount.rows[0].count}`);
    console.log(`   - Markets in Supabase: ${marketsCount.rows[0].count}`);
    console.log(`   - Market Quotes in Supabase: ${quotesCount.rows[0].count}`);
    console.log(`   - Decisions in Supabase: ${decisionsCount.rows[0].count}`);

    await client.end();
    return true;
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (client) await client.end().catch(() => {});
    return false;
  }
}

migrate().then(success => {
  process.exit(success ? 0 : 1);
});
