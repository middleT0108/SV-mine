import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Globe, Cpu, Users, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../api/client';

export const CreateServerPage: React.FC = () => {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [serverType, setServerType] = useState<'PAPER' | 'FABRIC' | 'FORGE' | 'VANILLA' | 'PURPUR'>('PAPER');
  const [mcVersion, setMcVersion] = useState('LATEST');
  const [ramMb, setRamMb] = useState(3072);
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [gamemode, setGamemode] = useState('survival');
  const [seed, setSeed] = useState('');
  const [enableWhitelist, setEnableWhitelist] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/servers', {
        name,
        subdomain,
        serverType,
        mcVersion,
        ramMb,
        maxPlayers,
        gamemode,
        seed,
        enableWhitelist
      });

      if (res.data.success) {
        navigate(`/servers/${res.data.server.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tạo máy chủ. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="pb-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white tracking-tight">Tạo Máy Chủ Minecraft Mới</h1>
        <p className="text-xs text-gray-400 mt-1">
          Hệ thống sẽ cấp phát container Docker cô lập và liên kết subdomain DuckDNS tự động.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Tên Máy Chủ</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Thế Giới Của Bạn Bè"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Tên Miền Subdomain DuckDNS</label>
            <div className="flex rounded-xl overflow-hidden border border-gray-800 focus-within:border-emerald-500 bg-gray-950">
              <input
                type="text"
                required
                minLength={3}
                maxLength={20}
                value={subdomain}
                onChange={handleSubdomainChange}
                placeholder="my-survival"
                className="flex-1 bg-transparent px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none font-mono"
              />
              <span className="bg-gray-900 px-3 py-2.5 text-xs text-emerald-400 font-mono flex items-center border-l border-gray-800">
                .duckdns.org
              </span>
            </div>
            <p className="text-[10px] text-gray-500">Chỉ dùng chữ thường, số, dấu gạch nối (3-20 ký tự).</p>
          </div>
        </div>

        {/* Server Type & MC Version */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Loại Engine Server</label>
            <select
              value={serverType}
              onChange={(e) => setServerType(e.target.value as any)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="PAPER">Paper (Khuyên dùng - Cực nhẹ & tối ưu FPS)</option>
              <option value="PURPUR">Purpur (Dựa trên Paper, thêm tính năng tùy chỉnh)</option>
              <option value="FABRIC">Fabric (Hỗ trợ Modpack hiệu năng cao)</option>
              <option value="FORGE">Forge (Hỗ trợ Mod nặng)</option>
              <option value="VANILLA">Vanilla (Gốc từ Mojang)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Phiên Bản Minecraft</label>
            <select
              value={mcVersion}
              onChange={(e) => setMcVersion(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="LATEST">Mới nhất (Latest Release)</option>
              <option value="1.21">1.21 (Tricky Trials)</option>
              <option value="1.20.4">1.20.4</option>
              <option value="1.19.4">1.19.4</option>
              <option value="1.16.5">1.16.5 (Ổn định cho Mods)</option>
              <option value="1.12.2">1.12.2 (Kinh điển)</option>
            </select>
          </div>
        </div>

        {/* RAM Allocation Slider */}
        <div className="space-y-2 bg-gray-950/60 p-4 rounded-2xl border border-gray-800/80">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-gray-200">Giới Hạn Bộ Nhớ RAM</span>
            </div>
            <span className="font-mono font-bold text-emerald-400">{ramMb} MB ({Math.round((ramMb / 1024) * 10) / 10} GB)</span>
          </div>
          <input
            type="range"
            min={1024}
            max={6144}
            step={512}
            value={ramMb}
            onChange={(e) => setRamMb(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <p className="text-[10px] text-gray-500">
            Khuyên dùng 3072 MB (3GB) để chơi mượt mà với 5-10 bạn bè trên máy chủ 0đ.
          </p>
        </div>

        {/* Gamemode & Players */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Chế Độ Chơi (Gamemode)</label>
            <select
              value={gamemode}
              onChange={(e) => setGamemode(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 capitalize"
            >
              <option value="survival">Sinh Tồn (Survival)</option>
              <option value="creative">Sáng Tạo (Creative)</option>
              <option value="adventure">Phiêu Lưu (Adventure)</option>
              <option value="spectator">Khán Giả (Spectator)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Số Người Chơi Tối Đa</label>
            <input
              type="number"
              min={1}
              max={50}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10) || 20)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Optional Seed & Whitelist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Hạt Giống Thế Giới (Seed - Tùy chọn)</label>
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Để trống để sinh ngẫu nhiên"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="pt-5">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableWhitelist}
                onChange={(e) => setEnableWhitelist(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500"
              />
              <span className="text-xs text-gray-300 font-medium">Bật danh sách trắng (Whitelist)</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !name.trim() || !subdomain.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-2xl transition shadow-xl shadow-emerald-950"
        >
          <span>{loading ? 'Đang Khởi Tạo Container & DNS...' : 'Khởi Chạy Máy Chủ Ngay (0đ)'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
