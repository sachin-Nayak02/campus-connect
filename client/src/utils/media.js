const SERVER_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? '' : 'http://localhost:5000');

export function getMediaUrl(path) {
  if (!path) return null;

  // Strip localhost:5000 if stored in DB during local testing
  let cleanPath = path;
  if (typeof cleanPath === 'string' && cleanPath.includes('localhost:5000')) {
    cleanPath = cleanPath.replace(/^https?:\/\/localhost:5000/, '');
  }

  // Handle absolute URLs
  if (cleanPath.startsWith('https://')) {
    return cleanPath;
  }
  if (cleanPath.startsWith('http://')) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return cleanPath.replace('http://', 'https://');
    }
    return cleanPath;
  }

  return `${SERVER_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
}

export function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = function () {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = function () {
        reject(new Error('Invalid video file'));
      };
      video.src = URL.createObjectURL(file);
    } catch (err) {
      reject(err);
    }
  });
}

export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
