import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, Modal, inputClass, btnPrimary, btnSecondary } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { Pencil, Trash2 } from 'lucide-react';

interface Notification { id: string; title: string; message: string; isRead: boolean; createdAt: string; type: string; }

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [sms, setSms] = useState({ message: '', sendToAll: true });
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [editForm, setEditForm] = useState({ title: '', message: '' });

  const load = () => {
    api.get('/settings/notifications').then(({ data }) => {
      setNotifications(data.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await api.patch(`/settings/notifications/${id}/read`);
    load();
  };

  const sendAnnouncement = async () => {
    await api.post('/settings/announcements', announcement);
    setAnnouncement({ title: '', message: '' });
    load();
  };

  const sendBulkSms = async () => {
    await api.post('/settings/sms/bulk', sms);
    setSms({ message: '', sendToAll: true });
  };

  const startEdit = (n: Notification) => {
    setEditingNotification(n);
    setEditForm({ title: n.title, message: n.message });
  };

  const saveEdit = async () => {
    if (!editingNotification) return;
    await api.patch(`/settings/notifications/${editingNotification.id}`, editForm);
    setEditingNotification(null);
    load();
  };

  const deleteNotification = async (id: string) => {
    const confirmed = confirm('Are you sure you want to delete this notification? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await api.delete(`/settings/notifications/${id}`);
      load();
      alert('Notification deleted successfully');
    } catch (error) {
      alert('Failed to delete notification');
    }
  };

  return (
    <div>
      <PageHeader title={t('nav.notifications')} />
      {user?.role === 'ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border p-4 sm:p-6">
            <h3 className="font-semibold mb-4">Send Announcement</h3>
            <div className="space-y-3">
              <input className={inputClass} placeholder="Title" value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} />
              <textarea className={inputClass} placeholder="Message" rows={3} value={announcement.message} onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })} />
              <button className={btnPrimary} onClick={sendAnnouncement}>Send to All Users</button>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 sm:p-6">
            <h3 className="font-semibold mb-4">Bulk SMS</h3>
            <div className="space-y-3">
              <textarea className={inputClass} placeholder="SMS message" rows={3} value={sms.message} onChange={(e) => setSms({ ...sms, message: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sms.sendToAll} onChange={(e) => setSms({ ...sms, sendToAll: e.target.checked })} />
                Send to all active members
              </label>
              <button className={btnSecondary} onClick={sendBulkSms}>Send SMS</button>
            </div>
          </div>
        </div>
      )}
      {loading ? <LoadingSpinner /> : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`bg-white rounded-xl border p-4 ${!n.isRead ? 'border-primary-200 bg-primary-50/30' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="pr-4">
                  <h4 className="font-medium">{n.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()} · {n.type}</p>
                </div>
                <div className="flex gap-3 items-center whitespace-nowrap">
                  {!n.isRead && (
                    <button className="text-xs text-primary-600 hover:underline mr-1" onClick={() => markRead(n.id)}>Mark read</button>
                  )}
                  {user?.role === 'ADMIN' && (
                    <button className="text-slate-400 hover:text-blue-600 transition-colors" onClick={() => startEdit(n)} title="Edit">
                      <Pencil size={14} />
                    </button>
                  )}
                  <button className="text-slate-400 hover:text-red-600 transition-colors" onClick={() => deleteNotification(n.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingNotification && (
        <Modal open={!!editingNotification} onClose={() => setEditingNotification(null)} title="Edit Notification">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Title</label>
              <input className={inputClass} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Message</label>
              <textarea className={inputClass} rows={4} value={editForm.message} onChange={(e) => setEditForm({ ...editForm, message: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className={btnSecondary} onClick={() => setEditingNotification(null)}>Cancel</button>
              <button className={btnPrimary} onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
