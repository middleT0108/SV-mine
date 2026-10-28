import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Server, PlusCircle, Settings, LogOut, ShieldCheck, Terminal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-900/30 group-hover:scale-105 transition-transform">
                <Server className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-gray-200 to-emerald-400 bg-clip-text text-transparent">
                  SV-mine
                </span>
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  0đ Miễn Phí
                </span>
              </div>
            </Link>
          </div>

          {user ? (
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                to="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition"
              >
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Máy Chủ Của Tôi</span>
              </Link>
              <Link
                to="/create"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tạo Server</span>
              </Link>
              <Link
                to="/settings"
                title="Cấu hình API Endpoint"
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <div className="h-4 w-px bg-gray-800" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-xs text-emerald-400">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="p-2 text-gray-400 hover:text-rose-400 hover:bg-gray-800 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-gray-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"
              >
                Đăng Nhập
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-500 transition shadow-md shadow-emerald-950"
              >
                Đăng Ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
