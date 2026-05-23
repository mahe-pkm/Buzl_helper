import React, { useState } from 'react';
import { Shield, Server, Wifi, WifiOff, X, KeyRound, Globe, User, LogOut, Check, Eye, EyeOff } from 'lucide-react';
import { useCsvStore } from '../store/useCsvStore';
import { fetchWithAuth } from '../utils/api';
import { toast } from 'sonner';

interface SettingsPanelProps {
  onClose: () => void;
  onRefreshTasks?: () => Promise<void>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onRefreshTasks }) => {
  const {
    connectionMode,
    setConnectionMode,
    serverEnvironment,
    setServerEnvironment,
    vercelUrl,
    setVercelUrl,
    hostingerUrl,
    setHostingerUrl,
    customUrl,
    setCustomUrl,
    dashboardVercelUrl,
    setDashboardVercelUrl,
    dashboardHostingerUrl,
    setDashboardHostingerUrl,
    dashboardCustomUrl,
    setDashboardCustomUrl,
    token,
    username,
    setCredentials,
    setProducts,
  } = useCsvStore();

  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUsername) return;
    if (!inputPassword) {
      toast.error('Password is required', {
        description: 'Members must login with both username and password created by admin.',
      });
      return;
    }

    setLoggingIn(true);
    try {
      const data = await fetchWithAuth('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: inputUsername, password: inputPassword || '' }),
      });

      setCredentials(data.user.username, data.token, data.user.id);
      toast.success(`Logged in as ${data.user.username}`, {
        description: 'Fetching your live assigned and available tasks now.',
      });
      
      // Pull tasks immediately upon login
      if (onRefreshTasks) {
        await onRefreshTasks();
      } else {
        const fetched = await fetchWithAuth('/products');
        setProducts(fetched);
      }
    } catch (err: any) {
      toast.error('Login failed', {
        description: err.message || 'Verify the API URL, username, and password in settings.',
      });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCredentials(null, null, null);
    setProducts([]);
    toast.success('Logged out', {
      description: 'Server tasks were cleared from this extension session.',
    });
  };

  return (
    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex flex-col justify-end transition-all">
      <div className="bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[90%] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-gray-900" />
            <h2 className="font-bold text-gray-900 text-base">Ecosystem Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Connection Toggle */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connectionMode === 'server' ? (
                <div className="p-2 rounded-lg bg-green-100 text-green-700"><Wifi size={18} /></div>
              ) : (
                <div className="p-2 rounded-lg bg-gray-200 text-gray-500"><WifiOff size={18} /></div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">Connection Mode</span>
                <span className="text-[10px] text-gray-400">
                  {connectionMode === 'server' ? 'Syncing tasks with cloud server' : 'Parsing local CSV files only'}
                </span>
              </div>
            </div>
            <select
              value={connectionMode}
              onChange={(e) => {
                setConnectionMode(e.target.value as 'local' | 'server');
                if (e.target.value === 'local') {
                  handleLogout();
                }
              }}
              className="text-xs font-semibold bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="local">Local CSV Mode</option>
              <option value="server">Server Sync Mode</option>
            </select>
          </div>

          {connectionMode === 'server' && (
            <>
              {/* Server Environment */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Select Server Environment</label>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                  {(['production', 'development', 'custom'] as const).map((env) => (
                    <button
                      key={env}
                      onClick={() => setServerEnvironment(env)}
                      className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all text-center capitalize ${
                        serverEnvironment === env
                          ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {env === 'production' ? 'Hostinger' : env === 'development' ? 'Vercel' : 'Localhost'}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setServerEnvironment('custom');
                      setCustomUrl('http://127.0.0.1:3000/api');
                      setDashboardCustomUrl('http://127.0.0.1:5174');
                      toast.success('Switched to localhost endpoints');
                    }}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Use Localhost
                  </button>
                </div>
              </div>

              {/* Endpoint URLs */}
              <div className="flex flex-col gap-3.5 bg-gray-50/50 border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  <Globe size={13} /> Edit Host URLs
                </div>

                {serverEnvironment === 'development' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-gray-400">Vercel (Development Mode) API URL</span>
                      <input
                        type="text"
                        value={vercelUrl}
                        onChange={(e) => setVercelUrl(e.target.value)}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-gray-400">Vercel Dashboard URL</span>
                      <input
                        type="text"
                        value={dashboardVercelUrl}
                        onChange={(e) => setDashboardVercelUrl(e.target.value)}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      />
                    </div>
                  </div>
                )}

                {serverEnvironment === 'production' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-gray-400">Hostinger (Production Mode) API URL</span>
                      <input
                        type="text"
                        value={hostingerUrl}
                        onChange={(e) => setHostingerUrl(e.target.value)}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-gray-400">Hostinger Dashboard URL</span>
                      <input
                        type="text"
                        value={dashboardHostingerUrl}
                        onChange={(e) => setDashboardHostingerUrl(e.target.value)}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      />
                    </div>
                  </div>
                )}

                {serverEnvironment === 'custom' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-gray-400">Custom / Localhost API URL</span>
                      <input
                        type="text"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-gray-400">Custom / Localhost Dashboard URL</span>
                      <input
                        type="text"
                        value={dashboardCustomUrl}
                        onChange={(e) => setDashboardCustomUrl(e.target.value)}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Auth Credentials */}
              <div className="border-t border-gray-100 pt-5">
                {token && username ? (
                  <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 text-green-700"><User size={18} /></div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Logged In As</span>
                        <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                          {username} <span className="bg-green-100 text-green-700 text-[8px] px-1 py-0.5 rounded uppercase font-bold flex items-center gap-0.5"><Check size={8} /> Active</span>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Logout"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleLogin} className="flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      <Shield size={13} /> Connection Settings
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 mb-1 block">Your Name / Username</span>
                      <input
                        type="text"
                        placeholder="e.g. Rahul"
                        value={inputUsername}
                        onChange={(e) => setInputUsername(e.target.value)}
                        required
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 mb-1 block">Password</span>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="********"
                          value={inputPassword}
                          onChange={(e) => setInputPassword(e.target.value)}
                          required
                          className="w-full text-xs p-2.5 pr-9 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 px-2 text-gray-400 hover:text-gray-600"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loggingIn}
                      className="w-full mt-2 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <KeyRound size={13} />
                      {loggingIn ? 'Connecting...' : 'Login'}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

