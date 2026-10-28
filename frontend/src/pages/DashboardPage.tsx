import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, RefreshCw, Server, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { MinecraftServer } from '../types';
import { ServerCard } from '../components/ServerCard';

export const DashboardPage: React.FC = () => {
  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/servers');
      if (res.data.success) {
        setServers(res.data.servers);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách máy chủ. Vui lòng kiểm tra kết nối API Backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleStart = async (id: string) => {
    await api.post(`/servers/${id}/start`);
    fetchServers();
  };

  const handleStop = async (id: string) => {
    await api.post(`/servers/${id}/stop`);
    fetchServers();
  };

  const handleRestart = async (id: string) => {
    await api.post(`/servers/${id}/restart`);
    fetchServers();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Quản Lý Máy Chủ
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Theo dõi, điều khiển và kết nối máy chủ Minecraft của bạn với chi phí 0đ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchServers}
            disabled={loading}
            className="p-2.5 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 rounded-xl transition"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/create"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-lg shadow-emerald-950"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo Máy Chủ Mới</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800/80 rounded-2xl text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Link to="/settings" className="underline font-semibold hover:text-white">
            Kiểm tra URL Backend
          </Link>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Đang đồng bộ danh sách máy chủ...</p>
        </div>
      ) : servers.length === 0 ? (
        <div className="py-20 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
            <Server className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Chưa Có Máy Chủ Nào</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Bạn chưa tạo máy chủ Minecraft nào. Hãy bấm nút bên dưới để tạo ngay một máy chủ với subdomain DuckDNS miễn phí.
          </p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-950"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo Server Đầu Tiên (0đ)</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onStart={handleStart}
              onStop={handleStop}
              onRestart={handleRestart}
            />
          ))}
        </div>
      )}
    </div>
  );
};
