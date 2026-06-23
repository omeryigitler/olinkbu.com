import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import {
  Bookmark,
  Check,
  CheckCircle2,
  CircleHelp,
  Clipboard,
  Compass,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Home,
  Instagram,
  Link as LinkIcon,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Music,
  Play,
  PlayCircle,
  PlusSquare,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Sun,
  Trophy,
  User as UserIcon,
  X,
  Youtube,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  ensureUserProfile,
  setSnippetReaction,
  subscribeSavedSnippetIds,
  toggleSnippetSave,
  type ReactionType,
} from './lib/cloudSync';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const FERRARI_RED = '#E10600';
const FALLBACK_SPOTIFY_THUMB = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800';

type Lang = 'en' | 'tr';
type Theme = 'dark' | 'light';
type Platform = 'youtube' | 'spotify';
type Tab = 'home' | 'explore' | 'create' | 'profile' | 'saved' | 'settings';

type ParsedMedia = {
  platform: Platform;
  id: string;
  cleanUrl: string;
};

interface Snippet {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  videoUrl: string;
  videoId: string;
  platform: Platform;
  startSec: number;
  endSec: number;
  comment: string;
  category: string;
  likesCount: number;
  reactions?: Record<ReactionType, number>;
  createdAt?: Timestamp | null;
}

enum OperationType {
  CREATE = 'create',
  LIST = 'list',
  WRITE = 'write',
}

const translations = {
  tr: {
    nav: {
      home: 'Anasayfa',
      explore: 'Keşfet',
      create: 'Kes',
      saved: 'Kaydedilenler',
      profile: 'Profil',
      settings: 'Ayarlar',
    },
  },
  en: {
    nav: {
      home: 'Home',
      explore: 'Explore',
      create: 'Clip',
      saved: 'Saved',
      profile: 'Profile',
      settings: 'Settings',
    },
  },
};

const MOCK_SNIPPETS: Snippet[] = [
  {
    id: 'demo-1',
    userId: 'demo',
    userName: 'olinkbu_demo',
    userPhoto: 'https://i.pravatar.cc/150?u=olinkbu_demo',
    videoUrl: 'https://youtu.be/ysz5S6PUM-U',
    videoId: 'ysz5S6PUM-U',
    platform: 'youtube',
    startSec: 42,
    endSec: 72,
    comment: 'Tam olarak paylaşmak istediğin hissiyatı yakalayan bir an.',
    category: '#motivasyon',
    likesCount: 14,
    reactions: { lightbulb: 6, deep: 3, fire: 4, inspire: 1 },
    createdAt: null,
  },
  {
    id: 'demo-2',
    userId: 'demo',
    userName: 'music_hunter',
    userPhoto: 'https://i.pravatar.cc/150?u=music_hunter',
    videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    platform: 'youtube',
    startSec: 58,
    endSec: 88,
    comment: 'Nostalji patlaması yapan kısa kesit.',
    category: '#müzik',
    likesCount: 27,
    reactions: { lightbulb: 8, deep: 6, fire: 11, inspire: 2 },
    createdAt: null,
  },
  {
    id: 'demo-3',
    userId: 'demo',
    userName: 'film_gurmesi',
    userPhoto: 'https://i.pravatar.cc/150?u=film_gurmesi',
    videoUrl: 'https://youtu.be/jNQXAC9IVRw',
    videoId: 'jNQXAC9IVRw',
    platform: 'youtube',
    startSec: 12,
    endSec: 40,
    comment: 'İnternet tarihinden küçük ama etkili bir parça.',
    category: '#klasik',
    likesCount: 9,
    reactions: { lightbulb: 3, deep: 1, fire: 4, inspire: 1 },
    createdAt: null,
  },
];

let youtubeApiPromise: Promise<void> | null = null;

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Firestore Error [${operationType}] on ${path}:`, error);
}

function formatSecondsToMMSS(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function parseInputUrl(rawUrl: string): ParsedMedia | null {
  const normalized = rawUrl.trim();
  if (!normalized) return null;

  try {
    const parsedUrl = new URL(normalized.startsWith('http') ? normalized : `https://${normalized}`);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      const id = parsedUrl.pathname.split('/').filter(Boolean)[0];
      return id?.length === 11 ? { platform: 'youtube', id, cleanUrl: `https://youtu.be/${id}` } : null;
    }

    if (hostname.endsWith('youtube.com')) {
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const id = parsedUrl.searchParams.get('v') || pathParts.at(-1);
      return id?.length === 11 ? { platform: 'youtube', id, cleanUrl: `https://youtu.be/${id}` } : null;
    }

    if (hostname === 'open.spotify.com') {
      const parts = parsedUrl.pathname.split('/').filter(Boolean);
      if (parts[0] === 'track' && parts[1]) {
        return { platform: 'spotify', id: parts[1], cleanUrl: `https://open.spotify.com/track/${parts[1]}` };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function buildShareLinks(media: ParsedMedia | null, startSec: number) {
  if (!media) return null;

  const start = Math.max(0, Math.floor(startSec));
  if (media.platform === 'youtube') {
    const timeParam = start > 0 ? `?t=${start}` : '';
    const musicTimeParam = start > 0 ? `&t=${start}` : '';
    return {
      yt: `https://youtu.be/${media.id}${timeParam}`,
      ytm: `https://music.youtube.com/watch?v=${media.id}${musicTimeParam}`,
    };
  }

  return { spot: media.cleanUrl };
}

function getSnippetThumbnail(snippet: Snippet) {
  if (snippet.platform === 'spotify') return FALLBACK_SPOTIFY_THUMB;
  return `https://img.youtube.com/vi/${snippet.videoId}/maxresdefault.jpg`;
}

function getOpenUrl(snippet: Snippet) {
  if (snippet.platform === 'spotify') return snippet.videoUrl;
  const start = Math.max(0, Math.floor(snippet.startSec || 0));
  return `${snippet.videoUrl || `https://youtu.be/${snippet.videoId}`}${start > 0 ? `?t=${start}` : ''}`;
}

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }

    window.setTimeout(() => {
      if (window.YT?.Player) resolve();
    }, 1000);
  });

  return youtubeApiPromise;
}

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    type="button"
    className={`w-full flex items-center gap-6 px-4 py-3 rounded-xl transition-all ${
      active
        ? 'dark:bg-white/10 bg-black/10 dark:text-white text-black font-bold shadow-lg dark:shadow-white/5 shadow-black/5'
        : 'dark:text-gray-400 text-gray-500 dark:hover:bg-white/5 hover:bg-black/5 dark:hover:text-white hover:text-black'
    }`}
  >
    <div className={`shrink-0 transition-transform ${active ? 'scale-110 dark:text-white text-black' : 'dark:text-gray-500 text-gray-400'}`}>{icon}</div>
    <span className="text-sm truncate font-medium">{label}</span>
  </button>
);

const Header = ({ user, onLogin, onLogout, theme, toggleTheme, lang, setLang, onMenuClick }: any) => (
  <header className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center justify-between px-4 lg:px-8 border-b dark:border-white/5 border-black/5 dark:bg-black/80 bg-white/80 backdrop-blur-2xl transition-colors">
    <div className="flex items-center gap-3">
      <button onClick={onMenuClick} type="button" className="lg:hidden p-2 rounded-xl dark:bg-white/5 bg-black/5">
        <Menu className="w-5 h-5" />
      </button>
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} type="button" className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-full bg-[#E10600] flex items-center justify-center shadow-lg shadow-red-600/20">
          <div className="w-5 h-5 rounded-full bg-white" />
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/70" />
        </div>
        <span className="font-black text-2xl tracking-[-0.04em] dark:text-white text-black">olinkbu</span>
      </button>
    </div>

    <div className="flex items-center gap-2 md:gap-3">
      <button onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')} type="button" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl dark:bg-white/5 bg-black/5 text-xs font-bold uppercase">
        <Globe className="w-4 h-4" /> {lang}
      </button>
      <button onClick={toggleTheme} type="button" className="p-3 rounded-xl dark:bg-white/5 bg-black/5 dark:hover:bg-white/10 hover:bg-black/10 transition-colors">
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
      {user ? (
        <div className="flex items-center gap-2">
          <img src={user.photoURL || 'https://i.pravatar.cc/150?u=user'} alt="profile" className="w-9 h-9 rounded-full border dark:border-white/10 border-black/10 object-cover" />
          <button onClick={onLogout} type="button" className="p-3 rounded-xl dark:bg-white/5 bg-black/5 hover:text-[#E10600] transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button onClick={onLogin} type="button" className="px-5 py-3 rounded-xl bg-[#E10600] text-white font-black text-sm shadow-lg shadow-red-600/20 hover:scale-[1.02] active:scale-95 transition-all">
          Giriş Yap
        </button>
      )}
    </div>
  </header>
);

const ResultRow = ({ icon, title, link, onCopy, isCopied }: any) => (
  <div className="flex items-center justify-between p-4 dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5 rounded-2xl group hover:border-brand/30 transition-all">
    <div className="flex items-center gap-4 min-w-0">
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] font-strong uppercase tracking-widest dark:text-gray-500 text-gray-600">{title}</p>
        <p className="text-xs font-mono dark:text-gray-400 text-gray-600 truncate max-w-[190px]">{link}</p>
      </div>
    </div>
    <button
      onClick={onCopy}
      type="button"
      className={`p-3 rounded-xl transition-all ${isCopied ? 'bg-green-500/20 text-green-500' : 'bg-brand/10 text-brand hover:bg-brand hover:text-white'}`}
    >
      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  </div>
);

const YouTubeClipper = ({ videoId, onMarkStart, onMarkEnd, start, end }: any) => {
  const [player, setPlayer] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let playerInstance: any;
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !playerRef.current || !window.YT?.Player) return;
      playerRef.current.innerHTML = '';
      playerInstance = new window.YT.Player(playerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
            setReady(true);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      setReady(false);
      setPlayer(null);
      playerInstance?.destroy?.();
    };
  }, [videoId]);

  const handleMark = (type: 'start' | 'end') => {
    if (!player?.getCurrentTime) return;
    const time = Math.floor(player.getCurrentTime());
    if (type === 'start') onMarkStart(time);
    else onMarkEnd(time);
  };

  return (
    <div className="space-y-4">
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border dark:border-white/5 border-black/5">
        <div ref={playerRef} className="w-full h-full" />
      </div>
      {!ready && <p className="text-xs dark:text-gray-500 text-gray-500 text-center">YouTube oynatıcı yükleniyor...</p>}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleMark('start')}
          disabled={!ready}
          type="button"
          className="flex items-center justify-center gap-3 p-4 dark:bg-white/5 bg-black/5 border border-brand/30 rounded-xl hover:bg-brand/10 transition-all text-brand font-bold uppercase tracking-widest text-sm disabled:opacity-50"
        >
          <PlayCircle className="w-4 h-4" /> Start: {formatSecondsToMMSS(start)}
        </button>
        <button
          onClick={() => handleMark('end')}
          disabled={!ready}
          type="button"
          className="flex items-center justify-center gap-3 p-4 dark:bg-white/5 bg-black/5 border border-brand/30 rounded-xl hover:bg-brand/10 transition-all text-brand font-bold uppercase tracking-widest text-sm disabled:opacity-50"
        >
          <PlayCircle className="w-4 h-4" /> End: {formatSecondsToMMSS(end)}
        </button>
      </div>
    </div>
  );
};

interface SnippetSocialCardProps {
  snippet: Snippet;
  onReact: (reactionType: ReactionType) => void;
  isSaved?: boolean;
  onSave?: () => void;
  onCopy: (link: string) => void;
}

const SnippetSocialCard = ({ snippet, onReact, isSaved, onSave, onCopy }: SnippetSocialCardProps) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showInstaKit, setShowInstaKit] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finalThumbnail = getSnippetThumbnail(snippet);
  const shareUrl = getOpenUrl(snippet);

  const generateInstaImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, 1080, 1920);
    const grad = ctx.createLinearGradient(0, 360, 0, 1520);
    grad.addColorStop(0, '#171717');
    grad.addColorStop(1, '#000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 360, 1080, 1120);
    ctx.fillStyle = FERRARI_RED;
    ctx.font = 'bold 84px Inter';
    ctx.fillText('olinkbu', 64, 150);
    ctx.fillStyle = '#fff';
    ctx.font = 'italic 62px Inter';
    ctx.fillText((snippet.comment || 'Olinkbu anı').slice(0, 44), 64, 1600);
    ctx.fillStyle = FERRARI_RED;
    ctx.font = 'bold 34px Inter';
    ctx.fillText(`${snippet.category} · ${formatSecondsToMMSS(snippet.startSec)}`, 64, 1810);
  };

  useEffect(() => {
    if (showInstaKit) window.setTimeout(generateInstaImage, 100);
  }, [showInstaKit]);

  return (
    <div className="group relative flex flex-col mb-8 cursor-pointer">
      <button onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')} type="button" className="relative aspect-video w-full rounded-xl overflow-hidden bg-gray-900 group/media shadow-lg text-left">
        <img src={finalThumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={snippet.comment || 'snippet thumbnail'} />
        <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white z-10">{formatSecondsToMMSS(snippet.startSec)}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/media:bg-black/30 transition-all">
          <div className="opacity-0 group-hover/media:opacity-100 transition-all scale-75 group-hover/media:scale-100">
            <div className="bg-brand rounded-full p-4 shadow-xl"><Play className="fill-white w-8 h-8 text-white" /></div>
          </div>
        </div>
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-brand px-2 py-1 rounded-md shadow-lg">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span className="text-[8px] font-strong text-white tracking-widest uppercase">{(snippet.category || '#an').replace('#', '')}</span>
        </div>
      </button>

      <div className="flex gap-3 mt-3 px-1">
        <img src={snippet.userPhoto || 'https://i.pravatar.cc/150?u=empty'} className="w-9 h-9 rounded-full shrink-0 border dark:border-white/10 border-black/10 object-cover" alt="avatar" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-1 dark:text-white text-gray-900 group-hover:text-brand transition-colors">
            {snippet.comment || 'Untitled Snippet'}
          </h3>
          <span className="flex items-center gap-1 text-[12px] dark:text-gray-500 text-gray-600 font-medium">
            {snippet.userName || 'Olinkbu Curator'} <CheckCircle2 className="w-3 h-3 text-blue-500 fill-current" />
          </span>
          <div className="flex items-center gap-3 mt-2 overflow-x-auto no-scrollbar text-[10px] font-bold dark:text-gray-500 text-gray-600">
            <button onClick={(event) => { event.stopPropagation(); onReact('lightbulb'); }} type="button" className="flex items-center gap-1 hover:text-brand transition-colors bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full"><span>💡</span>{snippet.reactions?.lightbulb || 0}</button>
            <button onClick={(event) => { event.stopPropagation(); onReact('deep'); }} type="button" className="flex items-center gap-1 hover:text-brand transition-colors bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full"><span>🌌</span>{snippet.reactions?.deep || 0}</button>
            <button onClick={(event) => { event.stopPropagation(); onReact('fire'); }} type="button" className="flex items-center gap-1 hover:text-brand transition-colors bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full"><span>🔥</span>{snippet.reactions?.fire || 0}</button>
            <button onClick={(event) => { event.stopPropagation(); onReact('inspire'); }} type="button" className="flex items-center gap-1 hover:text-brand transition-colors bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full"><span>🚀</span>{snippet.reactions?.inspire || 0}</button>
            <button onClick={(event) => { event.stopPropagation(); setShowComments((value) => !value); }} type="button" className="flex items-center gap-1 hover:text-brand transition-colors"><MessageSquare className="w-3 h-3" />12</button>
            <button onClick={(event) => { event.stopPropagation(); setShowShareModal(true); }} type="button" className="flex items-center gap-1 hover:text-blue-400 transition-colors"><Send className="w-3 h-3 -rotate-45" /></button>
            {onSave && <button onClick={(event) => { event.stopPropagation(); onSave(); }} type="button" className={`flex items-center gap-1 transition-colors ${isSaved ? 'text-brand' : 'hover:text-brand'}`}><Bookmark className={`w-3 h-3 ${isSaved ? 'fill-brand' : ''}`} /></button>}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-1">
            <div className="pt-4 space-y-3 border-t dark:border-white/5 border-black/5 mt-2">
              <div className="flex gap-2 text-[11px]"><div className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center shrink-0">Y</div><div className="flex-1"><span className="font-bold dark:text-gray-300 text-gray-700 mr-2">yigitleromer</span><span className="dark:text-gray-400 text-gray-600">Harika bir yakalama! Paylaşım için teşekkürler.</span></div></div>
              <div className="flex gap-2"><input type="text" placeholder="Yorum ekle..." className="flex-1 dark:bg-white/5 bg-black/5 rounded-lg px-3 py-1.5 text-[11px] outline-none border border-transparent focus:border-brand/30 dark:text-white text-black" /><button type="button" className="text-brand p-1.5"><Send className="w-4 h-4" /></button></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
            <motion.button type="button" aria-label="Kapat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowShareModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="relative w-full max-w-lg dark:bg-gray-900 bg-white rounded-t-3xl sm:rounded-3xl p-8 border dark:border-white/10 border-black/10">
              <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-strong italic uppercase tracking-tight">Paylaş</h3><button onClick={() => setShowShareModal(false)} type="button" className="p-2 rounded-full dark:bg-white/5 bg-black/5"><X className="w-4 h-4" /></button></div>
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => { setShowShareModal(false); setShowInstaKit(true); }} type="button" className="flex items-center gap-4 p-5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-2xl font-bold transition-transform active:scale-95"><Instagram className="w-6 h-6" /><span className="flex-1 text-left">Instagram Story Kit</span><ExternalLink className="w-4 h-4 opacity-50" /></button>
                <button onClick={() => { onCopy(shareUrl); setShowShareModal(false); }} type="button" className="flex items-center gap-4 p-5 dark:bg-white/10 bg-black/5 rounded-2xl font-bold transition-transform active:scale-95"><Copy className="w-6 h-6" /><span className="flex-1 text-left">Linki Kopyala</span></button>
              </div>
            </motion.div>
          </div>
        )}

        {showInstaKit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl w-full">
              <button onClick={() => setShowInstaKit(false)} type="button" className="absolute -top-10 right-0 text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
              <div className="space-y-8 flex flex-col justify-center"><h2 className="text-5xl font-strong text-white uppercase italic tracking-tighter leading-none">INSTAGRAM <br /> STORY KIT</h2><p className="text-gray-400 font-medium text-lg leading-relaxed">Bu görseli indirip hikayende paylaş, ardından linki kopyalayıp Link Çıkartması olarak ekle.</p><button onClick={() => onCopy(shareUrl)} type="button" className="w-full p-5 bg-brand text-white rounded-2xl font-strong uppercase tracking-widest flex items-center justify-center gap-3"><Clipboard className="w-5 h-5" /> Linki Kopyala</button></div>
              <canvas ref={canvasRef} width="1080" height="1920" className="w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl border border-white/10 bg-black" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function HomeHero({ inputUrl, setInputUrl, onStart }: { inputUrl: string; setInputUrl: (value: string) => void; onStart: () => void }) {
  return (
    <div className="w-full max-w-5xl mb-12">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-red-100 bg-white p-5 md:p-8 shadow-[0_35px_110px_-55px_rgba(0,0,0,0.45)]">
        <div className="absolute left-0 top-0 h-1.5 w-full bg-[#E10600]" />
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#E10600]/10 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-black/5 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-[10px] font-strong uppercase tracking-[0.24em] text-[#E10600]"><Sparkles className="h-3.5 w-3.5" />Olinkbu Moment Network</div>
            <div className="space-y-4"><h1 className="max-w-2xl text-5xl font-strong italic uppercase leading-[0.84] tracking-[-0.05em] text-black md:text-7xl lg:text-8xl">HİSSİYATI <span className="text-[#E10600]">ANINDA</span> YAKALA</h1><p className="max-w-xl text-base font-medium leading-7 text-gray-600 md:text-lg">YouTube veya Spotify’daki en güçlü saniyeyi seç, notunu ekle ve paylaşılabilir bir ana dönüştür.</p></div>
            <div className="rounded-[1.75rem] border border-gray-200 bg-white p-2 shadow-2xl shadow-black/10"><div className="flex flex-col gap-2 md:flex-row md:items-center"><div className="flex flex-1 items-center rounded-2xl bg-gray-50 px-4 py-4 ring-1 ring-gray-100 focus-within:ring-2 focus-within:ring-[#E10600]/30"><LinkIcon className="mr-3 h-5 w-5 text-[#E10600]" /><input type="text" placeholder="YouTube veya Spotify linkini yapıştır..." className="w-full bg-transparent text-base font-bold text-black outline-none placeholder:text-gray-400" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onStart(); }} /></div><button onClick={onStart} disabled={!inputUrl.trim()} type="button" className="rounded-2xl bg-[#E10600] px-8 py-4 font-strong text-lg uppercase tracking-[0.14em] text-white shadow-xl shadow-red-600/25 transition-all hover:scale-[1.02] hover:bg-[#c90500] active:scale-95 disabled:opacity-50 disabled:hover:scale-100">Kesit Al</button></div></div>
            <div className="flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500"><span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2">Kesit Linki</span><span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2">Küratör Notu</span><span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2">Story Card</span></div>
          </div>
          <div className="relative min-h-[330px] overflow-hidden rounded-[2.25rem] bg-[#09090B] p-5 shadow-2xl shadow-black/25"><div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(225,6,0,0.36),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%)]" /><div className="absolute right-[-18%] top-1/2 h-40 w-[72%] -translate-y-1/2 bg-[#E10600] shadow-[0_0_80px_rgba(225,6,0,0.55)]" style={{ clipPath: 'polygon(0 0, 74% 0, 100% 50%, 74% 100%, 0 100%, 18% 50%)' }} /><div className="absolute right-[10%] top-1/2 h-20 w-[42%] -translate-y-1/2 bg-white/95" style={{ clipPath: 'polygon(0 0, 70% 0, 100% 50%, 70% 100%, 0 100%, 20% 50%)' }} /><div className="relative z-10 flex h-full min-h-[290px] flex-col justify-between"><div className="flex items-center justify-between"><div className="rounded-2xl bg-white px-4 py-3 text-black shadow-xl"><p className="text-[10px] font-strong uppercase tracking-[0.2em] text-[#E10600]">Live Moment</p><p className="text-xl font-strong italic leading-none">00:42</p></div><div className="flex gap-2 text-white"><div className="rounded-full bg-white/10 p-3 backdrop-blur"><Youtube className="h-5 w-5 text-[#E10600]" /></div><div className="rounded-full bg-white/10 p-3 backdrop-blur"><Music className="h-5 w-5" /></div></div></div><div className="space-y-4"><div className="max-w-[240px] rounded-3xl bg-white/10 p-4 text-white backdrop-blur-md ring-1 ring-white/10"><p className="text-[10px] font-strong uppercase tracking-[0.22em] text-white/50">Slogan</p><p className="mt-2 text-2xl font-strong italic uppercase leading-none">Hissiyatı anında yakala.</p></div><div className="flex items-center gap-3 rounded-2xl bg-white p-3 text-black shadow-2xl"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E10600] text-white"><PlayCircle className="h-6 w-6 fill-current" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">Favori anını paylaş</p><p className="text-xs font-medium text-gray-500">Link → Kesit → Sosyal kart</p></div><Share2 className="h-5 w-5 text-[#E10600]" /></div></div></div></div>
        </div>
      </div>
    </div>
  );
}

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white shadow-2xl">{message}</div>;
}

export default function App() {
  const [lang, setLang] = useState<Lang>('tr');
  const [theme, setTheme] = useState<Theme>('light');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [snippets, setSnippets] = useState<Snippet[]>(MOCK_SNIPPETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSnippets, setSavedSnippets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('olinkbu_saved');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [inputUrl, setInputUrl] = useState('');
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(30);
  const [userComment, setUserComment] = useState('');
  const [snippetCategory, setSnippetCategory] = useState('#felsefe');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const parsedMedia = useMemo(() => parseInputUrl(inputUrl), [inputUrl]);
  const generatedLinks = useMemo(() => buildShareLinks(parsedMedia, startSec), [parsedMedia, startSec]);
  const t = translations[lang];
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAdmin(currentUser?.email === 'yigitleromer@gmail.com');
      if (currentUser) {
        try {
          await ensureUserProfile(db, currentUser);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'users/profile');
        }
      }
    });

    const q = query(collection(db, 'snippets'), orderBy('createdAt', 'desc'), limit(30));
    const unsubFeed = onSnapshot(
      q,
      (snapshot) => {
        const firestoreSnippets = snapshot.docs.map((snapshotDoc) => {
          const data = snapshotDoc.data() as Partial<Snippet>;
          return {
            id: snapshotDoc.id,
            userId: data.userId || '',
            userName: data.userName || 'Olinkbu Curator',
            userPhoto: data.userPhoto || 'https://i.pravatar.cc/150?u=olinkbu',
            videoUrl: data.videoUrl || '',
            videoId: data.videoId || '',
            platform: data.platform || 'youtube',
            startSec: Number(data.startSec || 0),
            endSec: Number(data.endSec || 30),
            comment: data.comment || '',
            category: data.category || '#an',
            likesCount: Number(data.likesCount || 0),
            reactions: data.reactions || { lightbulb: 0, deep: 0, fire: 0, inspire: 0 },
            createdAt: data.createdAt || null,
          } as Snippet;
        });
        setSnippets(firestoreSnippets);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'snippets');
        notify('Feed yüklenemedi, demo içerikler gösteriliyor.');
        setSnippets(MOCK_SNIPPETS);
      },
    );

    return () => {
      unsubAuth();
      unsubFeed();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem('olinkbu_saved');
      setSavedSnippets(saved ? JSON.parse(saved) : []);
      return;
    }

    return subscribeSavedSnippetIds(
      db,
      user.uid,
      (snippetIds) => {
        setSavedSnippets(snippetIds);
        localStorage.setItem('olinkbu_saved', JSON.stringify(snippetIds));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users/saves'),
    );
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'auth/login');
      notify('Giriş tamamlanamadı.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    notify('Çıkış yapıldı.');
  };

  const handleCopy = async (link: string) => {
    const ok = await copyToClipboard(link);
    if (!ok) {
      notify('Link otomatik kopyalanamadı. Manuel kopyalamayı dene.');
      return;
    }
    setCopiedLink(link);
    notify('Link kopyalandı.');
    window.setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleStartFromHero = () => {
    if (!parsedMedia) {
      notify('Geçerli bir YouTube veya Spotify linki yapıştır.');
      return;
    }
    setActiveTab('create');
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const handleCreateSnippet = async () => {
    if (!parsedMedia) {
      notify('Önce geçerli bir YouTube veya Spotify linki yapıştır.');
      return;
    }

    if (!user) {
      await handleLogin();
      return;
    }

    const trimmedComment = userComment.trim();
    if (!trimmedComment) {
      notify('Paylaşmadan önce kısa bir küratör notu ekle.');
      return;
    }

    const normalizedStart = Math.max(0, Math.floor(startSec));
    const normalizedEnd = parsedMedia.platform === 'youtube' ? Math.max(0, Math.floor(endSec)) : 0;

    if (parsedMedia.platform === 'youtube') {
      if (normalizedEnd <= normalizedStart) {
        notify('Bitiş zamanı başlangıçtan büyük olmalı.');
        return;
      }
      if (normalizedEnd - normalizedStart > 90) {
        notify('Kesit süresi en fazla 90 saniye olabilir.');
        return;
      }
    }

    try {
      await addDoc(collection(db, 'snippets'), {
        userId: user.uid,
        userName: user.displayName || 'Olinkbu Curator',
        userPhoto: user.photoURL || '',
        videoUrl: parsedMedia.cleanUrl,
        videoId: parsedMedia.id,
        platform: parsedMedia.platform,
        startSec: normalizedStart,
        endSec: parsedMedia.platform === 'youtube' ? normalizedEnd : normalizedStart,
        comment: trimmedComment,
        category: snippetCategory,
        likesCount: 0,
        reactions: { lightbulb: 0, deep: 0, fire: 0, inspire: 0 },
        createdAt: serverTimestamp(),
      });
      setInputUrl('');
      setUserComment('');
      setStartSec(0);
      setEndSec(30);
      setActiveTab('home');
      notify('An başarıyla paylaşıldı.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'snippets');
      notify('Paylaşım kaydedilemedi.');
    }
  };

  const handleToggleSave = async (snippetId: string) => {
    if (!user) {
      await handleLogin();
      return;
    }
    const snippet = snippets.find((item) => item.id === snippetId);
    if (!snippet) return;
    const wasSaved = savedSnippets.includes(snippetId);

    setSavedSnippets((previous) => {
      const next = wasSaved ? previous.filter((id) => id !== snippetId) : [...previous, snippetId];
      localStorage.setItem('olinkbu_saved', JSON.stringify(next));
      return next;
    });

    try {
      await toggleSnippetSave(db, user, snippet, wasSaved);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users/saves');
      setSavedSnippets((previous) => {
        const next = wasSaved ? [...previous, snippetId] : previous.filter((id) => id !== snippetId);
        localStorage.setItem('olinkbu_saved', JSON.stringify(next));
        return next;
      });
      notify('Kaydetme işlemi tamamlanamadı.');
    }
  };

  const handleReaction = async (id: string, reactionType: ReactionType) => {
    if (!user) {
      await handleLogin();
      return;
    }
    const snippet = snippets.find((item) => item.id === id);
    if (!snippet) return;

    setSnippets((previous) => previous.map((item) => {
      if (item.id !== id) return item;
      const current = item.reactions || { lightbulb: 0, deep: 0, fire: 0, inspire: 0 };
      return { ...item, reactions: { ...current, [reactionType]: (current[reactionType] || 0) + 1 } };
    }));

    try {
      await setSnippetReaction(db, user, snippet, reactionType);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'snippets/reactions');
      notify('Reaksiyon kaydedilemedi.');
    }
  };

  const filteredSnippets = snippets.filter((snippet) => {
    const queryText = searchQuery.toLowerCase();
    if (!queryText) return true;
    return [snippet.comment, snippet.userName, snippet.category].some((value) => (value || '').toLowerCase().includes(queryText));
  });

  const savedItems = snippets.filter((snippet) => savedSnippets.includes(snippet.id));

  return (
    <div className="min-h-screen dark:bg-black bg-gray-50 dark:text-white text-gray-900 transition-colors">
      <motion.div style={{ scaleX }} className="fixed top-0 left-0 right-0 h-1 bg-brand z-[80] origin-left" />
      <Header user={user} onLogin={handleLogin} onLogout={handleLogout} onMenuClick={() => {}} theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} lang={lang} setLang={setLang} />

      <div className="flex pt-20 h-screen">
        <aside className="hidden lg:flex flex-col w-64 overflow-y-auto p-4 border-r dark:border-white/5 border-black/5 scrollbar-thin dark:bg-black/40 bg-white/40 transition-colors">
          <nav className="space-y-2">
            <NavItem icon={<Home className="w-5 h-5" />} label={t.nav.home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <NavItem icon={<Compass className="w-5 h-5" />} label={t.nav.explore} active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
            <NavItem icon={<PlusSquare className="w-5 h-5" />} label={t.nav.create} active={activeTab === 'create'} onClick={() => setActiveTab('create')} />
            <NavItem icon={<Bookmark className="w-5 h-5" />} label={t.nav.saved} active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} />
            <NavItem icon={<UserIcon className="w-5 h-5" />} label={t.nav.profile} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          </nav>
          <div className="border-t dark:border-white/5 border-black/5 mt-6 pt-6 pb-8 space-y-2 transition-colors">
            <NavItem icon={<Settings className="w-5 h-5" />} label={t.nav.settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto dark:bg-black bg-gray-50 transition-colors">
          <div className={`p-6 lg:p-10 ${activeTab === 'home' ? 'max-w-screen-xl mx-auto' : 'max-w-4xl mx-auto'}`}>
            <AnimatePresence mode="wait">
              {activeTab === 'home' && (
                <motion.section key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center pb-24">
                  <HomeHero inputUrl={inputUrl} setInputUrl={setInputUrl} onStart={handleStartFromHero} />
                  <div className="w-full max-w-md space-y-8">
                    {snippets.length > 0 ? snippets.map((snippet) => (
                      <SnippetSocialCard key={snippet.id} snippet={snippet} onReact={(reactionType) => handleReaction(snippet.id, reactionType)} isSaved={savedSnippets.includes(snippet.id)} onSave={() => handleToggleSave(snippet.id)} onCopy={handleCopy} />
                    )) : <div className="text-center py-40 dark:text-gray-600 text-gray-400 font-medium italic">Henüz keşfedilmeyi bekleyen bir an yok.</div>}
                  </div>
                </motion.section>
              )}

              {activeTab === 'explore' && (
                <motion.section key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
                  <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400 w-5 h-5" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Yeni bir an, küratör veya kategori bul..." className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand/30 transition-all font-medium dark:text-white text-black" /></div>
                  {!searchQuery && <div className="space-y-4"><h3 className="text-sm font-strong dark:text-white text-black uppercase tracking-[0.2em] italic flex items-center gap-2"><Trophy className="w-4 h-4 text-brand" /> HAFTANIN KÜRATÖRLERİ</h3><div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x">{['rock_tanrisi', 'felsefe_kulubu', 'film_gurmesi', 'spor_arsivi'].map((name, index) => <div key={name} className="flex-shrink-0 snap-center dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5 rounded-2xl p-4 w-40 flex flex-col items-center text-center"><img src={`https://i.pravatar.cc/150?u=${name}`} alt={name} className="w-16 h-16 rounded-full border-2 border-brand mb-3 object-cover" /><span className="font-strong text-sm truncate w-full">{name}</span><span className="text-[10px] text-brand uppercase tracking-widest mt-1">Curator</span><span className="text-xs dark:text-gray-500 text-gray-500 font-bold mt-3">{120 - index * 22} Snippets</span></div>)}</div></div>}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filteredSnippets.map((snippet) => <button key={snippet.id} type="button" className="aspect-square relative group overflow-hidden rounded-md cursor-pointer" onClick={() => setActiveTab('home')}><img src={getSnippetThumbnail(snippet)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="grid" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold"><Bookmark className="w-4 h-4 fill-white mr-1" /> {snippet.likesCount}</div></button>)}
                  </div>
                </motion.section>
              )}

              {activeTab === 'create' && (
                <motion.section key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="relative overflow-hidden bg-white dark:bg-gray-950 border dark:border-white/5 border-black/5 rounded-[2.5rem] p-6 md:p-12 mb-8 shadow-[0_30px_100px_-60px_rgba(0,0,0,0.5)] flex flex-col transition-colors">
                    <div className="absolute left-0 top-0 h-1.5 w-full bg-[#E10600]" />
                    <div className="relative z-10 space-y-8 w-full max-w-3xl mx-auto">
                      <div className="space-y-4 text-center"><h2 className="text-4xl md:text-5xl font-strong italic leading-[0.9] uppercase tracking-tighter dark:text-white text-black">HİSSİYATI <br /> <span className="text-brand">ANINDA</span> YAKALA.</h2><p className="dark:text-gray-400 text-gray-500 font-medium text-lg">Favori anını sticker veya kesit olarak paylaş.</p></div>
                      <div className="flex flex-col md:flex-row dark:bg-black/60 bg-white/60 border dark:border-white/10 border-black/10 rounded-2xl p-2 focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10 transition-all shadow-2xl items-stretch"><div className="flex-1 flex items-center px-4 py-3"><LinkIcon className="w-6 h-6 text-brand mr-4" /><input type="text" placeholder="YouTube veya Spotify linkini yapıştır..." className="flex-1 bg-transparent outline-none font-bold text-lg dark:placeholder:text-gray-700 placeholder:text-gray-400 dark:text-white text-black" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} /></div><button onClick={handleStartFromHero} disabled={!inputUrl.trim()} type="button" className="bg-brand text-white px-10 py-4 rounded-xl font-strong uppercase tracking-[0.2em] shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100">Oluştur</button></div>

                      {inputUrl && !parsedMedia && <p className="text-sm text-red-500 text-center font-bold">Geçerli bir YouTube veya Spotify linki gir.</p>}

                      {generatedLinks && <div className="space-y-4 animate-in slide-in-from-top-2 duration-500 pt-4 border-t dark:border-white/10 border-black/10 text-left"><p className="text-[10px] font-strong text-brand uppercase tracking-widest text-center">Hızlı Link Oluşturucu</p><div className="grid grid-cols-1 md:grid-cols-3 gap-2">{generatedLinks.yt && <ResultRow icon={<Youtube className="text-red-500" />} title="YouTube Link" link={generatedLinks.yt} onCopy={() => handleCopy(generatedLinks.yt!)} isCopied={copiedLink === generatedLinks.yt} />}{generatedLinks.ytm && <ResultRow icon={<PlayCircle className="text-red-500" />} title="Premium/Music" link={generatedLinks.ytm} onCopy={() => handleCopy(generatedLinks.ytm!)} isCopied={copiedLink === generatedLinks.ytm} />}{generatedLinks.spot && <ResultRow icon={<Music className="text-green-500" />} title="Spotify Link" link={generatedLinks.spot} onCopy={() => handleCopy(generatedLinks.spot!)} isCopied={copiedLink === generatedLinks.spot} />}</div></div>}

                      {parsedMedia?.platform === 'youtube' && <div className="space-y-6 pt-6 border-t dark:border-white/5 border-black/5 animate-in fade-in duration-700"><p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Zaman Ayarlı Kesit Oluştur</p><YouTubeClipper videoId={parsedMedia.id} onMarkStart={setStartSec} onMarkEnd={setEndSec} start={startSec} end={endSec} /></div>}

                      {parsedMedia && <div className="space-y-4 pt-4 border-t dark:border-white/5 border-black/5"><textarea className="w-full dark:bg-black/30 bg-black/5 border dark:border-white/5 border-black/5 rounded-2xl p-4 h-32 outline-none focus:border-brand/30 transition-all font-medium dark:text-white text-black" placeholder="Bu an hakkında bir küratör notu bırak..." value={userComment} onChange={(e) => setUserComment(e.target.value)} /><div className="flex flex-wrap gap-2">{['#felsefe', '#spor', '#motivasyon', '#komik', '#müzik'].map((category) => <button key={category} type="button" onClick={() => setSnippetCategory(category)} className={`px-4 py-2 rounded-full text-[10px] font-bold border transition-colors ${snippetCategory === category ? 'bg-brand text-white border-brand' : 'dark:border-white/10 border-black/10 dark:text-gray-500 text-gray-500 hover:bg-black/5 dark:hover:bg-white/5'}`}>{category}</button>)}</div><button onClick={handleCreateSnippet} disabled={!userComment.trim()} type="button" className="w-full py-5 bg-brand text-white font-strong rounded-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">PAYLAŞ</button></div>}

                      {!user && !parsedMedia && <button onClick={handleLogin} type="button" className="w-full py-5 dark:bg-white dark:text-black bg-black text-white font-strong rounded-2xl uppercase tracking-widest shadow-lg dark:shadow-white/5">GİRİŞ YAP VE BAŞLA</button>}
                    </div>
                  </div>
                </motion.section>
              )}

              {activeTab === 'saved' && (
                <motion.section key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  <div><h2 className="text-4xl font-strong italic uppercase tracking-tight">Kaydedilenler</h2><p className="dark:text-gray-500 text-gray-500 font-medium mt-2">Favori anlarını burada tut.</p></div>
                  {user ? savedItems.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{savedItems.map((snippet) => <SnippetSocialCard key={snippet.id} snippet={snippet} onReact={(reactionType) => handleReaction(snippet.id, reactionType)} isSaved onSave={() => handleToggleSave(snippet.id)} onCopy={handleCopy} />)}</div> : <div className="flex flex-col items-center justify-center py-32 px-4 text-center"><div className="w-24 h-24 dark:bg-white/5 bg-black/5 rounded-full flex items-center justify-center mb-8 border dark:border-white/10 border-black/10 shadow-2xl"><Bookmark className="w-10 h-10 dark:text-white/50 text-black/50" /></div><h3 className="text-2xl font-strong italic uppercase tracking-tight mb-2">Henüz kaydedilen yok</h3><p className="dark:text-gray-500 text-gray-500 max-w-sm">Feed’deki bookmark ikonuyla anları kaydedebilirsin.</p></div> : <div className="text-center py-32"><button onClick={handleLogin} type="button" className="px-8 py-4 bg-brand text-white rounded-2xl font-strong uppercase tracking-widest">Giriş Yap</button></div>}
                </motion.section>
              )}

              {activeTab === 'profile' && (
                <motion.section key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  {user ? <><header className="flex flex-col md:flex-row items-center md:items-start gap-8 px-4 py-12 lg:gap-14 lg:px-6"><div className="relative shrink-0 group"><div className="absolute -inset-1 bg-gradient-to-tr from-brand to-red-500 rounded-full blur opacity-40" /><img src={user.photoURL || 'https://via.placeholder.com/150'} alt="user" className="relative w-28 h-28 md:w-40 md:h-40 rounded-full border-4 dark:border-black border-white object-cover shadow-2xl" /></div><div className="flex-1 text-center md:text-left space-y-6"><div><h2 className="text-3xl md:text-4xl font-black tracking-tight dark:text-white text-black flex items-center justify-center md:justify-start gap-3">{user.displayName || 'Olinkbu Curator'}<CheckCircle2 className="w-6 h-6 text-blue-500 fill-current" /></h2><p className="dark:text-gray-500 text-gray-500 font-medium mt-1">{user.email}</p></div><div className="flex justify-center md:justify-start gap-8"><div><span className="font-bold text-xl">{snippets.filter((s) => s.userId === user.uid).length}</span><p className="text-xs dark:text-gray-500 text-gray-500 uppercase font-bold tracking-widest">An</p></div><div><span className="font-bold text-xl">{savedSnippets.length}</span><p className="text-xs dark:text-gray-500 text-gray-500 uppercase font-bold tracking-widest">Kayıt</p></div><div><span className="font-bold text-xl">{isAdmin ? 'Admin' : 'User'}</span><p className="text-xs dark:text-gray-500 text-gray-500 uppercase font-bold tracking-widest">Rol</p></div></div></div></header><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{snippets.filter((snippet) => snippet.userId === user.uid).map((snippet) => <SnippetSocialCard key={snippet.id} snippet={snippet} onReact={(reactionType) => handleReaction(snippet.id, reactionType)} isSaved={savedSnippets.includes(snippet.id)} onSave={() => handleToggleSave(snippet.id)} onCopy={handleCopy} />)}</div></> : <div className="flex flex-col items-center justify-center py-32 px-4 text-center"><div className="w-24 h-24 dark:bg-white/5 bg-black/5 rounded-full flex items-center justify-center mb-8 border dark:border-white/10 border-black/10 shadow-2xl"><UserIcon className="w-10 h-10 dark:text-white/50 text-black/50" /></div><h3 className="text-2xl font-strong italic uppercase tracking-tight mb-2">Profilin seni bekliyor</h3><p className="dark:text-gray-500 text-gray-500 max-w-sm mb-8">Anlarını kaydetmek ve paylaşmak için giriş yap.</p><button onClick={handleLogin} type="button" className="px-8 py-4 bg-brand text-white rounded-2xl font-strong uppercase tracking-widest">Google ile Giriş Yap</button></div>}
                </motion.section>
              )}

              {activeTab === 'settings' && (
                <motion.section key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  <div><h2 className="text-4xl font-strong italic uppercase tracking-tight">Ayarlar</h2><p className="dark:text-gray-500 text-gray-500 font-medium mt-2">Deneyimini düzenle.</p></div>
                  <div className="space-y-4"><button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} type="button" className="w-full flex items-center justify-between p-5 rounded-2xl dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5"><span className="font-bold">Tema</span><span>{theme === 'dark' ? 'Koyu' : 'Açık'}</span></button><button onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')} type="button" className="w-full flex items-center justify-between p-5 rounded-2xl dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5"><span className="font-bold">Dil</span><span>{lang.toUpperCase()}</span></button></div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
      <Toast message={toast} />
    </div>
  );
}
