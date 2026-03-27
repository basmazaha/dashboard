// timezone fallback
export const DEFAULT_TIMEZONE = 'Africa/Cairo' as const;

export const TIMEZONE_LABELS: Record<string, string> = {
  'Africa/Cairo': 'القاهرة',
  'Asia/Riyadh': 'الرياض',
  'Asia/Dubai': 'دبي',
  'Europe/Istanbul': 'إسطنبول',
  'America/New_York': 'نيويورك',
  'UTC': 'UTC',
} as const;

export type Timezone = keyof typeof TIMEZONE_LABELS;
