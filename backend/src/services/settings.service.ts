import { prisma } from '../db/prisma';

export interface SystemSettingItem {
  key: string;
  value: string;
  description: string | null;
  category: string;
  updatedAt: Date;
}

export const DEFAULT_SYSTEM_SETTINGS: Record<string, { value: string; description: string; category: string }> = {
  // Payment Gateway Selector
  payment_active_gateway: {
    value: 'MULTI_CHOICE',
    description: 'Active payment gateway for passenger rides (MULTI_CHOICE, TELEBIRR, ADDISPAY, CHAPA, CBE_BIRR, SANDBOX)',
    category: 'PAYMENT',
  },
  // AddisPay Settings
  addispay_sandbox_mode: {
    value: 'true',
    description: 'Enable AddisPay sandbox simulation mode (instant 1-click test)',
    category: 'PAYMENT',
  },
  addispay_api_key: {
    value: '',
    description: 'AddisPay live merchant API key',
    category: 'PAYMENT',
  },
  addispay_base_url: {
    value: 'https://uat.api.addispay.et',
    description: 'AddisPay API base endpoint URL',
    category: 'PAYMENT',
  },
  addispay_webhook_secret: {
    value: 'sandbox-signature',
    description: 'AddisPay webhook HMAC signing secret',
    category: 'PAYMENT',
  },
  // Telebirr Settings
  telebirr_sandbox_mode: {
    value: 'true',
    description: 'Enable Ethio Telecom Telebirr sandbox simulation',
    category: 'PAYMENT',
  },
  telebirr_app_id: {
    value: '',
    description: 'Telebirr Fabric App ID from Ethio Telecom developer portal',
    category: 'PAYMENT',
  },
  telebirr_app_key: {
    value: '',
    description: 'Telebirr Fabric App Key / Secret',
    category: 'PAYMENT',
  },
  telebirr_short_code: {
    value: '100123',
    description: 'Telebirr merchant short code (Till / Paybill number)',
    category: 'PAYMENT',
  },
  telebirr_public_key: {
    value: '',
    description: 'Telebirr RSA Public Key for signature verification',
    category: 'PAYMENT',
  },
  telebirr_base_url: {
    value: 'https://app.ethiomobilemoney.et:2121/ammapi/payment/service-open/',
    description: 'Telebirr H5 web checkout gateway base URL',
    category: 'PAYMENT',
  },
  // Chapa Settings
  chapa_sandbox_mode: {
    value: 'true',
    description: 'Enable Chapa sandbox simulation mode',
    category: 'PAYMENT',
  },
  chapa_secret_key: {
    value: '',
    description: 'Chapa Secret Key (e.g. CHASECK_TEST-... or CHASECK_LIVE-...)',
    category: 'PAYMENT',
  },
  chapa_public_key: {
    value: '',
    description: 'Chapa Public Key (CHAPUBK_...)',
    category: 'PAYMENT',
  },
  chapa_webhook_secret: {
    value: 'sandbox-signature',
    description: 'Chapa Webhook Secret Key',
    category: 'PAYMENT',
  },
  // CBE Birr Settings
  cbe_birr_merchant_id: {
    value: '998877',
    description: 'Commercial Bank of Ethiopia CBE Birr merchant short code (*847#)',
    category: 'PAYMENT',
  },
  cbe_birr_api_key: {
    value: '',
    description: 'CBE Birr merchant API key',
    category: 'PAYMENT',
  },
  // SMS Settings
  sms_gateway_provider: {
    value: 'FREE_SANDBOX',
    description: 'Active SMS provider (FREE_SANDBOX, TELEGRAM_BOT, TWILIO, AFROMESSAGE)',
    category: 'SMS',
  },
  telegram_bot_token: {
    value: '',
    description: 'Telegram Bot token for free 100% external OTP delivery',
    category: 'SMS',
  },
  telegram_bot_username: {
    value: 'PayTaxiOtpBot',
    description: 'Telegram bot username handle',
    category: 'SMS',
  },
  // Transit Rules & Commission
  platform_commission_percent: {
    value: '2.5',
    description: 'Platform commission fee deducted per completed ride (%)',
    category: 'FARES',
  },
  auto_approve_drivers: {
    value: 'false',
    description: 'Automatically approve newly registered drivers without manual KYC review',
    category: 'SECURITY',
  },
  driver_backup_pin_default: {
    value: 'ABCD1234',
    description: 'Default Driver Backup PIN for offline/fallback driver authentication',
    category: 'SECURITY',
  },
};

let settingsCache: Record<string, string> = {};
let lastFetchTime = 0;
const CACHE_TTL_MS = 60_000; // 1 minute in-memory cache

export async function getAllSettings(): Promise<SystemSettingItem[]> {
  try {
    const list = await prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    const existingKeys = new Set(list.map((item) => item.key));
    const mergedList: SystemSettingItem[] = [...list];

    // Populate defaults for any key not yet written to DB
    for (const [key, def] of Object.entries(DEFAULT_SYSTEM_SETTINGS)) {
      if (!existingKeys.has(key)) {
        mergedList.push({
          key,
          value: def.value,
          description: def.description,
          category: def.category,
          updatedAt: new Date(),
        });
      }
    }

    // Refresh cache
    const cache: Record<string, string> = {};
    for (const item of mergedList) {
      cache[item.key] = item.value;
    }
    settingsCache = cache;
    lastFetchTime = Date.now();

    return mergedList;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Notice: Using default system settings:', (error as Error).message);
    }
    // Return defaults as fallback
    return Object.entries(DEFAULT_SYSTEM_SETTINGS).map(([key, def]) => ({
      key,
      value: def.value,
      description: def.description,
      category: def.category,
      updatedAt: new Date(),
    }));
  }
}

export async function getSettingValue(key: string, defaultValue = ''): Promise<string> {
  const now = Date.now();
  if (now - lastFetchTime > CACHE_TTL_MS || settingsCache[key] === undefined) {
    await getAllSettings();
  }
  return settingsCache[key] ?? DEFAULT_SYSTEM_SETTINGS[key]?.value ?? defaultValue;
}

export async function updateSystemSettings(
  updates: Record<string, { value: string; description?: string; category?: string }>
): Promise<void> {
  for (const [key, item] of Object.entries(updates)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value: String(item.value),
        description: item.description,
        category: item.category || DEFAULT_SYSTEM_SETTINGS[key]?.category || 'GENERAL',
      },
      create: {
        key,
        value: String(item.value),
        description: item.description,
        category: item.category || DEFAULT_SYSTEM_SETTINGS[key]?.category || 'GENERAL',
      },
    });
    settingsCache[key] = String(item.value);
  }
  lastFetchTime = Date.now();
}
