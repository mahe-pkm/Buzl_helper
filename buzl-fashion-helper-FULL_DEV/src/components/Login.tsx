import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useCsvStore } from '../store/useCsvStore';
import { fetchWithAuth } from '../utils/api';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useCsvStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('Username and password are required');
      return;
    }
    setLoading(true);
    try {
      const data = await fetchWithAuth('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem('buzl_token', data.token);
      setAuth(data.user);
      toast.success(`Welcome ${data.user.username}`);
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center items-center p-4 sm:p-8 bg-gray-50">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-center mb-6 text-gray-800">Login to Buzl</h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="w-full p-2 pr-9 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-2 text-gray-400 hover:text-gray-600"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 bg-gray-900 text-white font-medium p-2.5 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
