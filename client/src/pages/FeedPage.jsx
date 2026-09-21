import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import PostComposer from '../components/post/PostComposer';
import PostCard from '../components/post/PostCard';
import Avatar from '../components/common/Avatar';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';
import { MessageSquare, Users, Sparkles, RefreshCw, Calendar } from 'lucide-react';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [friends, setFriends] = useState([]);
  const { isUserOnline } = useSocket();

  const fetchFeed = async (p = 1) => {
    try {
      const res = await api.get(`/posts?page=${p}&limit=15`);
      if (res.data.success) {
        if (p > 1) {
          setPosts(prev => [...prev, ...res.data.data.posts]);
        } else {
          setPosts(res.data.data.posts);
        }
        setHasMore(res.data.data.hasMore ?? res.data.data.posts.length > 0);
      }
    } catch (err) {
      console.error('Fetch feed error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await api.get('/users/friends');
      if (res.data.success) {
        setFriends(res.data.data);
      }
    } catch (err) {
      console.error('Fetch friends error:', err);
    }
  };

  useEffect(() => {
    fetchFeed(1);
    fetchFriends();
  }, []);

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6 items-start">
          {/* Left Sidebar */}
          <Sidebar />

          {/* Center Feed */}
          <section className="flex-1 max-w-2xl min-w-0">
            {/* Post Composer */}
            <PostComposer onPostCreated={handlePostCreated} />

            {/* Posts List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="bg-white rounded-2xl p-5 border border-slate-200/80 animate-pulse space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-slate-200 rounded-md w-1/3" />
                        <div className="h-2.5 bg-slate-100 rounded-md w-1/4" />
                      </div>
                    </div>
                    <div className="h-16 bg-slate-100 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div>
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDelete={handlePostDeleted}
                  />
                ))}
                {hasMore && (
                  <div className="text-center mt-4">
                    <button
                      onClick={() => {
                        const nextPage = page + 1;
                        setPage(nextPage);
                        fetchFeed(nextPage);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-campus-50 text-campus-600 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Your Campus Feed is Fresh</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Be the first to share an announcement, club event, or study query with your college!
                </p>
                <button
                  onClick={fetchFeed}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Feed
                </button>
              </div>
            )}
          </section>

          {/* Right Widget Panel */}
          <aside className="w-72 shrink-0 hidden xl:block space-y-4">
            {/* Campus Event Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-campus-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Upcoming Campus Events
                </h3>
              </div>
              <div className="space-y-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="inline-block px-1.5 py-0.5 bg-campus-100 text-campus-700 font-bold rounded-md text-[10px] mb-1">
                    Tomorrow, 2:00 PM
                  </span>
                  <p className="font-bold text-slate-800">College Hackathon Briefing</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Auditorium Hall B & Virtual</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded-md text-[10px] mb-1">
                    Friday
                  </span>
                  <p className="font-bold text-slate-800">Inter-Department Sports Meet</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Campus Sports Complex</p>
                </div>
              </div>
            </div>

            {/* Online Friends Widget */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Online Peers ({friends.filter(f => isUserOnline(f.id)).length})
                  </h3>
                </div>
                <Link to="/friends" className="text-[11px] text-campus-600 font-bold hover:underline">
                  View all
                </Link>
              </div>

              {friends.length > 0 ? (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {friends.map((friend) => {
                    const online = isUserOnline(friend.id);
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-xl transition"
                      >
                        <Link to={`/profile/${friend.id}`} className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            src={friend.profilePhoto}
                            name={friend.fullName}
                            size="sm"
                            isOnline={online}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{friend.fullName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{friend.branch}</p>
                          </div>
                        </Link>
                        <Link
                          to={`/chat?user=${friend.id}`}
                          className="p-1.5 text-slate-400 hover:text-campus-600 hover:bg-campus-50 rounded-lg transition"
                          title="Message"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  <p>Connect with peers to see who's online!</p>
                  <Link
                    to="/friends"
                    className="mt-2 inline-block font-semibold text-campus-600 hover:underline"
                  >
                    Find Students
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
