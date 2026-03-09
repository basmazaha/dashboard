// app/dashboard/working-hours/OffDaysSection.tsx

'use client';

import { useState } from 'react';
import { addOffDay, deleteOffDay, upsertOffDays } from './actions';
import type { OffDay } from './types';

type Props = {
  initialOffDays: OffDay[];
};

export default function OffDaysSection({ initialOffDays }: Props) {
  const [offDays, setOffDays] = useState<OffDay[]>(initialOffDays);
  const [originalOffDays, setOriginalOffDays] = useState<OffDay[]>(initialOffDays);
  const [isEditing, setIsEditing] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
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
    if (trimmedDesc) formData.append('description', trimmedDesc);

    const result = await addOffDay(formData);

    if (result.success) {
      setOffDays(prev => [...prev, result.data]);
      setOriginalOffDays(prev => [...prev, result.data]);
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
      setOriginalOffDays(prev => prev.filter(d => d.id !== id));
      setMessage({ type: 'success', text: 'تم الحذف بنجاح' });
    } else {
      setMessage({ type: 'error', text: result.error || 'فشل الحذف' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const result = await upsertOffDays(offDays);

    if (result.success) {
      setOriginalOffDays(offDays);
      setMessage({ type: 'success', text: 'تم حفظ التغييرات بنجاح' });
      setIsEditing(false);
    } else {
      setMessage({ type: 'error', text: result.error || 'حدث خطأ أثناء الحفظ' });
    }

    setSaving(false);
  };

  const handleCancel = () => {
    setOffDays(originalOffDays);
    setIsEditing(false);
    setMessage(null);
  };

  return (
    <section className="off-days-section">
      <div className="section-header">
        <h2>الأيام المغلقة (العطلات الاستثنائية)</h2>

        {isEditing ? (
          <div className="edit-controls">
            <button className="btn btn-cancel" onClick={handleCancel} disabled={saving || adding}>
              إلغاء
            </button>
            <button className="btn btn-save" onClick={handleSave} disabled={saving || adding}>
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        ) : (
          <button className="btn btn-edit" onClick={() => setIsEditing(true)}>
            تعديل
          </button>
        )}
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
                      value={day.date}
                      onChange={e =>
                        setOffDays(prev =>
                          prev.map(d =>
                            d.id === day.id ? { ...d, date: e.target.value } : d
                          )
                        )
                      }
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
                      value={day.description || ''}
                      onChange={e =>
                        setOffDays(prev =>
                          prev.map(d =>
                            d.id === day.id
                              ? { ...d, description: e.target.value.trim() || null }
                              : d
                          )
                        )
                      }
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
              disabled={adding || saving}
            >
              {adding ? 'جاري الإضافة...' : 'إضافة'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
