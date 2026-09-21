import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Avatar from '../components/common/Avatar';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import {
  Users,
  UserPlus,
  UserCheck,
  Check,
  X,
  Search,
  MessageSquare,
  UserMinus
} from 'lucide-react';

export default function FriendsPage() {
  const navigate = useNavigate();
  const { isUserOnline } = useSocket();

  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'directory'
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
    try {
      const res = await api.get('/users/friends');
      if (res.data.success) setFriends(res.data.data);
    } catch (err) {
      console.error('Fetch friends error:', err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await api.get('/users/friend-requests');
      if (res.data.success) setRequests(res.data.data);
    } catch (err) {
      console.error('Fetch requests error:', err);
    }
  };

  const searchDirectory = async (q) => {
    try {
      const res = await api.get(`/users/search?query=${encodeURIComponent(q || '')}`);
      if (res.data.success) setDirectory(res.data.data);
    } catch (err) {
      console.error('Directory search error:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchFriends(), fetchRequests(), searchDirectory('')]);
      setLoading(false);
    };
    loadAll();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchDirectory(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await api.patch(`/users/friend-requests/${requestId}`, { action: 'accept' });
      if (res.data.success) {
        toast.success('Friend request accepted!');
        fetchFriends();
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (err) {
      toast.error('Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      const res = await api.patch(`/users/friend-requests/${requestId}`, { action: 'reject' });
      if (res.data.success) {
        toast.success('Friend request declined');
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (err) {
      toast.error('Failed to decline request');
    }
  };

  const handleUnfriend = async (friendshipId, name) => {
    if (!window.confirm(`Unfriend ${name}?`)) return;
    try {
      const res = await api.delete(`/users/friends/${friendshipId}`);
      if (res.data.success) {
        toast.success('Friend removed');
        setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId));
      }
    } catch (err) {
      toast.error('Failed to remove friend');
    }
  };

  const handleSendRequest = async (targetUserId) => {
    try {
      const res = await api.post('/users/friend-request', { receiverId: targetUserId });
      if (res.data.success) {
        toast.success('Friend request sent!');
        setDirectory(prev =>
          prev.map(u => (u.id === targetUserId ? { ...u, friendshipStatus: 'pending_sent' } : u))
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send friend request');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6 items-start">
          <Sidebar />

          <section className="flex-1 min-w-0">
            {/* Header Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    activeTab === 'friends'
                      ? 'bg-campus-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>My Friends ({friends.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('requests')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${
                    activeTab === 'requests'
                      ? 'bg-campus-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Friend Requests</span>
                  {requests.length > 0 && (
                    <span className="w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                      {requests.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('directory')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    activeTab === 'directory'
                      ? 'bg-campus-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Campus Directory</span>
                </button>
              </div>

              {activeTab === 'directory' && (
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    placeholder="Search by name, roll no..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              )}
            </div>

            {/* TAB: My Friends */}
            {activeTab === 'friends' && (
              <div>
                {friends.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {friends.map((f) => (
                      <div
                        key={f.friendshipId}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar
                            src={f.profilePhoto}
                            name={f.fullName}
                            size="lg"
                            isOnline={isUserOnline(f.id)}
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/profile/${f.id}`}
                              className="font-bold text-sm text-slate-800 hover:text-campus-600 truncate block"
                            >
                              {f.fullName}
                            </Link>
                            <p className="text-xs text-campus-600 font-semibold">{f.rollNumber}</p>
                            <p className="text-[11px] text-slate-400 truncate">{f.branch}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                          <Link
                            to={`/chat?user=${f.id}`}
                            className="flex-1 py-1.5 bg-campus-50 hover:bg-campus-100 text-campus-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Message
                          </Link>
                          <button
                            onClick={() => handleUnfriend(f.friendshipId, f.fullName)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                            title="Unfriend"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800">No Friends Connected Yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                      Browse the campus directory to connect with your classmates and peers.
                    </p>
                    <button
                      onClick={() => setActiveTab('directory')}
                      className="px-4 py-2 bg-campus-600 text-white text-xs font-bold rounded-xl"
                    >
                      Browse Campus Directory
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Friend Requests */}
            {activeTab === 'requests' && (
              <div>
                {requests.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {requests.map((r) => (
                      <div
                        key={r.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar src={r.requester?.profilePhoto} name={r.requester?.fullName} size="md" />
                          <div className="min-w-0">
                            <Link
                              to={`/profile/${r.requester?.id}`}
                              className="font-bold text-xs text-slate-800 hover:text-campus-600 truncate block"
                            >
                              {r.requester?.fullName}
                            </Link>
                            <p className="text-[11px] text-slate-500">
                              {r.requester?.rollNumber} • {r.requester?.branch}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleAcceptRequest(r.id)}
                            className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(r.id)}
                            className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                          >
                            <X className="w-3.5 h-3.5" /> Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
                    <UserPlus className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800">No Pending Requests</h3>
                    <p className="text-xs text-slate-500 mt-1">You're all caught up with friend requests.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Campus Directory */}
            {activeTab === 'directory' && (
              <div>
                {directory.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {directory.map((student) => (
                      <div
                        key={student.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar
                            src={student.profilePhoto}
                            name={student.fullName}
                            size="md"
                            isOnline={isUserOnline(student.id)}
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/profile/${student.id}`}
                              className="font-bold text-xs text-slate-800 hover:text-campus-600 truncate block"
                            >
                              {student.fullName}
                            </Link>
                            <p className="text-[11px] text-campus-600 font-semibold">{student.rollNumber}</p>
                            <p className="text-[11px] text-slate-400 truncate">{student.branch}</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          {student.friendshipStatus === 'friends' && (
                            <span className="w-full py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Friends
                            </span>
                          )}

                          {student.friendshipStatus === 'pending_sent' && (
                            <span className="w-full py-1.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold flex items-center justify-center">
                              Request Sent
                            </span>
                          )}

                          {student.friendshipStatus === 'pending_received' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAcceptRequest(student.friendshipId || student.id)}
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleDeclineRequest(student.friendshipId || student.id)}
                                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition"
                              >
                                Decline
                              </button>
                            </div>
                          )}

                          {student.friendshipStatus === 'none' && (
                            <button
                              onClick={() => handleSendRequest(student.id)}
                              className="w-full py-1.5 bg-campus-600 hover:bg-campus-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition"
                            >
                              <UserPlus className="w-3.5 h-3.5" /> Add Friend
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-400">
                    No students found matching your criteria.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
