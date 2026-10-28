import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Terminal, Settings, Archive, Trash2, ArrowLeft, Play, Square, RotateCw, Copy, Check, ExternalLink } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { MinecraftServer } from '../types';
import { ConsoleTerminal } from '../components/ConsoleTerminal';
import { ConfigEditor } from '../components/ConfigEditor';
import { BackupManager } from '../components/BackupManager';

export const ServerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [server, setServer] = useState<MinecraftServer | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'config' | 'backups'>('console');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchServer = async () => {
    try {
      const res = await api.get(`/servers/${id}`);
      if (res.data.success) {
        setServer(res.data.server);
      }
    } catch (err: any) {
      console.error('Failed to load server:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServer();
  }, [id]);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(true);
    try {
      await api.post(`/servers/${id}/${action}`);
      await fetchServer();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn xóa vĩnh viễn máy chủ này và toàn bộ dữ liệu thế giới không?')) {
      return;
    }

    try {
      await api.delete(`/servers/${id}`);
      navigate('/');
    } catch (err: any) {
      alert('Xóa máy chủ thất bại: ' + (err.response?.data?.message || err.message));
    }
  };

  const copyAddress = () => {
    if (!server) return;
    navigator.clipboard.writeText(server.fullDomain || `${server.subdomain}.duckdns.org`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="py-20 text-center text-gray-400 text-sm">Đang tải thông tin máy chủ...</div>;
  }

  if (!server) {
    return (
      <div className="py-20 text-center space-y-4">
        <h3 className="text-lg font-bold text-white">Không tìm thấy máy chủ</h3>
        <Link to="/" className="text-emerald-400 text-sm hover:underline">Quay lại danh sách</Link>
      </div>
    );
  }

  const isRunning = server.status === 'running';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Quay Lại Máy Chủ</span>
        </Link>

        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 rounded-xl transition"
        >
          <Trash2 className="w-4 h-4" />
          <span>Xóa Server</span>
        </button>
      </div>

      {/* Server Header Info Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{server.name}</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
              {server.server_type} {server.mc_version}
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2 bg-gray-950 px-3 py-1.5 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400 font-medium">Địa chỉ kết nối:</span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">{server.fullDomain}</span>
              <button
                onClick={copyAddress}
                className="p-1 hover:text-white text-gray-400 transition"
                title="Sao chép địa chỉ"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {server.directAddress && (
              <div className="text-xs text-gray-500 font-mono">
                Cổng trực tiếp: {server.directAddress}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {isRunning ? (
            <>
              <button
                onClick={() => handleAction('restart')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 text-xs font-semibold rounded-xl transition"
              >
                <RotateCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                <span>Khởi Động Lại</span>
              </button>
              <button
                onClick={() => handleAction('stop')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold rounded-xl transition"
              >
                <Square className="w-4 h-4" />
                <span>Tắt Máy Chủ</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handleAction('start')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-950"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Khởi Động Ngay</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('console')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'console'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Console & Lệnh RCON</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'config'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Cấu Hình (server.properties)</span>
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'backups'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Sao Lưu & Phục Hồi</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'console' && token && (
        <ConsoleTerminal serverId={server.id} token={token} />
      )}

      {activeTab === 'config' && (
        <ConfigEditor serverId={server.id} />
      )}

      {activeTab === 'backups' && (
        <BackupManager serverId={server.id} />
      )}
    </div>
  );
};
