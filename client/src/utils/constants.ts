export const DEFAULT_AVATAR = (import.meta.env.VITE_DEFAULT_AVATAR as string) || '/default-avatar.png';
export const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';

export const getMediaUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') return DEFAULT_AVATAR;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const serverOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${serverOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
};
