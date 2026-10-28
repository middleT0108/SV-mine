import React, { useState } from 'react';
import { Sparkles, Copy, Check, X, Wifi, ShieldCheck, Gamepad2, ArrowRight } from 'lucide-react';
import { GeneratedServerResult } from '../api/falix';

interface GenerateIpModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverData: GeneratedServerResult | null;
  loading: boolean;
  onRegenerate: () => void;
}

export const GenerateIpModal: React.FC<GenerateIpModalProps> = ({
  isOpen,
  onClose,
  serverData,
  loading,
  onRegenerate
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!serverData) return;
    navigator.clipboard.writeText(serverData.fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-gray-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/50 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-400 shadow-xl shadow-emerald-900/40 mb-1">
            <Sparkles className="w-7 h-7 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Máy Chủ Minecraft Đã Sẵn Sàng!
          </h2>
          <p className="text-xs text-gray-400">
            Hệ thống Cloud 0đ đã cấp phát IP riêng biệt hoạt động 24/7 cho bạn
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-300 font-mono animate-pulse">
              Đang kết nối Cloud Node & cấp phát IP 24/7...
            </p>
          </div>
        ) : serverData ? (
          <div className="space-y-5">
            {/* IP Display Box */}
            <div className="bg-gray-950 border-2 border-emerald-500/60 rounded-2xl p-4 sm:p-5 text-center space-y-3 shadow-inner">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                ĐỊA CHỈ IP MÁY CHỦ (SERVER ADDRESS)
              </span>

              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-lg sm:text-xl font-extrabold text-emerald-400 tracking-wide select-all">
                  {serverData.fullAddress}
                </span>
              </div>

              {/* Huge Copy Button */}
              <button
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all shadow-lg ${
                  copied
                    ? 'bg-emerald-500 text-gray-950 shadow-emerald-500/30 scale-[1.02]'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                }`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                <span>{copied ? 'ĐÃ SAO CHÉP IP THÀNH CÔNG!' : 'CLICK ĐỂ SAO CHÉP IP'}</span>
              </button>
            </div>

            {/* Server Stats Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <div className="text-gray-400 text-[10px]">Trạng Thái</div>
                  <div className="font-bold text-emerald-400">Online 24/7</div>
                </div>
              </div>

              <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex items-center gap-2.5">
                <Wifi className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="text-gray-400 text-[10px]">Độ Trễ (Ping)</div>
                  <div className="font-bold text-sky-400 font-mono">~28 ms</div>
                </div>
              </div>

              <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex items-center gap-2.5">
                <Gamepad2 className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-gray-400 text-[10px]">Phiên Bản</div>
                  <div className="font-bold text-gray-200">Java & Bedrock 1.21.x</div>
                </div>
              </div>

              <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-gray-400 text-[10px]">Chi Phí</div>
                  <div className="font-bold text-amber-400">0đ (Không Cần Thẻ)</div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-950/40 border border-gray-800/80 rounded-xl p-3.5 text-xs text-gray-300 space-y-1.5">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Cách vào chơi ngay:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-gray-400 text-[11px] pl-1">
                <li>Mở game <strong>Minecraft (Bản quyền hoặc TLauncher/Crack)</strong>.</li>
                <li>Chọn <strong>Multiplayer</strong> &rarr; <strong>Add Server</strong>.</li>
                <li>Dán IP vừa sao chép vào ô <strong>Server Address</strong> rồi bấm <strong>Done</strong>.</li>
                <li>Bấm <strong>Join Server</strong> và thưởng thức cùng bạn bè!</li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onRegenerate}
                className="flex-1 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold rounded-xl transition"
              >
                Đổi IP Khác
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-950"
              >
                Xong & Đóng
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
