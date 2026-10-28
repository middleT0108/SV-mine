import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, RefreshCw, Server, AlertCircle, Sparkles, Copy, Check, Zap } from 'lucide-react';
import { api } from '../api/client';
import { MinecraftServer } from '../types';
import { ServerCard } from '../components/ServerCard';
import { GenerateIpModal } from '../components/GenerateIpModal';
import { generateCloudServer, GeneratedServerResult } from '../api/falix';

export const DashboardPage: React.FC = () => {
  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick 1-Click Generate IP states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedServerResult | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [copiedQuick, setCopiedQuick] = useState(false);

  const fetchServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/servers');
      if (res.data.success) {
        setServers(res.data.servers);
      }
    } catch (err: any) {
      // Don't show scary error if backend is not yet attached, since 1-click cloud IP works standalone
      setError(null);
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

  const handleGenerateIp = async () => {
    setIsModalOpen(true);
    setGenLoading(true);
    try {
      const result = await generateCloudServer();
      setGeneratedData(result);
    } catch (err) {
      console.error('Failed to generate cloud IP:', err);
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1-Click Hero Banner: Instant 24/7 IP Generator */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/80 via-gray-900 to-gray-900 border border-emerald-500/50 p-6 sm:p-8 shadow-2xl shadow-emerald-950/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>TÍNH NĂNG 1-CLICK: KHÔNG CẦN THẺ - 0Đ VĨNH VIỄN</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Nhận IP Máy Chủ Minecraft 24/7 Ngay Lập Tức
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            Chỉ cần bấm nút bên dưới, hệ thống sẽ tự động cấp phát địa chỉ IP Cloud trực tiếp. Bạn chỉ cần sao chép, dán vào Minecraft là vào chơi được ngay cùng bạn bè!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleGenerateIp}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 hover:from-emerald-400 hover:to-green-300 text-gray-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:scale-105 active:scale-95 group"
          >
            <Sparkles className="w-5 h-5 fill-current text-gray-950 group-hover:rotate-12 transition-transform" />
            <span className="tracking-wide">GENERATE IP (CHƠI NGAY)</span>
          </button>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Danh Sách Máy Chủ Của Bạn
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Quản lý các máy chủ đã tạo hoặc chỉnh sửa cấu hình chuyên sâu
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
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition border border-gray-700"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Tạo Thủ Công (Tùy Chỉnh RAM/Seed)</span>
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
        <div className="py-16 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
            <Server className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Chưa Có Máy Chủ Nào Được Lưu</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Bạn có thể bấm nút <strong>"GENERATE IP"</strong> ở trên để nhận ngay một địa chỉ IP chơi 24/7, hoặc bấm nút bên dưới để tự tạo server theo ý muốn.
          </p>
          <button
            onClick={handleGenerateIp}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-950"
          >
            <Sparkles className="w-4 h-4" />
            <span>Bấm Để Nhận IP 24/7 Ngay (0đ)</span>
          </button>
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

      {/* 1-Click Generate IP Modal */}
      <GenerateIpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        serverData={generatedData}
        loading={genLoading}
        onRegenerate={handleGenerateIp}
      />
    </div>
  );
};
