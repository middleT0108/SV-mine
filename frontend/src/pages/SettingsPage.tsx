import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, AlertCircle, RefreshCw, Server, Key, Cloud } from 'lucide-react';
import { getBackendUrl, setBackendUrl } from '../api/client';
import { getFalixApiKey, setFalixApiKey, getFalixPanelUrl, setFalixPanelUrl } from '../api/falix';

export const SettingsPage: React.FC = () => {
  const [url, setUrl] = useState(getBackendUrl());
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // FalixNodes / Pterodactyl Cloud API settings
  const [falixKey, setFalixKey] = useState(getFalixApiKey());
  const [falixUrl, setFalixUrlState] = useState(getFalixPanelUrl());
  const [falixTesting, setFalixTesting] = useState(false);
  const [falixResult, setFalixResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setResult(null);
    try {
      const cleanUrl = url.replace(/\/+$/, '');
      const testRes = await fetch(`${cleanUrl}/api/health`, { method: 'GET' });
      if (testRes.ok) {
        const data = await testRes.json();
        setResult({
          success: true,
          message: `Kết nối thành công! Trạng thái: ${data.status}, Uptime: ${data.uptimeSeconds}s.`
        });
      } else {
        setResult({ success: false, message: `Server phản hồi mã lỗi HTTP ${testRes.status}.` });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: `Không thể kết nối tới Backend: ${err.message}. Hãy đảm bảo IP/domain chính xác và port đã mở.`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTestFalix = async () => {
    if (!falixKey.trim()) {
      setFalixResult({ success: false, message: 'Vui lòng dán API Key của bạn trước khi kiểm tra.' });
      return;
    }
    setFalixTesting(true);
    setFalixResult(null);
    try {
      const res = await fetch(`${falixUrl.replace(/\/+$/, '')}/api/client`, {
        headers: {
          'Authorization': `Bearer ${falixKey.trim()}`,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFalixResult({
          success: true,
          message: `Kết nối FalixNodes thành công! Tìm thấy ${data.data?.length || 0} máy chủ trong tài khoản của bạn.`
        });
      } else {
        setFalixResult({
          success: false,
          message: `Không thể xác thực: HTTP ${res.status}. Hãy kiểm tra lại API Key.`
        });
      }
    } catch (err: any) {
      setFalixResult({
        success: false,
        message: `Lỗi kết nối: ${err.message}`
      });
    } finally {
      setFalixTesting(false);
    }
  };

  const handleSaveAll = () => {
    setBackendUrl(url);
    setFalixApiKey(falixKey);
    setFalixPanelUrl(falixUrl);
    alert('Đã lưu cấu hình thành công!');
    window.location.reload();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="pb-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white tracking-tight">Cấu Hình Kết Nối Hệ Thống</h1>
        <p className="text-xs text-gray-400 mt-1">
          Tùy chỉnh máy chủ Backend riêng hoặc tích hợp API Cloud để điều khiển máy chủ 24/7 tự động.
        </p>
      </div>

      {/* FalixNodes Cloud API Section (Zero Card) */}
      <div className="bg-gray-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <Cloud className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Đồng Bộ FalixNodes Cloud (Miễn Phí 0đ Không Thẻ)</h2>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Nếu bạn có tài khoản FalixNodes, bạn có thể dán API Key tại đây để nút <strong>"GENERATE IP"</strong> tự động khởi chạy và điều khiển máy chủ trên tài khoản FalixNodes của bạn.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">FalixNodes Client API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={falixKey}
                onChange={(e) => setFalixKey(e.target.value)}
                placeholder="ptlc_xxxxxxxxxxxxxxxxxxxxxxxx..."
                className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleTestFalix}
                disabled={falixTesting}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${falixTesting ? 'animate-spin' : ''}`} />
                <span>Kiểm Tra</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-500">
              Lấy API Key tại: Trang quản trị FalixNodes &rarr; Account Settings &rarr; API Credentials.
            </p>
          </div>

          {falixResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                falixResult.success
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
              }`}
            >
              {falixResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{falixResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Backend API Host Configuration */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <Server className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-white">Địa Chỉ Backend API Cá Nhân (Tùy Chọn)</h2>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Nếu bạn tự chạy backend trên máy tính tại nhà hoặc VPS Linux, hãy trỏ đường dẫn API vào đây.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Endpoint URL (HTTP/HTTPS)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:3001 hoặc https://api.yourdomain.duckdns.org"
                className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleTestConnection}
                disabled={testing || !url.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>Kiểm Tra</span>
              </button>
            </div>
          </div>

          {result && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                result.success
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
              }`}
            >
              {result.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{result.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveAll}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-2xl transition shadow-xl shadow-emerald-950"
      >
        <Save className="w-4 h-4" />
        <span>Lưu Toàn Bộ Cấu Hình</span>
      </button>
    </div>
  );
};
