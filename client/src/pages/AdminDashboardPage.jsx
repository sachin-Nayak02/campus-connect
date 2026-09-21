import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Modal from '../components/common/Modal';
import Avatar from '../components/common/Avatar';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Users,
  AlertTriangle,
  Plus,
  UploadCloud,
  Search,
  Trash2,
  Ban,
  RefreshCw
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('whitelist'); // 'whitelist' | 'students' | 'reports'

  // Whitelist tab state
  const [whitelist, setWhitelist] = useState([]);
  const [whitelistSearch, setWhitelistSearch] = useState('');
  const [whitelistStatusFilter, setWhitelistStatusFilter] = useState('all');
  const [addSingleModalOpen, setAddSingleModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [singleRoll, setSingleRoll] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleBranch, setSingleBranch] = useState('');
  const [singleYear, setSingleYear] = useState('');
  const [bulkText, setBulkText] = useState('');

  // Student management tab state
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentBranchFilter, setStudentBranchFilter] = useState('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');

  // Reports tab state
  const [reports, setReports] = useState([]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data.success) setStats(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWhitelist = async () => {
    try {
      const query = new URLSearchParams();
      if (whitelistSearch) query.append('search', whitelistSearch);
      if (whitelistStatusFilter !== 'all') query.append('status', whitelistStatusFilter);
      const res = await api.get(`/admin/whitelist?${query.toString()}`);
      if (res.data.success) setWhitelist(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const query = new URLSearchParams();
      if (studentSearch) query.append('search', studentSearch);
      if (studentBranchFilter !== 'all') query.append('branch', studentBranchFilter);
      if (studentStatusFilter !== 'all') query.append('status', studentStatusFilter);
      const res = await api.get(`/admin/users?${query.toString()}`);
      if (res.data.success) setStudents(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await api.get('/admin/reports');
      if (res.data.success) setReports(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchReports();
  }, []);

  // Debounced search for whitelist
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWhitelist();
    }, 300);
    return () => clearTimeout(timer);
  }, [whitelistSearch, whitelistStatusFilter]);

  // Debounced search for students
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch, studentBranchFilter, studentStatusFilter]);

  // Handlers for Whitelist
  const handleAddSingleRoll = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/whitelist', {
        rollNumber: singleRoll,
        fullName: singleName,
        branch: singleBranch,
        year: singleYear
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setAddSingleModalOpen(false);
        setSingleRoll('');
        setSingleName('');
        setSingleBranch('');
        setSingleYear('');
        fetchWhitelist();
        fetchStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add roll number');
    }
  };

  const handleBulkAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/whitelist/bulk', {
        rollNumbersText: bulkText
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setBulkModalOpen(false);
        setBulkText('');
        fetchWhitelist();
        fetchStats();
      }
    } catch (err) {
      toast.error('Failed to import roll numbers');
    }
  };

  const handleRemoveRoll = async (id, roll) => {
    if (!window.confirm(`Remove ${roll} from whitelist?`)) return;
    try {
      const res = await api.delete(`/admin/whitelist/${id}`);
      if (res.data.success) {
        toast.success('Roll number removed');
        fetchWhitelist();
        fetchStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    }
  };

  // Handlers for Students
  const handleToggleStudentStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await api.patch(`/admin/users/${id}/status`, { status: nextStatus });
      if (res.data.success) {
        toast.success(`Student status updated to ${nextStatus}`);
        fetchStudents();
        fetchStats();
      }
    } catch (err) {
      toast.error('Failed to update student status');
    }
  };

  const handleDeleteStudent = async (id, roll) => {
    if (!window.confirm(`CRITICAL: Are you sure you want to completely delete student ${roll}? This will cascade and delete their profile, posts, and chats!`)) return;
    try {
      const res = await api.delete(`/admin/users/${id}`);
      if (res.data.success) {
        toast.success(`Student ${roll} deleted`);
        fetchStudents();
        fetchStats();
      }
    } catch (err) {
      toast.error('Failed to delete student');
    }
  };

  // Handlers for Reports
  const handleResolveReport = async (id, action) => {
    try {
      const res = await api.patch(`/admin/reports/${id}`, { action });
      if (res.data.success) {
        toast.success(res.data.message);
        fetchReports();
        fetchStats();
      }
    } catch (err) {
      toast.error('Failed to resolve report');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-purple-600" />
              <h1 className="text-xl font-black text-slate-900">Campus Administration Center</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Control roll-number whitelisting, manage enrolled student accounts, and moderate campus posts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchStats();
                fetchWhitelist();
                fetchStudents();
                fetchReports();
              }}
              className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Students</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats?.totalStudents || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-emerald-500">Active</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats?.activeStudents || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-rose-500">Suspended</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{stats?.suspendedStudents || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-campus-600">Total Posts</p>
            <p className="text-2xl font-black text-campus-700 mt-1">{stats?.totalPosts || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-indigo-500">Whitelisted</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{stats?.totalWhitelisted || 0}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{stats?.availableWhitelisted || 0} unused</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-amber-500">Flagged Reports</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{stats?.pendingReports || 0}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('whitelist')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'whitelist'
                ? 'border-campus-600 text-campus-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Roll Number Whitelist</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'students'
                ? 'border-campus-600 text-campus-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Enrolled Students</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 relative ${
              activeTab === 'reports'
                ? 'border-campus-600 text-campus-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Moderation Queue</span>
            {stats?.pendingReports > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                {stats.pendingReports}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: Whitelist Manager */}
        {activeTab === 'whitelist' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={whitelistSearch}
                    onChange={(e) => setWhitelistSearch(e.target.value)}
                    placeholder="Search roll numbers..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <select
                  value={whitelistStatusFilter}
                  onChange={(e) => setWhitelistStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="all">All Status</option>
                  <option value="unused">Available (Unused)</option>
                  <option value="used">Registered (Used)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAddSingleModalOpen(true)}
                  className="px-3 py-1.5 bg-campus-600 hover:bg-campus-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Single
                </button>
                <button
                  onClick={() => setBulkModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> Bulk Import / CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-y border-slate-100">
                  <tr>
                    <th className="py-2.5 px-4">Roll Number</th>
                    <th className="py-2.5 px-4">Pre-assigned Name</th>
                    <th className="py-2.5 px-4">Department / Year</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Whitelisted On</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {whitelist.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.rollNumber}</td>
                      <td className="py-3 px-4">{item.fullName || '—'}</td>
                      <td className="py-3 px-4">{item.branch ? `${item.branch} (${item.year || ''})` : '—'}</td>
                      <td className="py-3 px-4">
                        {item.isUsed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Registered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-campus-50 text-campus-700 border border-campus-200">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!item.isUsed ? (
                          <button
                            onClick={() => handleRemoveRoll(item.id, item.rollNumber)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Remove from whitelist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">In use</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Enrolled Students */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <select
                value={studentStatusFilter}
                onChange={(e) => setStudentStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="all">All Accounts</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-y border-slate-100">
                  <tr>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Roll Number</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4">Branch & Year</th>
                    <th className="py-2.5 px-4">Posts</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={student.profilePhoto} name={student.fullName} size="sm" />
                          <span className="font-bold text-slate-900">{student.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-campus-600">{student.rollNumber}</td>
                      <td className="py-3 px-4 text-slate-500">{student.email}</td>
                      <td className="py-3 px-4">{student.branch} ({student.year})</td>
                      <td className="py-3 px-4 font-bold">{student.postsCount}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            student.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleStudentStatus(student.id, student.status)}
                          className={`p-1.5 rounded-lg text-xs font-semibold ${
                            student.status === 'active'
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={student.status === 'active' ? 'Suspend student' : 'Reactivate'}
                        >
                          <Ban className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id, student.rollNumber)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Delete student and data"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Moderation Queue */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Flagged Campus Posts</h3>
            {reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div key={rep.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-600">
                        Reason: {rep.reason}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Reported by {rep.reporter?.fullName} ({rep.reporter?.rollNumber})
                      </span>
                    </div>

                    {rep.post ? (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
                        <p className="font-semibold text-slate-900 mb-1">
                          Author: {rep.post.author?.fullName} ({rep.post.author?.rollNumber})
                        </p>
                        <p className="whitespace-pre-line">{rep.post.content}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Post has already been deleted.</p>
                    )}

                    {rep.status === 'pending' && (
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => handleResolveReport(rep.id, 'dismiss')}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl"
                        >
                          Dismiss Report
                        </button>
                        {rep.post && (
                          <button
                            onClick={() => handleResolveReport(rep.id, 'delete_post')}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
                          >
                            Delete Post
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-8 text-center">
                Moderation queue is clean. No pending reports!
              </p>
            )}
          </div>
        )}

        {/* Modal: Add Single Roll Number */}
        <Modal
          isOpen={addSingleModalOpen}
          onClose={() => setAddSingleModalOpen(false)}
          title="Whitelist Student Roll Number"
        >
          <form onSubmit={handleAddSingleRoll} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Roll Number</label>
              <input
                type="text"
                value={singleRoll}
                onChange={(e) => setSingleRoll(e.target.value.toUpperCase())}
                placeholder="e.g. 21CS099"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Student Name (Optional)</label>
              <input
                type="text"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                placeholder="Pre-registered student name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch (Optional)</label>
                <input
                  type="text"
                  value={singleBranch}
                  onChange={(e) => setSingleBranch(e.target.value)}
                  placeholder="Computer Science"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Year (Optional)</label>
                <input
                  type="text"
                  value={singleYear}
                  onChange={(e) => setSingleYear(e.target.value)}
                  placeholder="3rd Year"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddSingleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-campus-600 hover:bg-campus-700 rounded-xl shadow-xs"
              >
                Whitelist Roll Number
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Bulk Roll Import */}
        <Modal
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          title="Bulk Roll Numbers Import"
        >
          <form onSubmit={handleBulkAdd} className="space-y-4">
            <p className="text-xs text-slate-500">
              Paste roll numbers separated by commas, tabs, or newlines (or paste raw CSV column).
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={6}
              placeholder="21CS101&#10;21CS102&#10;21CS103, 21EC055"
              className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white resize-none"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-campus-600 hover:bg-campus-700 rounded-xl shadow-xs"
              >
                Import Roll Numbers
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
