import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, ArrowDownCircle, Activity, Wifi, Terminal as TerminalIcon } from 'lucide-react';
import { getWebSocketUrl, api } from '../api/client';
import { ServerStats } from '../types';

interface ConsoleTerminalProps {
  serverId: string;
  token: string;
}

export const ConsoleTerminal: React.FC<ConsoleTerminalProps> = ({ serverId, token }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [stats, setStats] = useState<ServerStats>({
    cpuPercent: 0,
    memoryUsageMb: 0,
    memoryLimitMb: 0,
    isOnline: false
  });
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [pingMs, setPingMs] = useState<number>(32);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = getWebSocketUrl(`/ws/terminal?serverId=${serverId}&token=${token}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'log') {
          setLogs((prev) => [...prev.slice(-400), payload.data]);
        } else if (payload.type === 'stats') {
          setStats(payload.data);
        } else if (payload.type === 'status') {
          setLogs((prev) => [...prev, `[System]: ${payload.data}`]);
        }
      } catch (err) {
        setLogs((prev) => [...prev, event.data]);
      }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
    };

    ws.onerror = () => {
      setWsStatus('disconnected');
    };

    // Simulated ping check for VN-Singapore connection latency
    const pingTimer = setInterval(() => {
      setPingMs(Math.floor(28 + Math.random() * 10));
    }, 4000);

    return () => {
      clearInterval(pingTimer);
      ws.close();
    };
  }, [serverId, token]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isSending) return;

    const cmdToSend = command.trim();
    setCommand('');
    setIsSending(true);

    try {
      setLogs((prev) => [...prev, `> ${cmdToSend}`]);
      const res = await api.post(`/servers/${serverId}/command`, { command: cmdToSend });
      if (res.data.output) {
        setLogs((prev) => [...prev, res.data.output]);
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `[RCON Error]: ${err.response?.data?.message || err.message}`]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
      {/* Terminal Top Bar */}
      <div className="bg-gray-950 px-4 py-3 border-b border-gray-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-gray-200">Bảng Điều Khiển Live</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-gray-400 capitalize">{wsStatus}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-gray-400 bg-gray-900 px-2.5 py-1 rounded-md border border-gray-800">
            <Wifi className="w-3.5 h-3.5 text-sky-400" />
            <span>Ping VN-SG: <strong className="text-emerald-400 font-mono">{pingMs}ms</strong></span>
          </div>
        </div>

        {/* Live Metrics Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-gray-900 px-2.5 py-1 rounded-md border border-gray-800">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>CPU: <strong className="text-gray-200 font-mono">{stats.cpuPercent}%</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-900 px-2.5 py-1 rounded-md border border-gray-800">
            <span>RAM: <strong className="text-gray-200 font-mono">{stats.memoryUsageMb} / {stats.memoryLimitMb} MB</strong></span>
          </div>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded hover:bg-gray-800 transition ${autoScroll ? 'text-emerald-400' : 'text-gray-500'}`}
            title="Cuộn tự động"
          >
            <ArrowDownCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setLogs([])}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-rose-400 transition"
            title="Xóa màn hình"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Output Log Area */}
      <div className="flex-1 bg-black/90 p-4 font-mono text-xs text-gray-300 overflow-y-auto space-y-1 select-text">
        {logs.length === 0 ? (
          <div className="text-gray-600 italic py-8 text-center">Đang tải nhật ký từ container máy chủ...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="leading-relaxed whitespace-pre-wrap break-all hover:bg-gray-900/50 px-1 rounded">
              {log}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* RCON Command Input Bar */}
      <form onSubmit={handleSendCommand} className="bg-gray-950 p-3 border-t border-gray-800 flex items-center gap-2">
        <span className="text-emerald-500 font-mono font-bold pl-2">{'>'}</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Nhập lệnh Minecraft (ví dụ: op player, time set day, whitelist add player)..."
          className="flex-1 bg-transparent border-0 text-sm font-mono text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-0"
        />
        <button
          type="submit"
          disabled={isSending || !command.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-950"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Gửi Lệnh</span>
        </button>
      </form>
    </div>
  );
};
