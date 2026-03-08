// app/settings/timezone/page.tsx
import { createClient } from '@/lib/supabase/server'; // افترض أنك عندك client server-side
import { redirect } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const COMMON_TIMEZONES = [
  { value: 'Africa/Cairo', label: 'القاهرة (UTC+2/+3)' },
  { value: 'Asia/Riyadh', label: 'الرياض (UTC+3)' },
  { value: 'Asia/Dubai', label: 'دبي (UTC+4)' },
  { value: 'Europe/Istanbul', label: 'إسطنبول (UTC+3)' },
  { value: 'America/New_York', label: 'نيويورك (UTC-5/-4)' },
  { value: 'UTC', label: 'UTC' },
  // أضف المزيد حسب احتياج العملاء
];

export default async function SettingsPage() {
  const supabase = createClient();

  // جلب الإعدادات الحالية
  const { data: settings, error } = await supabase
    .from('business_settings')
    .select('timezone')
    .eq('id', 1)
    .single();

  if (error || !settings) {
    // يمكنك إنشاء الصف تلقائيًا إذا مش موجود
    await supabase.from('business_settings').insert({ id: 1, timezone: 'Africa/Cairo' });
    return <div>جاري إنشاء الإعدادات...</div>;
  }

  const currentTz = settings.timezone;

  return (
    <div className="container max-w-4xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الشركة</CardTitle>
          <CardDescription>تعديل التوقيت المحلي الافتراضي للأعمال</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              'use server';

              const supabase = createClient();
              const newTz = formData.get('timezone') as string;

              const { error } = await supabase
                .from('business_settings')
                .update({ timezone: newTz, updated_at: new Date().toISOString() })
                .eq('id', 1);

              if (!error) {
                redirect('/settings?updated=true');
              }
            }}
          >
            <div className="grid gap-4">
              <Label htmlFor="timezone">المنطقة الزمنية للشركة</Label>
              <Select name="timezone" defaultValue={currentTz}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنطقة الزمنية" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button type="submit" className="mt-6 w-full md:w-auto">
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
