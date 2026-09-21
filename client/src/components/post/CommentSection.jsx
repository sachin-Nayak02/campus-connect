import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import api from '../../api/axios';
import { formatTimeAgo } from '../../utils/media';
import toast from 'react-hot-toast';
import { Send, CornerDownRight } from 'lucide-react';

export default function CommentSection({ postId, initialComments = [], onCommentAdded }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { id, name }
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/posts/${postId}/comment`, {
        content: text.trim(),
        parentId: replyingTo ? replyingTo.id : null
      });

      if (res.data.success) {
        const newComment = res.data.data;
        if (replyingTo) {
          // Add to parent replies
          setComments(prev =>
            prev.map(c => {
              if (c.id === replyingTo.id) {
                return { ...c, replies: [...(c.replies || []), newComment] };
              }
              return c;
            })
          );
        } else {
          setComments(prev => [...prev, newComment]);
        }
        if (onCommentAdded) onCommentAdded();
        setText('');
        setReplyingTo(null);
      }
    } catch (err) {
      console.error('Comment error:', err);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
      {/* Comments List */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-2">
            <div className="flex items-start gap-2.5">
              <Avatar src={comment.user?.profilePhoto} name={comment.user?.fullName} size="sm" />
              <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">{comment.user?.fullName}</span>
                  <span className="text-[10px] text-slate-400">{formatTimeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{comment.content}</p>
                <button
                  type="button"
                  onClick={() => setReplyingTo({ id: comment.id, name: comment.user?.fullName })}
                  className="mt-1.5 text-[11px] font-semibold text-campus-600 hover:underline flex items-center gap-1"
                >
                  <CornerDownRight className="w-3 h-3" /> Reply
                </button>
              </div>
            </div>

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="ml-8 pl-3 border-l-2 border-slate-200 space-y-2">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-2">
                    <Avatar src={reply.user?.profilePhoto} name={reply.user?.fullName} size="sm" />
                    <div className="flex-1 bg-slate-50/70 rounded-xl p-2.5 border border-slate-100">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-800">{reply.user?.fullName}</span>
                        <span className="text-[10px] text-slate-400">{formatTimeAgo(reply.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-line">{reply.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Replying indicator */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1 bg-campus-50 rounded-xl text-xs text-campus-700 font-medium">
          <span>Replying to {replyingTo.name}</span>
          <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-600">
            Cancel
          </button>
        </div>
      )}

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Avatar src={user?.profilePhoto} name={user?.fullName} size="sm" />
        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full pl-3 pr-10 py-2 bg-slate-100 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200 border border-transparent transition"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-campus-600 hover:text-campus-700 disabled:opacity-30 disabled:cursor-not-allowed p-1"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
