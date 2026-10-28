import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, AlertCircle, RefreshCw, Server } from 'lucide-react';
import { getBackendUrl, setBackendUrl, api } from '../api/client';

export const SettingsPage: React.FC = () => {
  const [url, setUrl] = useState(getBackendUrl());
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setResult(null);
    try {
      // Temporarily test the new candidate URL
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

  const handleSave = () => {
    setBackendUrl(url);
    alert('Đã lưu địa chỉ Backend API! Trang web sẽ sử dụng endpoint này để gửi yêu cầu.');
    window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="pb-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white tracking-tight">Cấu Hình Kết Nối Backend</h1>
        <p className="text-xs text-gray-400 mt-1">
          Vì giao diện Frontend chạy tĩnh 100% trên GitHub Pages, bạn có thể trỏ giao diện này về bất kỳ máy chủ Oracle Cloud hoặc Home Server nào của bạn.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300">Địa chỉ Backend API (HTTPS hoặc HTTP)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.yourdomain.duckdns.org hoặc http://ip:3001"
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
          <p className="text-[10px] text-gray-500">
            Mẹo: Nếu bạn triển khai Caddy làm Reverse Proxy SSL Let's Encrypt ở máy chủ, hãy điền địa chỉ https:// của tên miền.
          </p>
        </div>

        {result && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
              result.success
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
            }`}
          >
            {result.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{result.message}</span>
          </div>
        )}

        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-950"
        >
          <Save className="w-4 h-4" />
          <span>Lưu Cấu Hình Kết Nối</span>
        </button>
      </div>
    </div>
  );
};
