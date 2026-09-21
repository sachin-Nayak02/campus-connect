import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import PostCard from '../components/post/PostCard';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getMediaUrl } from '../utils/media';
import toast from 'react-hot-toast';
import {
  UserPlus,
  UserCheck,
  Clock,
  MessageSquare,
  Edit3,
  Mail,
  Phone,
  BookOpen,
  Calendar
} from 'lucide-react';

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();

  const profileId = id || currentUser?.id;
  const isSelf = currentUser?.id === profileId;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'about'

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [profileFile, setProfileFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/users/${profileId}`);
      if (res.data.success) {
        setProfile(res.data.data);
        if (isSelf) {
          setFullName(res.data.data.fullName || '');
          setBio(res.data.data.bio || '');
          setPhone(res.data.data.phone || '');
          setBranch(res.data.data.branch || '');
          setYear(res.data.data.year || '');
        }
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      toast.error('Student profile not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [profileId]);

  const handleSendFriendRequest = async () => {
    try {
      const res = await api.post('/users/friend-request', { receiverId: profileId });
      if (res.data.success) {
        toast.success('Friend request sent!');
        setProfile(prev => ({ ...prev, friendshipStatus: 'pending_sent' }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async () => {
    try {
      const res = await api.patch(`/users/friend-requests/${profile.friendshipId}`, { action: 'accept' });
      if (res.data.success) {
        toast.success('Friend request accepted!');
        setProfile(prev => ({
          ...prev,
          friendshipStatus: 'friends',
          friendsCount: (prev.friendsCount || 0) + 1
        }));
      }
    } catch (err) {
      toast.error('Failed to accept request');
    }
  };

  const handleUnfriend = async () => {
    if (!window.confirm(`Remove ${profile.fullName} from friends?`)) return;
    try {
      const res = await api.delete(`/users/friends/${profile.friendshipId}`);
      if (res.data.success) {
        toast.success('Friend removed');
        setProfile(prev => ({
          ...prev,
          friendshipStatus: 'none',
          friendsCount: Math.max(0, (prev.friendsCount || 1) - 1)
        }));
      }
    } catch (err) {
      toast.error('Failed to remove friend');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const formData = new FormData();
      if (fullName.trim()) formData.append('fullName', fullName.trim());
      formData.append('bio', bio);
      formData.append('phone', phone);
      formData.append('branch', branch);
      formData.append('year', year);

      if (profileFile) formData.append('profilePhoto', profileFile);
      if (coverFile) formData.append('coverPhoto', coverFile);

      const res = await api.patch('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success('Profile updated!');
        updateUser(res.data.data);
        setProfile(prev => ({ ...prev, ...res.data.data }));
        setEditModalOpen(false);
      }
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
          <div className="h-48 bg-slate-200 rounded-3xl" />
          <div className="h-32 bg-white rounded-3xl p-6" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <h2 className="text-lg font-bold text-slate-800">Profile Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">The student profile does not exist or has been removed.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-campus-600 text-white text-xs font-bold rounded-xl"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  const coverUrl = getMediaUrl(profile.coverPhoto);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Profile Card & Header */}
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
          {/* Cover Photo */}
          <div className="h-44 sm:h-56 bg-gradient-to-r from-campus-800 via-campus-600 to-indigo-700 relative">
            {coverUrl && (
              <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Profile Details Bar */}
          <div className="px-6 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-4">
              <div className="flex items-end gap-4">
                <Avatar
                  src={profile.profilePhoto}
                  name={profile.fullName}
                  size="xl"
                  className="ring-4 ring-white shadow-lg"
                />
                <div className="mb-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">{profile.fullName}</h1>
                  <p className="text-xs font-bold text-campus-600 tracking-wide">
                    {profile.rollNumber} • {profile.branch} • {profile.year}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {isSelf ? (
                  <button
                    onClick={() => setEditModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Profile
                  </button>
                ) : (
                  <>
                    {profile.friendshipStatus === 'none' && (
                      <button
                        onClick={handleSendFriendRequest}
                        className="flex items-center gap-1.5 px-4 py-2 bg-campus-600 hover:bg-campus-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add Friend
                      </button>
                    )}

                    {profile.friendshipStatus === 'pending_sent' && (
                      <button
                        disabled
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Request Sent
                      </button>
                    )}

                    {profile.friendshipStatus === 'pending_received' && (
                      <button
                        onClick={handleAcceptRequest}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Accept Request
                      </button>
                    )}

                    {profile.friendshipStatus === 'friends' && (
                      <>
                        <button
                          onClick={() => navigate(`/chat?user=${profile.id}`)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-campus-600 hover:bg-campus-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Message
                        </button>
                        <button
                          onClick={handleUnfriend}
                          className="px-3 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-semibold text-xs rounded-xl transition"
                        >
                          Unfriend
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed mt-2">
                {profile.bio}
              </p>
            )}

            {/* Stats count */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <div>
                <span className="font-extrabold text-slate-800 text-sm">{profile.posts?.length || 0}</span>{' '}
                Posts
              </div>
              <div>
                <span className="font-extrabold text-slate-800 text-sm">{profile.friendsCount || 0}</span>{' '}
                Friends
              </div>
              <div>
                <span className="font-extrabold text-slate-800 text-sm">{profile.gender || 'Student'}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-t border-slate-100 px-6">
            <button
              onClick={() => setActiveTab('posts')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                activeTab === 'posts'
                  ? 'border-campus-600 text-campus-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Posts ({profile.posts?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                activeTab === 'about'
                  ? 'border-campus-600 text-campus-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              About & Credentials
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' ? (
          <div className="space-y-4">
            {profile.posts && profile.posts.length > 0 ? (
              profile.posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={() => {
                    setProfile(prev => ({
                      ...prev,
                      posts: prev.posts.filter(p => p.id !== post.id)
                    }));
                  }}
                />
              ))
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-xs text-slate-400">
                No posts published yet.
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Academic & Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-campus-600" />
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Branch & Department</p>
                  <p className="font-bold text-slate-800">{profile.branch}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                <Calendar className="w-4 h-4 text-campus-600" />
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Current Academic Year</p>
                  <p className="font-bold text-slate-800">{profile.year}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                <Mail className="w-4 h-4 text-campus-600" />
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">College Email</p>
                  <p className="font-bold text-slate-800">{profile.email}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                <Phone className="w-4 h-4 text-campus-600" />
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Phone Number</p>
                  <p className="font-bold text-slate-800">{profile.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Student Profile"
        >
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aryan Sharma"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">About Me (Bio)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Share your interests, club activities, passions..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Update Avatar</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfileFile(e.target.files[0])}
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Update Cover</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files[0])}
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-5 py-2 text-xs font-bold text-white bg-campus-600 hover:bg-campus-700 rounded-xl disabled:opacity-50"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
