import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import api from '../../api/axios';
import { getVideoDuration } from '../../utils/media';
import toast from 'react-hot-toast';
import { Image, Video, X, Send, AlertCircle } from 'lucide-react';

export default function PostComposer({ onPostCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const [loading, setLoading] = useState(false);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (imageFiles.length + files.length > 4) {
      toast.error('You can upload up to 4 images per post.');
      return;
    }

    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImages(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    if (images[index]) {
      URL.revokeObjectURL(images[index]);
    }
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleVideoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVideoError(null);

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      setVideoError('Video file size exceeds 50MB limit.');
      toast.error('Video size must be under 50MB');
      return;
    }

    try {
      const duration = await getVideoDuration(file);
      console.log('Video duration:', duration);

      if (duration > 30.5) {
        setVideoError(`Video duration is ${Math.round(duration)}s. Maximum allowed duration is 30 seconds.`);
        toast.error('Video exceeds 30-second campus limit.');
        return;
      }

      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
      setVideoFile(file);
      setVideoDuration(duration);
      setVideoPreview(URL.createObjectURL(file));
    } catch (err) {
      console.error('Video check error:', err);
      setVideoError('Could not process video. Ensure it is a valid MP4/WEBM file.');
    }
  };

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(null);
    setVideoError(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && imageFiles.length === 0 && !videoFile) {
      toast.error('Write something or attach media to share with your campus.');
      return;
    }

    if (videoError) {
      toast.error(videoError);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('content', content);

      imageFiles.forEach(file => {
        formData.append('media', file);
      });

      if (videoFile) {
        formData.append('media', videoFile);
        formData.append('videoDuration', videoDuration);
      }

      const res = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success('Post published to campus feed!');
        setContent('');
        images.forEach(url => URL.revokeObjectURL(url));
        setImages([]);
        setImageFiles([]);
        if (imageInputRef.current) imageInputRef.current.value = '';
        removeVideo();
        if (onPostCreated) {
          onPostCreated(res.data.data);
        }
      }
    } catch (err) {
      console.error('Publish post error:', err);
      toast.error(err.response?.data?.message || 'Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs mb-6">
      <div className="flex gap-3.5">
        <Avatar src={user?.profilePhoto} name={user?.fullName} size="md" />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's happening on campus, ${user?.fullName?.split(' ')[0] || 'friend'}?`}
            rows={3}
            className="w-full text-sm text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-3 focus:outline-none focus:bg-white focus:border-campus-300 focus:ring-3 focus:ring-campus-100 resize-none transition"
          />

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              {images.map((img, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 group">
                  <img src={img} alt="preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black text-white rounded-full transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Video Preview */}
          {videoPreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden border border-slate-200 bg-black max-w-sm">
              <video src={videoPreview} controls className="w-full max-h-48 object-contain" />
              <div className="absolute top-2 left-2 bg-black/70 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>⏱️ {Math.round(videoDuration)}s (Max 30s)</span>
              </div>
              <button
                type="button"
                onClick={removeVideo}
                className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black text-white rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Video validation error prompt */}
          {videoError && (
            <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{videoError}</span>
            </div>
          )}

          {/* Controls Bar */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                <Image className="w-4 h-4 text-campus-600" />
                <span>Photo</span>
              </button>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={handleVideoSelect}
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                <Video className="w-4 h-4 text-purple-600" />
                <span>Video (≤30s)</span>
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && imageFiles.length === 0 && !videoFile)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-campus-600 to-indigo-600 hover:from-campus-700 hover:to-indigo-700 shadow-sm shadow-campus-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Posting...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
