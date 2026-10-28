const { Client } = require('pg');

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'us-east-1',
  'eu-central-1',
  'us-west-1'
];

async function testPoolers() {
  for (const reg of regions) {
    const host = `aws-0-${reg}.pooler.supabase.com`;
    console.log(`Testing pooler host: ${host}...`);
    const client = new Client({
      host,
      port: 6543,
      user: 'postgres.faeyciyndbzieyjhwrfw',
      password: 'Bangaru@0711',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`🎯 SUCCESS! Connected to region: ${reg}`);
      const res = await client.query('SELECT current_database(), version()');
      console.log('Database:', res.rows[0]);
      await client.end();
      return { host, region: reg };
    } catch (err) {
      console.log(`   Failed ${reg}:`, err.message);
      await client.end().catch(() => {});
    }
  }
}

testPoolers().then(result => {
  if (result) {
    console.log('Active pooler found:', result);
    process.exit(0);
  } else {
    console.log('No pooler matched.');
    process.exit(1);
  }
});
