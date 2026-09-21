import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from './Avatar';
import {
  Home,
  Users,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar() {
  const { user, isAdmin } = useAuth();

  return (
    <aside className="w-64 shrink-0 hidden lg:block space-y-4">
      {/* Profile Mini Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center gap-3.5 mb-3">
          <Avatar src={user?.profilePhoto} name={user?.fullName} size="lg" />
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-sm truncate">{user?.fullName}</h3>
            <p className="text-xs font-medium text-campus-600 truncate">{user?.rollNumber}</p>
            <p className="text-[11px] text-slate-600 truncate">{user?.branch}</p>
          </div>
        </div>

        <Link
          to={user?.id ? `/profile/${user.id}` : '/profile'}
          className="block w-full text-center py-2 text-xs font-semibold text-campus-700 bg-campus-50 hover:bg-campus-100 rounded-xl transition"
        >
          View Full Profile
        </Link>
      </div>

      {/* Campus Quick Links */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs space-y-1">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <Home className="w-4 h-4 text-campus-600" />
          <span>Campus Feed</span>
        </Link>

        <Link
          to="/friends"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Students & Friends</span>
        </Link>

        <Link
          to="/chat"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span>Real-time Chat</span>
        </Link>

        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-purple-700 hover:bg-purple-50 transition"
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Admin Management</span>
          </Link>
        )}
      </div>

      {/* Campus Notice / Badge */}
      <div className="bg-gradient-to-br from-campus-900 via-campus-800 to-indigo-950 rounded-2xl p-4 text-white shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Verified Network
          </span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">
          Access restricted exclusively to registered roll numbers of this institution.
        </p>
      </div>
    </aside>
  );
}
