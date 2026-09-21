import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Sparkles, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error('Please enter your roll number/email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(identifier.trim(), password);
      if (res.success) {
        toast.success(`Welcome back, ${res.user.fullName}!`);
        if (res.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        toast.error(res.message || 'Invalid credentials');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (type) => {
    if (type === 'admin') {
      setIdentifier('admin@campusconnect.edu');
      setPassword('Admin@12345');
    } else {
      setIdentifier('21CS001');
      setPassword('Student@123');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-campus-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-campus-600 to-indigo-500 text-white shadow-xl shadow-campus-500/30 mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Campus<span className="text-campus-400">Connect</span>
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-1">
            The exclusive verified social network for our college
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-7 shadow-2xl border border-white/20">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Student & Staff Portal</h2>
          <p className="text-xs text-slate-500 mb-6">
            Sign in with your roll number or college email address.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Roll Number or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 21CS001 or student@college.edu"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-campus-500 focus:ring-3 focus:ring-campus-100 transition"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-campus-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-campus-500 focus:ring-3 focus:ring-campus-100 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-campus-600 to-indigo-600 hover:from-campus-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-campus-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              Quick Test Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('student')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <UserCheck className="w-3.5 h-3.5 text-campus-600" />
                <span>Demo Student</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Demo Admin</span>
              </button>
            </div>
          </div>

          {/* Whitelist Onboarding Prompt */}
          <div className="mt-6 text-center text-xs text-slate-600">
            Got an approved roll number?{' '}
            <Link to="/signup" className="font-bold text-campus-600 hover:underline">
              Register Student Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
