'use client';

import { useState } from 'react';
import { addOffDay, deleteOffDay } from './actions';   // ← حذف upsertOffDays

type OffDay = {
  id: string;
  date: string;
  description: string | null;
};

type Props = {
  initialOffDays: OffDay[];
};

export default function OffDaysSection({ initialOffDays }: Props) {
  const [offDays, setOffDays] = useState<OffDay[]>(initialOffDays);
  const [isEditing, setIsEditing] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAdd = async () => {
    if (!newDate) {
      setMessage({ type: 'error', text: 'يرجى اختيار تاريخ' });
      return;
    }

    setAdding(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('date', newDate);
    const trimmedDesc = newDescription.trim();
    if (trimmedDesc) {
      formData.append('description', trimmedDesc);
    }

    const result = await addOffDay(formData);

    if (result.success && result.newDay) {
      setOffDays(prev => [...prev, result.newDay]);
      setNewDate('');
      setNewDescription('');
      setMessage({ type: 'success', text: 'تم إضافة اليوم المغلق بنجاح' });
    } else {
      setMessage({ type: 'error', text: result.error || 'فشل الإضافة' });
    }

    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا اليوم؟')) return;

    const result = await deleteOffDay(id);

    if (result.success) {
      setOffDays(prev => prev.filter(d => d.id !== id));
      setMessage({ type: 'success', text: 'تم الحذف بنجاح' });
    } else {
      setMessage({ type: 'error', text: result.error || 'فشل الحذف' });
    }
  };

  return (
    <section className="off-days-section">
      <div className="section-header">
        <h2>الأيام المغلقة (العطلات الاستثنائية)</h2>
        <button
          className="btn btn-edit"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'إنهاء التعديل' : 'تعديل'}
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الوصف</th>
              {isEditing && <th>إجراء</th>}
            </tr>
          </thead>
          <tbody>
            {offDays.map(day => (
              <tr key={day.id}>
                <td>
                  {isEditing ? (
                    <input
                      className="form-input"
                      type="date"
                      defaultValue={day.date}
                      onChange={e => {
                        // تعديل محلي فقط (لن يحفظ إلا إذا أضفنا upsert لاحقًا)
                        setOffDays(prev =>
                          prev.map(d => d.id === day.id ? { ...d, date: e.target.value } : d)
                        );
                      }}
                    />
                  ) : (
                    new Date(day.date).toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="form-input"
                      type="text"
                      defaultValue={day.description || ''}
                      onChange={e => {
                        setOffDays(prev =>
                          prev.map(d => d.id === day.id ? { ...d, description: e.target.value || null } : d)
                        );
                      }}
                    />
                  ) : day.description || '—'}
                </td>
                {isEditing && (
                  <td>
                    <button
                      className="btn btn-delete small"
                      onClick={() => handleDelete(day.id)}
                    >
                      حذف
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <div className="add-new-row">
          <h3>إضافة يوم مغلق جديد</h3>
          <div className="add-form">
            <input
              className="form-input"
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              required
            />
            <input
              className="form-input"
              type="text"
              placeholder="الوصف (اختياري)"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
            />
            <button
              className="btn btn-add"
              onClick={handleAdd}
              disabled={adding}
            >
              {adding ? 'جاري الإضافة...' : 'إضافة'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
