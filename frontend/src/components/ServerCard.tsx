import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Square, RotateCw, Copy, Check, Terminal, Cpu, HardDrive, Shield } from 'lucide-react';
import { MinecraftServer } from '../types';

interface ServerCardProps {
  server: MinecraftServer;
  onStart: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onRestart: (id: string) => Promise<void>;
}

export const ServerCard: React.FC<ServerCardProps> = ({ server, onStart, onStop, onRestart }) => {
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedDirect, setCopiedDirect] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const copyToClipboard = (text: string, isDomain: boolean) => {
    navigator.clipboard.writeText(text);
    if (isDomain) {
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } else {
      setCopiedDirect(true);
      setTimeout(() => setCopiedDirect(false), 2000);
    }
  };

  const handleAction = async (action: () => Promise<void>) => {
    setActionLoading(true);
    try {
      await action();
    } finally {
      setActionLoading(false);
    }
  };

  const isRunning = server.status === 'running';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition duration-200 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-white tracking-tight">{server.name}</h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-800 text-emerald-400 border border-gray-700">
                {server.server_type} {server.mc_version}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Chế độ: <span className="capitalize text-gray-300">{server.gamemode}</span> | Tối đa: {server.max_players} người</p>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRunning ? 'bg-emerald-500 animate-pulse' : server.status === 'starting' ? 'bg-amber-400 animate-bounce' : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-medium uppercase tracking-wider text-gray-300">
              {server.status === 'running' ? 'Đang Chạy' : server.status === 'starting' ? 'Đang Bật' : 'Đã Tắt'}
            </span>
          </div>
        </div>

        {/* Connection Addresses Box */}
        <div className="bg-gray-950/80 border border-gray-800/80 rounded-xl p-3 mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">Tên miền (mc-router 25565):</span>
            <button
              onClick={() => copyToClipboard(server.fullDomain || `${server.subdomain}.duckdns.org`, true)}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono transition"
            >
              {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{server.fullDomain || `${server.subdomain}.duckdns.org`}</span>
            </button>
          </div>

          {server.directAddress && (
            <div className="flex items-center justify-between text-xs border-t border-gray-900 pt-2">
              <span className="text-gray-500">Cổng trực tiếp (IP:Port):</span>
              <button
                onClick={() => copyToClipboard(server.directAddress!, false)}
                className="flex items-center gap-1 text-gray-400 hover:text-gray-300 font-mono transition"
              >
                {copiedDirect ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{server.directAddress}</span>
              </button>
            </div>
          )}
        </div>

        {/* Resources Metrics Summary */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-5">
          <div className="flex items-center gap-2 bg-gray-950/40 p-2 rounded-lg border border-gray-800/50">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>RAM: <strong className="text-gray-200">{server.ram_mb} MB</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-gray-950/40 p-2 rounded-lg border border-gray-800/50">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>CPU: <strong className="text-gray-200">2 Cores Max</strong></span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-800/80">
        <Link
          to={`/servers/${server.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-xl transition"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bảng Điều Khiển</span>
        </Link>

        {isRunning ? (
          <>
            <button
              onClick={() => handleAction(() => onRestart(server.id))}
              disabled={actionLoading}
              title="Khởi động lại"
              className="p-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 text-amber-300 rounded-xl transition"
            >
              <RotateCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => handleAction(() => onStop(server.id))}
              disabled={actionLoading}
              title="Dừng máy chủ"
              className="p-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 rounded-xl transition"
            >
              <Square className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => handleAction(() => onStart(server.id))}
            disabled={actionLoading}
            title="Bật máy chủ"
            className="flex items-center gap-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-950"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Khởi Động</span>
          </button>
        )}
      </div>
    </div>
  );
};
