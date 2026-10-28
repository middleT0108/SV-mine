import React, { useState, useEffect } from 'react';
import { Archive, DownloadCloud, RotateCcw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../api/client';
import { ServerBackup } from '../types';

interface BackupManagerProps {
  serverId: string;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ serverId }) => {
  const [backups, setBackups] = useState<ServerBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchBackups();
  }, [serverId]);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/servers/${serverId}/backups`);
      if (res.data.success) {
        setBackups(res.data.backups);
      }
    } catch (err: any) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    setStatusMsg(null);
    try {
      const res = await api.post(`/servers/${serverId}/backups`);
      setStatusMsg({ text: res.data.message || 'Tạo bản sao lưu thành công!', type: 'success' });
      fetchBackups();
    } catch (err: any) {
      setStatusMsg({ text: 'Tạo sao lưu thất bại: ' + (err.response?.data?.message || err.message), type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!window.confirm('Cảnh báo: Khôi phục sẽ ghi đè toàn bộ thế giới và dữ liệu hiện tại bằng bản sao lưu này. Bạn có chắc chắn không?')) {
      return;
    }

    setRestoringId(backupId);
    setStatusMsg(null);
    try {
      const res = await api.post(`/servers/${serverId}/backups/${backupId}/restore`);
      setStatusMsg({ text: res.data.message || 'Khôi phục hoàn tất!', type: 'success' });
    } catch (err: any) {
      setStatusMsg({ text: 'Khôi phục thất bại: ' + (err.response?.data?.message || err.message), type: 'error' });
    } finally {
      setRestoringId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg text-white">Quản Lý Sao Lưu (0đ Storage)</h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Dữ liệu thế giới được nén `.tar.gz`. Hệ thống tự động giữ tối đa 3 bản mới nhất để không vượt dung lượng miễn phí.
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-950"
        >
          <DownloadCloud className={`w-4 h-4 ${creating ? 'animate-bounce' : ''}`} />
          <span>{creating ? 'Đang Đóng Gói...' : 'Tạo Sao Lưu Ngay'}</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
              : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500 text-xs">Đang tải danh sách bản sao lưu...</div>
      ) : backups.length === 0 ? (
        <div className="p-8 text-center bg-gray-950/50 rounded-xl border border-gray-800/50 text-xs text-gray-500">
          Chưa có bản sao lưu nào. Hãy bấm "Tạo Sao Lưu Ngay" để bảo vệ thế giới Minecraft của bạn.
        </div>
      ) : (
        <div className="space-y-3">
          {backups.map((b) => (
            <div
              key={b.id}
              className="bg-gray-950/60 p-4 rounded-xl border border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gray-700 transition"
            >
              <div className="space-y-1">
                <div className="font-mono text-xs font-semibold text-gray-200">{b.filename}</div>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    {new Date(b.created_at).toLocaleString('vi-VN')}
                  </span>
                  <span>•</span>
                  <span>Dung lượng: <strong className="text-emerald-400">{formatBytes(b.file_size_bytes)}</strong></span>
                </div>
              </div>

              <button
                onClick={() => handleRestore(b.id)}
                disabled={restoringId === b.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/60 border border-gray-700 text-xs font-medium text-gray-200 rounded-lg transition"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${restoringId === b.id ? 'animate-spin' : ''}`} />
                <span>{restoringId === b.id ? 'Đang Phục Hồi...' : 'Khôi Phục'}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
