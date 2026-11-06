import { prisma } from '../db/prisma';

export interface SystemSettingItem {
  key: string;
  value: string;
  description: string | null;
  category: string;
  updatedAt: Date;
}

let settingsCache: Record<string, string> = {};
let lastFetchTime = 0;
const CACHE_TTL_MS = 60_000; // 1 minute in-memory cache

export async function getAllSettings(): Promise<SystemSettingItem[]> {
  try {
    const list = await prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    // refresh cache
    const cache: Record<string, string> = {};
    for (const item of list) {
      cache[item.key] = item.value;
    }
    settingsCache = cache;
    lastFetchTime = Date.now();
    return list;
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return [];
  }
}

export async function getSettingValue(key: string, defaultValue = ''): Promise<string> {
  const now = Date.now();
  if (now - lastFetchTime > CACHE_TTL_MS || !settingsCache[key]) {
    await getAllSettings();
  }
  return settingsCache[key] ?? defaultValue;
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
        category: item.category || 'GENERAL',
      },
      create: {
        key,
        value: String(item.value),
        description: item.description,
        category: item.category || 'GENERAL',
      },
    });
    settingsCache[key] = String(item.value);
  }
  lastFetchTime = Date.now();
}

