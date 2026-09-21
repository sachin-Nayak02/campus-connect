import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Sparkles, KeyRound, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      if (res.data.success) {
        if (res.data.data?.devOtp) {
          toast.success(`OTP: ${res.data.data.devOtp} (Dev mode)`, { duration: 6000 });
          setOtp(res.data.data.devOtp);
        } else {
          toast.success('6-digit OTP sent to your college email!');
        }
        setStep(2);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim() || !newPassword) {
      toast.error('Please provide the OTP and your new password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword
      });

      if (res.data.success) {
        toast.success('Password successfully reset! You can now log in.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-campus-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/login" className="inline-flex items-center gap-2 mb-2 text-white">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-campus-600 to-indigo-500 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black">CampusConnect</span>
          </Link>
          <p className="text-xs text-slate-400">Account Recovery Portal</p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-7 shadow-2xl border border-white/20">
          {step === 1 ? (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <KeyRound className="w-5 h-5 text-campus-600" />
                <h2 className="text-lg font-bold text-slate-800">Forgot Password</h2>
              </div>
              <p className="text-xs text-slate-500 mb-6">
                Enter your registered college email to receive a 6-digit verification OTP.
              </p>

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    College Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200 transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-campus-600 hover:bg-campus-700 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Sending OTP...' : 'Send 6-Digit OTP'}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500">
                <Link to="/login" className="font-semibold text-slate-600 hover:text-slate-800 flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-800">Enter OTP & New Password</h2>
              </div>
              <p className="text-xs text-slate-500 mb-6">
                An OTP was sent to <span className="font-semibold text-slate-700">{email}</span>.
              </p>

              {otp && (
                <div className="mb-4 p-2.5 bg-campus-50 border border-campus-200 rounded-xl text-xs text-campus-800 flex items-center justify-between">
                  <span>OTP auto-filled for testing: <strong>{otp}</strong></span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    6-Digit OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base tracking-widest text-center font-mono font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200 transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-campus-600 hover:bg-campus-700 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Change Email or Resend OTP
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
