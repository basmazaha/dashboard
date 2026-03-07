'use client';

import { useState } from 'react';
import { addOffDay, deleteOffDay } from './actions';
import './working-hours.css'; // يمكن استيراد نفس الملف أو إنشاء واحد جديد

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
    if (!newDate) return;

    setAdding(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('date', newDate);
    formData.append('description', newDescription);

    const result = await addOffDay(formData);

    if (result.success) {
      setOffDays((prev) => [
        ...prev,
        {
          id: Date.now().toString(), // مؤقت حتى يتم تحديث
          date: newDate,
          description: newDescription || null,
        },
      ]);
      setNewDate('');
      setNewDescription('');
      setMessage({ type: 'success', text: 'تم إضافة اليوم المغلق بنجاح' });
    } else {
      setMessage({ type: 'error', text: result.error || 'حدث خطأ أثناء الإضافة' });
    }

    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا اليوم؟')) return;

    const result = await deleteOffDay(id);

    if (result.success) {
      setOffDays((prev) => prev.filter((d) => d.id !== id));
      setMessage({ type: 'success', text: 'تم الحذف بنجاح' });
    } else {
      setMessage({ type: 'error', text: result.error || 'حدث خطأ أثناء الحذف' });
    }
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    setMessage(null);
  };

  return (
    <section className="off-days-section">
      <div className="section-header">
        <h2 className="section-title">الأيام المغلقة (العطلات الاستثنائية)</h2>
        <button
          onClick={toggleEdit}
          className="btn btn-edit"
        >
          {isEditing ? 'إنهاء التعديل' : 'تعديل العطلات'}
        </button>
      </div>

      {message && (
        <p className={`message ${message.type}`}>{message.text}</p>
      )}

      <div className="table-container">
        <table className="off-days-table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الوصف</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {offDays.map((day) => (
              <tr key={day.id}>
                <td>
                  {isEditing ? (
                    <input
                      type="date"
                      value={day.date}
                      onChange={(e) => {
                        setOffDays((prev) =>
                          prev.map((d) =>
                            d.id === day.id ? { ...d, date: e.target.value } : d
                          )
                        );
                      }}
                    />
                  ) : (
                    day.date
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={day.description || ''}
                      onChange={(e) => {
                        setOffDays((prev) =>
                          prev.map((d) =>
                            d.id === day.id ? { ...d, description: e.target.value || null } : d
                          )
                        );
                      }}
                    />
                  ) : (
                    day.description || '—'
                  )}
                </td>
                <td>
                  {isEditing && (
                    <button
                      onClick={() => handleDelete(day.id)}
                      className="btn btn-delete"
                    >
                      حذف
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <div className="add-form">
          <h3>إضافة يوم مغلق جديد</h3>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            placeholder="التاريخ"
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="الوصف"
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="btn btn-add"
          >
            {adding ? 'جاري الإضافة...' : 'إضافة'}
          </button>
        </div>
      )}
    </section>
  );
}
