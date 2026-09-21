import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import CommentSection from './CommentSection';
import Modal from '../common/Modal';
import api from '../../api/axios';
import { getMediaUrl, formatTimeAgo } from '../../utils/media';
import toast from 'react-hot-toast';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Trash2,
  Flag,
  Play
} from 'lucide-react';

export default function PostCard({ post, onDelete }) {
  const { user, isAdmin } = useAuth();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [showOptions, setShowOptions] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const isAuthor = user?.id === post.author?.id;
  const canDelete = isAuthor || isAdmin;

  const handleLike = async () => {
    // Optimistic UI update
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount(prev => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await api.post(`/posts/${post.id}/like`);
      if (res.data.success) {
        setIsLiked(res.data.data.liked);
        setLikesCount(res.data.data.likesCount);
      }
    } catch (err) {
      console.error('Like error:', err);
      // Revert
      setIsLiked(!nextState);
      setLikesCount(prev => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await api.delete(`/posts/${post.id}`);
      if (res.data.success) {
        toast.success('Post removed');
        if (onDelete) onDelete(post.id);
      }
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  const handleReport = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) return;

    setSubmittingReport(true);
    try {
      const res = await api.post(`/posts/${post.id}/report`, {
        reason: reportReason.trim()
      });
      if (res.data.success) {
        toast.success('Post reported for admin review');
        setReportModalOpen(false);
        setReportReason('');
      }
    } catch (err) {
      toast.error('Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/#post-${post.id}`;
    navigator.clipboard.writeText(postUrl);
    toast.success('Post link copied to clipboard!');
  };

  const images = post.media?.filter(m => m.type === 'image') || [];
  const videos = post.media?.filter(m => m.type === 'video') || [];

  return (
    <article className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs mb-5 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <Link to={`/profile/${post.author?.id}`} className="flex items-center gap-3 group">
          <Avatar src={post.author?.profilePhoto} name={post.author?.fullName} size="md" />
          <div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-campus-600 transition">
              {post.author?.fullName}
            </h4>
            <p className="text-xs text-slate-600">
              {post.author?.rollNumber} • {post.author?.branch} • {formatTimeAgo(post.createdAt)}
            </p>
          </div>
        </Link>

        {/* Options Menu */}
        <div className="relative">
          <button
            onClick={() => setShowOptions(prev => !prev)}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showOptions && (
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 p-1.5 z-20">
              {canDelete && (
                <button
                  onClick={() => {
                    setShowOptions(false);
                    handleDelete();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Post
                </button>
              )}
              <button
                onClick={() => {
                  setShowOptions(false);
                  setReportModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition"
              >
                <Flag className="w-3.5 h-3.5" />
                Report Post
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line mb-3.5">
          {post.content}
        </p>
      )}

      {/* Media: Images */}
      {images.length > 0 && (
        <div
          className={`grid gap-2 mb-3.5 rounded-2xl overflow-hidden ${
            images.length === 1 ? 'grid-cols-1 max-h-96' : 'grid-cols-2'
          }`}
        >
          {images.map((img) => (
            <div key={img.id} className="bg-slate-100 relative group overflow-hidden">
              <img
                src={getMediaUrl(img.url)}
                alt="post visual"
                className="w-full h-full object-cover max-h-96 hover:scale-102 transition duration-300"
              />
            </div>
          ))}
        </div>
      )}

      {/* Media: Video */}
      {videos.length > 0 && (
        <div className="mb-3.5 relative rounded-2xl overflow-hidden bg-black max-w-lg">
          <video
            src={getMediaUrl(videos[0].url)}
            controls
            className="w-full max-h-96 object-contain"
          />
          {videos[0].durationSeconds && (
            <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Play className="w-3 h-3 text-campus-400" />
              <span>{videos[0].durationSeconds}s campus clip</span>
            </div>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
            isLiked ? 'text-rose-600 bg-rose-50' : 'hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          <motion.div
            animate={isLiked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
          </motion.div>
          <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>
        </motion.button>

        <button
          onClick={() => setShowComments(prev => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-50 hover:text-slate-700 transition"
        >
          <MessageCircle className="w-4 h-4 text-slate-500" />
          <span>{commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-50 hover:text-slate-700 transition"
        >
          <Share2 className="w-4 h-4 text-slate-500" />
          <span>Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <CommentSection
          postId={post.id}
          initialComments={post.comments || []}
          onCommentAdded={() => setCommentsCount(prev => prev + 1)}
        />
      )}

      {/* Report Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Report Content to Campus Admin"
      >
        <form onSubmit={handleReport} className="space-y-4">
          <p className="text-xs text-slate-500">
            Please describe why this post violates campus guidelines (e.g. harassment, misinformation, inappropriate content).
          </p>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={3}
            placeholder="Reason for report..."
            className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200 resize-none"
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReportModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReport}
              className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50"
            >
              {submittingReport ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </Modal>
    </article>
  );
}
