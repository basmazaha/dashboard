// app/test-timezone/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { insertAppointmentAction, updateAppointmentAction } from './actions';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

type Appointment = {
  id: string;
  full_name: string | null;
  phone: string | null;
  date_time: string | null;
  reason: string | null;
  status: string | null;
};

export default async function TestTimezonePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // جلب الـ timezone
  const { data: settings } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  const timezone = settings?.timezone || 'Africa/Cairo';

  // جلب المواعيد
  const { data: appointments = [] } = await supabaseServer
    .from('appointments')
    .select('id, full_name, phone, date_time, reason, status')
    .order('date_time', { ascending: true })
    .limit(50);

  return (
    <TestTimezoneClient
      initialAppointments={appointments}
      timezone={timezone}
    />
  );
}

// ─── Client Component ───
'use client';

import { useState } from 'react';
import { insertAppointmentAction, updateAppointmentAction } from './actions';

export function TestTimezoneClient({
  initialAppointments,
  timezone,
}: {
  initialAppointments: any[];
  timezone: string;
}) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    date: '',
    time: '',
    reason: '',
    status: 'confirmed',
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ full_name: '', phone: '', date: '', time: '', reason: '', status: 'confirmed' });
    setShowForm(true);
  };

  const openEdit = (appt: any) => {
    const d = new Date(appt.date_time);
    setForm({
      full_name: appt.full_name || '',
      phone: appt.phone || '',
      date: d.toISOString().split('T')[0],
      time: d.toTimeString().slice(0, 5),
      reason: appt.reason || '',
      status: appt.status || 'confirmed',
    });
    setEditing(appt);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let result;
    if (editing) {
      result = await updateAppointmentAction(editing.id, form);
    } else {
      result = await insertAppointmentAction(form);
    }

    if (result.success) {
      // إعادة تحميل الصفحة بعد النجاح
      window.location.reload();
    } else {
      alert(result.error || 'حدث خطأ');
    }
  };

  const formatLocal = (utcIso: string | null, opts: Intl.DateTimeFormatOptions = {}) => {
    if (!utcIso) return '—';
    try {
      const d = new Date(utcIso);
      let s = new Intl.DateTimeFormat('ar-EG', { ...opts, timeZone: timezone }).format(d);
      return s.replace('ص', 'صباحاً').replace('م', 'مساءً');
    } catch {
      return utcIso;
    }
  };

  return (
    <div dir="rtl" style={{ padding: '2rem', fontFamily: 'Tajawal, sans-serif' }}>
      <h1>اختبار المواعيد مع Timezone: {timezone}</h1>

      <button onClick={openAdd} style={{ marginBottom: '20px', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none' }}>
        + إضافة موعد جديد
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '40px', padding: '20px', background: '#f0f9ff', borderRadius: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label>الاسم</label>
              <input name="full_name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
            </div>
            <div>
              <label>التليفون</label>
              <input name="phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
            </div>
            <div>
              <label>التاريخ</label>
              <input type="date" name="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>
            <div>
              <label>الوقت</label>
              <input type="time" name="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>السبب</label>
              <input name="reason" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button type="submit" style={{ padding: '10px 20px', background: '#2563eb', color: 'white' }}>
              {editing ? 'حفظ التعديل' : 'إضافة'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ marginRight: '10px', padding: '10px 20px', background: '#ef4444', color: 'white' }}>
              إلغاء
            </button>
          </div>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th>الاسم</th>
            <th>التاريخ</th>
            <th>الوقت</th>
            <th>UTC خام</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map(a => (
            <tr key={a.id}>
              <td>{a.full_name}</td>
              <td>{formatLocal(a.date_time, { dateStyle: 'full' })}</td>
              <td>{formatLocal(a.date_time, { timeStyle: 'short' })}</td>
              <td style={{ fontSize: '0.85rem', color: '#666' }}>{a.date_time}</td>
              <td>
                <button onClick={() => openEdit(a)} style={{ background: '#3b82f6', color: 'white', padding: '6px 12px' }}>
                  تعديل
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
