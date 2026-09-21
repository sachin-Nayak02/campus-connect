import React, { useState } from 'react';
import { getMediaUrl } from '../../utils/media';

export default function Avatar({ src, name, size = 'md', isOnline = false, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-24 h-24 text-2xl'
  };

  const badgeSizes = {
    sm: 'w-2 h-2 ring-1',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3.5 h-3.5 ring-2',
    xl: 'w-5 h-5 ring-4'
  };

  const getInitials = (n) => {
    if (!n) return 'U';
    const trimmed = n.trim();
    if (!trimmed) return 'U';
    const parts = trimmed.split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const fullUrl = getMediaUrl(src);

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      {fullUrl && !imgError ? (
        <img
          src={fullUrl}
          alt={name || 'Avatar'}
          onError={() => setImgError(true)}
          className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200 shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr from-campus-600 to-campus-400 text-white font-semibold flex items-center justify-center border border-slate-200 shadow-sm`}
        >
          {getInitials(name)}
        </div>
      )}

      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 bg-emerald-500 rounded-full ring-white ${badgeSizes[size]}`}
          title="Online"
        />
      )}
    </div>
  );
}
