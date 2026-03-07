'use client';

import { useState } from 'react';
import { addOffDay, deleteOffDay } from './actions';

type OffDay = {
  id: string;
  date: string;
  description: string | null;
};

type Props = {
  initialOffDays: OffDay[];
};

export default function OffDaysSection({ initialOffDays }: Props) {
  const [offDays, setOffDays] = useState(initialOffDays);
  const [newDate, setNewDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;

    setAdding(true);

    const formData = new FormData();
    formData.append('date', newDate);
    formData.append('description', newDescription);

    const result = await addOffDay(formData);

    if (result.success) {
      // تحديث مؤقت – يمكن تحسينه بإعادة جلب البيانات
      setOffDays(prev => [
        ...prev,
        {
          id: 'temp-' + Date.now(), // مؤقت
          date: newDate,
          description: newDescription || null,
        },
      ]);
      setNewDate('');
      setNewDescription('');
      // يفضل إعادة التحميل أو استخدام optimistic update حقيقي + revalidation
      window.location.reload(); // حل بسيط مؤقت
    } else {
      alert(result.error || 'حدث خطأ أثناء الإضافة');
    }

    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا اليوم المغلق؟')) return;

    const result = await deleteOffDay(id);
    if (result.success) {
      setOffDays(prev => prev.filter(d => d.id !== id));
    } else {
      alert(result.error || 'حدث خطأ أثناء الحذف');
    }
  };

  return (
    <section className="off-days-section">
      <h3>الأيام المغلقة (العطلات الاستثنائية)</h3>

      <form onSubmit={handleAdd} className="add-off-day-form">
        <div className="form-row">
          <label>التاريخ</label>
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <label>الوصف / السبب (اختياري)</label>
          <input
            type="text"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            placeholder="مثال: عيد الفطر، إجازة رسمية، تدريب"
          />
        </div>

        <button type="submit" disabled={adding} className="btn btn--primary">
          {adding ? 'جاري الإضافة...' : 'إضافة يوم مغلق'}
        </button>
      </form>

      {offDays.length > 0 ? (
        <div className="off-days-table-wrapper">
          <table className="off-days-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الوصف</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {offDays.map(day => (
                <tr key={day.id}>
                  <td className="date-cell">
                    {new Date(day.date).toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </td>
                  <td>{day.description || '—'}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(day.id)}
                      className="btn btn--danger btn--small"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-data">لا توجد أيام مغلقة مسجلة حالياً</p>
      )}
    </section>
  );
}
