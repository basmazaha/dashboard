// app/test-timezone/TestTimezoneClient.tsx
'use client';

import { useState } from 'react';
import { insertAppointmentAction, updateAppointmentAction } from './actions';

type Appointment = {
  id: string;
  full_name: string | null;
  phone: string | null;
  date_time: string | null;
  reason: string | null;
  status: string | null;
};

export default function TestTimezoneClient({
  initialAppointments,
  timezone,
}: {
  initialAppointments: Appointment[];
  timezone: string;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setErrorMsg(null);
    setShowForm(true);
  };

  const openEdit = (appt: Appointment) => {
    if (!appt.date_time) return;

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
    setErrorMsg(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const result = editing
      ? await updateAppointmentAction(editing.id, form)
      : await insertAppointmentAction(form);

    if (result.success) {
      window.location.reload(); // إعادة تحميل لجلب البيانات الجديدة
    } else {
      setErrorMsg(result.error || 'حدث خطأ غير متوقع');
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
      <h1 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        اختبار المواعيد (UTC → {timezone})
      </h1>

      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <button
          onClick={openAdd}
          style={{
            padding: '12px 24px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            cursor: 'pointer',
          }}
        >
          + إضافة موعد جديد
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginBottom: '40px',
            padding: '24px',
            background: '#f0f9ff',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          }}
        >
          {errorMsg && (
            <div style={{ color: 'red', marginBottom: '16px', textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px' }}>الاسم الكامل</label>
              <input
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px' }}>رقم التليفون</label>
              <input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px' }}>التاريخ</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px' }}>الوقت</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>السبب (اختياري)</label>
              <input
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                padding: '10px 20px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {editing ? 'حفظ التعديل' : 'إضافة الموعد'}
            </button>
          </div>
        </form>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid #d1d5db', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '12px', textAlign: 'right' }}>الاسم</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>التاريخ</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>الوقت</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>التاريخ والوقت معاً</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>UTC خام</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map(appt => (
              <tr key={appt.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{appt.full_name || '—'}</td>
                <td style={{ padding: '12px' }}>
                  {formatLocal(appt.date_time, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </td>
                <td style={{ padding: '12px' }}>
                  {formatLocal(appt.date_time, { hour: 'numeric', minute: '2-digit', hour12: true })}
                </td>
                <td style={{ padding: '12px', fontWeight: 500 }}>
                  {formatLocal(appt.date_time, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </td>
                <td style={{ padding: '12px', color: '#6b7280', fontSize: '0.9rem' }}>
                  {appt.date_time || '—'}
                </td>
                <td style={{ padding: '12px' }}>
                  <button
                    onClick={() => openEdit(appt)}
                    style={{
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    تعديل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
