import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';

interface ConfigEditorProps {
  serverId: string;
}

export const ConfigEditor: React.FC<ConfigEditorProps> = ({ serverId }) => {
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchProperties();
  }, [serverId]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/servers/${serverId}/properties`);
      if (res.data.success) {
        setProperties(res.data.properties);
      }
    } catch (err: any) {
      setMessage({ text: 'Không thể đọc file server.properties: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePropChange = (key: string, value: string) => {
    setProperties((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put(`/servers/${serverId}/properties`, { properties });
      setMessage({ text: res.data.message || 'Lưu cấu hình thành công! Hãy khởi động lại server.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: 'Lưu thất bại: ' + (err.response?.data?.message || err.message), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang đọc cấu hình server.properties...</div>;
  }

  const priorityKeys = [
    { key: 'motd', label: 'Dòng mô tả Server (MOTD)', type: 'text' },
    { key: 'difficulty', label: 'Độ khó', type: 'select', options: ['peaceful', 'easy', 'normal', 'hard'] },
    { key: 'pvp', label: 'Cho phép đánh nhau (PvP)', type: 'select', options: ['true', 'false'] },
    { key: 'online-mode', label: 'Kiểm tra bản quyền (Online Mode)', type: 'select', options: ['true', 'false'] },
    { key: 'white-list', label: 'Kích hoạt Whitelist', type: 'select', options: ['false', 'true'] },
    { key: 'allow-flight', label: 'Cho phép bay (Allow Flight)', type: 'select', options: ['false', 'true'] },
    { key: 'view-distance', label: 'Tầm nhìn (View Distance)', type: 'number' },
    { key: 'spawn-protection', label: 'Bán kính bảo vệ điểm hồi sinh', type: 'number' },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-800">
        <div>
          <h3 className="font-bold text-lg text-white">Tùy Chỉnh server.properties</h3>
          <p className="text-xs text-gray-400 mt-1">
            Chỉnh sửa cài đặt cốt lõi của máy chủ. Cần khởi động lại server để thay đổi có hiệu lực.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-950"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Đang Lưu...' : 'Lưu Cấu Hình'}</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
              : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Structured settings grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {priorityKeys.map(({ key, label, type, options }) => (
          <div key={key} className="bg-gray-950/60 p-4 rounded-xl border border-gray-800/80 space-y-2">
            <label className="text-xs font-semibold text-gray-300 block">{label}</label>
            {type === 'select' ? (
              <select
                value={properties[key] || options![0]}
                onChange={(e) => handlePropChange(key, e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {options!.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                value={properties[key] || ''}
                onChange={(e) => handlePropChange(key, e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            )}
            <span className="text-[10px] text-gray-500 font-mono">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
