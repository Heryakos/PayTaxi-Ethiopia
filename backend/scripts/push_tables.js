const { Client } = require('pg');

const connectionString = 'postgresql://postgres.sklddyglnuigdnqhegck:PayTaxi_2026_SecureDb%21%2389@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?schema=public';

async function main() {
  const c = new Client({ connectionString });
  await c.connect();
  console.log('Connected to Supabase PostgreSQL pooler.');

  await c.query(`
    CREATE TABLE IF NOT EXISTS system_setting (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'GENERAL',
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('system_setting table ready.');

  await c.query(`
    CREATE TABLE IF NOT EXISTS qr_login_session (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'PENDING',
      "userId" TEXT,
      "jwtToken" TEXT,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('qr_login_session table ready.');

  // Seed default system settings if not already present
  const defaultSettings = [
    { key: 'addispay_sandbox_mode', value: 'true', category: 'PAYMENT', description: 'Enable AddisPay sandbox test mode' },
    { key: 'addispay_api_key', value: 'bc5178e1-e7e1-4dbe-b3e3-023ebcb17e1a', category: 'PAYMENT', description: 'AddisPay live/UAT API Key' },
    { key: 'addispay_base_url', value: 'https://uat.api.addispay.et', category: 'PAYMENT', description: 'AddisPay Gateway Endpoint' },
    { key: 'addispay_webhook_secret', value: 'sandbox-signature', category: 'PAYMENT', description: 'AddisPay Webhook signature secret' },
    { key: 'sms_gateway_provider', value: 'FREE_SANDBOX', category: 'SMS', description: 'SMS Provider: FREE_SANDBOX, TELEGRAM_BOT, TWILIO, or AFROMESSAGE' },
    { key: 'telegram_bot_token', value: '', category: 'SMS', description: 'Telegram Bot Token for 100% free external OTP delivery' },
    { key: 'telegram_bot_username', value: 'PayTaxiOtpBot', category: 'SMS', description: 'Telegram Bot handle for users' },
    { key: 'twilio_account_sid', value: '', category: 'SMS', description: 'Twilio Account SID (Optional)' },
    { key: 'twilio_auth_token', value: '', category: 'SMS', description: 'Twilio Auth Token (Optional)' },
    { key: 'twilio_from_phone', value: '', category: 'SMS', description: 'Twilio Sender Phone Number (Optional)' },
    { key: 'afromessage_api_key', value: '', category: 'SMS', description: 'AfroMessage Ethiopia API Key (Optional)' },
    { key: 'afromessage_sender_id', value: 'PayTaxi', category: 'SMS', description: 'AfroMessage Sender ID' },
    { key: 'fare_presets', value: '10, 15, 20, 25, 35, 50', category: 'FARES', description: 'Standard Minibus passenger fare presets (ETB)' },
    { key: 'min_fare_amount', value: '5', category: 'FARES', description: 'Minimum allowed custom transit fare (ETB)' },
    { key: 'max_fare_amount', value: '500', category: 'FARES', description: 'Maximum allowed custom transit fare (ETB)' },
    { key: 'platform_fee_percent', value: '2.5', category: 'FARES', description: 'PayTaxi platform commission percentage (%)' },
  ];

  for (const s of defaultSettings) {
    await c.query(`
      INSERT INTO system_setting (key, value, description, category, "updatedAt")
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (key) DO NOTHING;
    `, [s.key, s.value, s.description, s.category]);
  }
  console.log('Default system settings seeded.');

  // Create a default Operations Manager user if not exists
  await c.query(`
    INSERT INTO app_user (id, phone, role, name, "isVerified", "createdAt")
    VALUES (gen_random_uuid(), '+251944444444', 'MANAGER', 'Operations Manager', true, NOW())
    ON CONFLICT (phone) DO UPDATE SET role = 'MANAGER';
  `);
  console.log('Manager user (+251944444444) seeded.');

  const r = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  console.log('All public tables:', r.rows.map(x => x.tablename));

  await c.end();
}

main().catch(e => {
  console.error('Error running script:', e);
  process.exit(1);
});

