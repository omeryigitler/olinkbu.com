import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { 
  Play, 
  Youtube, 
  Music, 
  Copy, 
  Share2, 
  Instagram, 
  Clock, 
  CheckCircle2, 
  User as UserIcon, 
  LogOut, 
  X, 
  Sparkles,
  Link as LinkIcon,
  Shield,
  PlayCircle,
  Menu,
  Moon,
  Sun,
  Globe,
  Settings,
  Bookmark,
  MessageSquare,
  Heart,
  ExternalLink,
  Check,
  Camera,
  Home,
  Compass,
  PlusSquare,
  Search,
  Bell,
  Send,
  MoreVertical,
  Volume2,
  Trophy,
  Flame,
  Eye
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, deleteDoc, doc, onSnapshot, serverTimestamp, orderBy, limit, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// --- TYPES ---
type Lang = 'en' | 'tr';
type Theme = 'dark' | 'light';
type Platform = 'youtube' | 'spotify';

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
  reactions: { lightbulb: number; deep: number; fire: number; inspire: number };
  createdAt: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Firestore Error [${operationType}] on ${path}:`, error);
}

// --- UTILS ---
function formatSecondsToMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function parseInputUrl(url: string) {
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const ytMatch = url.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    return { platform: 'youtube', id: ytMatch[2] };
  }
  const spotRegExp = /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/;
  const spotMatch = url.match(spotRegExp);
  if (spotMatch) {
    return { platform: 'spotify', id: spotMatch[1] };
  }
  return { platform: null, id: null };
}

// --- COMPONENTS ---

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-6 px-4 py-3 rounded-xl transition-all ${active ? 'dark:bg-white/10 bg-black/10 dark:text-white text-black font-bold shadow-lg dark:shadow-white/5 shadow-black/5' : 'dark:text-gray-400 text-gray-500 dark:hover:bg-white/5 hover:bg-black/5 dark:hover:text-white hover:text-black'}`}>
    <div className={`shrink-0 transition-transform ${active ? 'scale-110 dark:text-white text-black' : 'dark:text-gray-500 text-gray-400'}`}>{icon}</div>
    <span className="text-sm truncate font-medium">{label}</span>
  </button>
);

const ResultRow = ({ icon, title, link, onCopy, isCopied }: any) => (
  <div className="flex items-center justify-between p-4 dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5 rounded-2xl group hover:border-brand/30 transition-all">
    <div className="flex items-center gap-4">
      {icon}
      <div>
        <p className="text-[10px] font-strong uppercase tracking-widest dark:text-gray-500 text-gray-600">{title}</p>
        <p className="text-xs font-mono dark:text-gray-400 text-gray-600 truncate max-w-[150px]">{link}</p>
      </div>
    </div>
    <button 
      onClick={onCopy}
      className={`p-3 rounded-xl transition-all ${isCopied ? 'bg-green-500/20 text-green-500' : 'bg-brand/10 text-brand hover:bg-brand hover:text-black'}`}
    >
      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  </div>
);

const YouTubeClipper = ({ videoId, onMarkStart, onMarkEnd, start, end }: any) => {
  const [player, setPlayer] = useState<any>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((window as any).YT && (window as any).YT.Player) {
      const p = new (window as any).YT.Player(playerRef.current, {
        videoId: videoId,
        playerVars: { 
          autoplay: 0,
          modestbranding: 1,
          rel: 0
        },
        events: {
          onReady: (event: any) => setPlayer(event.target)
        }
      });
      return () => p.destroy();
    }
  }, [videoId]);

  const handleMark = (type: 'start' | 'end') => {
    if (!player) return;
    const time = player.getCurrentTime();
    if (type === 'start') onMarkStart(time);
    else onMarkEnd(time);
  };

  return (
    <div className="space-y-4">
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border dark:border-white/5 border-black/5">
        <div ref={playerRef} className="w-full h-full" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => handleMark('start')}
          className="flex items-center justify-center gap-3 p-4 dark:bg-white/5 bg-black/5 border border-brand/30 rounded-xl hover:bg-brand/10 transition-all text-brand font-bold uppercase tracking-widest text-sm"
        >
          <PlayCircle className="w-4 h-4" /> Start: {formatSecondsToMMSS(start)}
        </button>
        <button 
          onClick={() => handleMark('end')}
          className="flex items-center justify-center gap-3 p-4 dark:bg-white/5 bg-black/5 border border-brand/30 rounded-xl hover:bg-brand/10 transition-all text-brand font-bold uppercase tracking-widest text-sm"
        >
          <PlayCircle className="w-4 h-4" /> End: {formatSecondsToMMSS(end)}
        </button>
      </div>
    </div>
  );
};

interface SnippetSocialCardProps {
  snippet: Snippet;
  theme: Theme;
  onLike: () => any;
  isSaved?: boolean;
  onSave?: () => void;
  key?: any;
}

const SnippetSocialCard = ({ snippet, theme, onLike, isSaved, onSave }: SnippetSocialCardProps) => {
  const [showInstaKit, setShowInstaKit] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * VIRAL LOOP LOGIC: Instagram Story Kit
   */
  const generateInstaImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, 1080, 1920);

    // Media Gradient Backer
    const grad = ctx.createLinearGradient(0, 400, 0, 1480);
    grad.addColorStop(0, '#111');
    grad.addColorStop(1, '#000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 400, 1080, 1080);
    
    // Brand Header
    ctx.fillStyle = '#1DB954';
    ctx.font = 'bold 80px Inter';
    ctx.fillText('OLINKBU', 60, 150);

    // Strava-style Data Overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    // Note: roundRect is supported in modern browsers
    if (ctx.roundRect) {
      ctx.roundRect(620, 1280, 400, 160, 40);
    } else {
      ctx.rect(620, 1280, 400, 160);
    }
    ctx.fill();
    
    ctx.fillStyle = '#1DB954';
    ctx.font = 'bold 25px Inter';
    ctx.fillText('STAMPED MOMENT', 660, 1330);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 70px Inter';
    ctx.fillText(formatSecondsToMMSS(snippet.startSec), 660, 1410);

    // Category Badge
    ctx.fillStyle = '#FF0000';
    if (ctx.roundRect) {
      ctx.roundRect(60, 460, 300, 70, 15);
    } else {
      ctx.rect(60, 460, 300, 70);
    }
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px Inter';
    ctx.fillText(snippet.category.toUpperCase().replace('#', ''), 100, 508);

    // Caption
    ctx.fillStyle = 'white';
    ctx.font = 'italic 50px Inter';
    const words = (snippet.comment || '').split(' ');
    let line = '';
    let y = 1580;
    for(let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      if (testLine.length > 25) {
        ctx.fillText(line, 60, y);
        line = words[n] + ' ';
        y += 75;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 60, y);

    // Footer
    ctx.fillStyle = '#1DB954';
    ctx.font = 'bold 35px Inter';
    ctx.fillText('TAP LINK STICKER TO WATCH FULL MOMENT', 60, 1850);
  };

  useEffect(() => {
    if (showInstaKit) setTimeout(generateInstaImage, 100);
  }, [showInstaKit]);

  const openVideo = () => {
    const url = `${snippet.videoUrl || 'https://youtu.be/' + snippet.videoId}${snippet.startSec ? '?t=' + snippet.startSec : ''}`;
    window.open(url, '_blank');
  };

  const thumbnailUrl = snippet.platform === 'spotify' 
    ? `https://i.scdn.co/image/${snippet.videoId}` // This is a placeholder, real Spotify thumbnails need API. I'll use a better fallback.
    : `https://img.youtube.com/vi/${snippet.videoId}/maxresdefault.jpg`;

  const finalThumbnail = snippet.platform === 'spotify'
    ? 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800' // Generic Spotify style
    : thumbnailUrl;

  return (
    <div className="group relative flex flex-col mb-4 cursor-pointer">
      {/* Thumbnail with duration and Olinkbu overlay */}
      <div 
        onClick={openVideo}
        className="relative aspect-video w-full rounded-xl overflow-hidden bg-gray-900 group/media shadow-lg"
      >
        <img 
          src={finalThumbnail} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          alt="thumbnail" 
        />
        <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white z-10">
          {formatSecondsToMMSS(snippet.startSec)}
        </div>
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/media:bg-black/30 transition-all">
          <div className="opacity-0 group-hover/media:opacity-100 transition-all scale-75 group-hover/media:scale-100">
            <div className="bg-brand rounded-full p-4 shadow-xl">
              <Play className="fill-black w-8 h-8 text-black" />
            </div>
          </div>
        </div>

        {/* Brand Overlay (Strava style) */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-brand px-2 py-1 rounded-md shadow-lg">
          <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
          <span className="text-[8px] font-strong text-black tracking-widest uppercase">{snippet.category.replace('#', '')}</span>
        </div>
      </div>

      {/* Info Section */}
      <div className="flex gap-3 mt-3 px-1">
        <img src={snippet.userPhoto} className="w-9 h-9 rounded-full shrink-0 border dark:border-white/10 border-black/10" alt="avatar" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-1 dark:text-white text-gray-900 group-hover:text-brand transition-colors">
            {snippet.comment || 'Untitled Snippet'}
          </h3>
          <div className="flex items-center gap-1.5 mb-1.5">
             <div className="flex -space-x-1.5">
                <img src="https://i.pravatar.cc/150?u=1" className="w-4 h-4 rounded-full border border-black" alt="user" />
                <img src="https://i.pravatar.cc/150?u=2" className="w-4 h-4 rounded-full border border-black" alt="user" />
             </div>
             <span className="text-[10px] dark:text-gray-500 text-gray-500 font-medium">rock_tanrisi ve 2 arkadaşın daha kaydetti</span>
          </div>
          <div className="flex flex-col text-[12px] dark:text-gray-500 text-gray-600 font-medium">
            <span className="flex items-center gap-1 dark:hover:text-white hover:text-gray-900 transition-colors">
              {snippet.userName} <CheckCircle2 className="w-3 h-3 text-blue-500 fill-current" />
            </span>
            <div className="flex items-center gap-3 mt-1.5 underline-offset-4 overflow-x-auto scrollbar-hide">
              <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="flex items-center gap-1 hover:text-brand transition-colors bg-white/5 px-2 py-1 rounded-full border border-white/5">
                <span className="text-xs">💡</span>
                <span className="text-[10px] font-bold">{snippet.reactions?.lightbulb || 0}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="flex items-center gap-1 hover:text-brand transition-colors bg-white/5 px-2 py-1 rounded-full border border-white/5">
                <span className="text-xs">🌌</span>
                <span className="text-[10px] font-bold">{snippet.reactions?.deep || 0}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="flex items-center gap-1 hover:text-brand transition-colors bg-white/5 px-2 py-1 rounded-full border border-white/5">
                <span className="text-xs">🚀</span>
                <span className="text-[10px] font-bold">{snippet.reactions?.inspire || 0}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }} className="flex items-center gap-1 hover:text-brand transition-colors ml-2">
                <MessageSquare className="w-3 h-3" />
                <span className="text-[10px] font-bold">12</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }} className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                <Send className="w-3 h-3 -rotate-45" />
              </button>
              {onSave && (
                 <button onClick={(e) => { e.stopPropagation(); onSave(); }} className={`flex items-center gap-1 transition-colors ${isSaved ? 'text-brand' : 'hover:text-brand'}`}>
                    <Bookmark className={`w-3 h-3 ${isSaved ? 'fill-brand' : ''}`} />
                 </button>
              )}
            </div>
          </div>
        </div>
        <button className="self-start dark:text-gray-500 text-gray-400 dark:hover:text-white hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-all">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Mini Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-1"
          >
            <div className="pt-4 space-y-3 border-t dark:border-white/5 border-black/5 mt-2">
              <div className="flex gap-2 text-[11px]">
                <div className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center shrink-0">Y</div>
                <div className="flex-1">
                  <span className="font-bold dark:text-gray-300 text-gray-700 mr-2">yigitleromer</span>
                  <span className="dark:text-gray-400 text-gray-600">Harika bir yakalama! Paylaşım için teşekkürler.</span>
                </div>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Yorum ekle..." className="flex-1 dark:bg-white/5 bg-black/5 rounded-lg px-3 py-1.5 text-[11px] outline-none border border-transparent focus:border-brand/30 dark:text-white text-black" />
                <button className="text-brand p-1.5"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal & Insta Kit Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl p-8 border border-white/10"
            >
              <h3 className="text-xl font-strong italic mb-6 uppercase tracking-tight">Paylaş</h3>
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => { setShowShareModal(false); setShowInstaKit(true); }}
                  className="flex items-center gap-4 p-5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-2xl font-bold transition-transform active:scale-95"
                >
                  <Instagram className="w-6 h-6" />
                  <span className="flex-1 text-left">Instagram Story Kit</span>
                  <ExternalLink className="w-4 h-4 opacity-50" />
                </button>
                <button 
                  onClick={() => {
                    const url = `${snippet.videoUrl}?t=${snippet.startSec}`;
                    navigator.clipboard.writeText(url);
                    alert('Link kopyalandı!');
                    setShowShareModal(false);
                  }}
                  className="flex items-center gap-4 p-5 bg-white/10 text-white rounded-2xl font-bold transition-transform active:scale-95"
                >
                  <Copy className="w-6 h-6" />
                  <span className="flex-1 text-left">Linki Kopyala</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showInstaKit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl w-full"
            >
              <div className="space-y-8 flex flex-col justify-center">
                <h2 className="text-5xl font-strong text-white uppercase italic tracking-tighter leading-none">INSTAGRAM <br/> STORY KIT</h2>
                <p className="text-gray-400 font-medium text-lg leading-relaxed">Bu görseli indirip hikayende paylaş, ardından linki kopyalayıp "Link Çıkartması" olarak ekle.</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-6 bg-brand/10 border border-brand/20 rounded-2xl">
                    <div className="p-3 bg-brand rounded-full text-black"><Copy className="w-6 h-6" /></div>
                    <div>
                      <p className="text-white font-bold">Adım 1: Linki Kopyala</p>
                      <p className="text-xs text-brand uppercase font-bold tracking-widest">Hikaye için linki hafızaya al</p>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(`${snippet.videoUrl}?t=${snippet.startSec}`)} className="ml-auto p-2 hover:bg-brand/20 rounded-lg transition-colors text-brand">
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const dataUrl = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.download = `olinkbu-story-${snippet.id}.png`;
                    link.href = dataUrl;
                    link.click();
                  }} className="flex-1 py-5 bg-brand text-black font-strong text-xl tracking-widest rounded-2xl hover:scale-105 transition-transform uppercase">GÖRSELİ İNDİR</button>
                  <button onClick={() => setShowInstaKit(false)} className="px-10 py-5 bg-white/10 text-white font-strong text-xl tracking-widest rounded-2xl hover:bg-white/20 transition-all uppercase">KAPAT</button>
                </div>
              </div>
              <div className="relative aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(29,185,84,0.2)] border border-white/10 mx-auto w-full max-w-[350px]">
                <canvas ref={canvasRef} width="1080" height="1920" className="w-full h-full object-contain" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SponsoredPost = () => (
  <div className="bg-white/5 border border-white/5 p-6 mb-12 lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-6">
       <span className="text-[10px] font-strong text-brand bg-brand/10 border border-brand/20 px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-brand/10">Sponsored</span>
    </div>
    
    <div className="flex items-center gap-4 mb-6">
      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand to-green-300 flex items-center justify-center text-black font-strong text-xl shadow-lg shadow-brand/20">A</div>
      <div>
        <h4 className="text-sm font-strong uppercase tracking-widest text-white leading-none">Adidas Originals</h4>
        <span className="text-[10px] text-gray-500 font-medium tracking-tight">Promoted by Adidas Media</span>
      </div>
    </div>

    <div className="aspect-video bg-gray-900 rounded-3xl overflow-hidden mb-6 relative group/card">
       <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover opacity-60 group-hover/card:scale-105 transition-transform duration-1000" alt="ad" />
       <div className="absolute inset-0 p-10 flex flex-col justify-end bg-gradient-to-t from-black via-black/40 to-transparent">
          <div className="max-w-md">
            <h2 className="text-4xl lg:text-5xl font-strong italic leading-none mb-4 uppercase tracking-tighter text-white drop-shadow-2xl">LIMITS ARE <br/>FOR OTHERS</h2>
            <p className="text-sm text-gray-300 mb-6 font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">Yeni sezon sneaker koleksiyonu ile tanış. Rahatlık ve stilin mükemmel uyumu artık seninle.</p>
            <button className="w-full py-5 bg-white text-black font-strong uppercase rounded-2xl tracking-tighter shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">Şimdi Keşfet</button>
          </div>
       </div>
    </div>
  </div>
);

const translations = {
  en: {
    nav: { home: 'Home', explore: 'Explore', create: 'Create', profile: 'Profile', saved: 'Saved', settings: 'Settings' },
    auth: { login: 'LOGIN', logout: 'LOGOUT' },
    footer: 'Olinkbu Media'
  },
  tr: {
    nav: { home: 'Ana Sayfa', explore: 'Keşfet', create: 'Oluştur', profile: 'Profil', saved: 'Kaydedilenler', settings: 'Ayarlar', subscriptions: 'Abonelikler', shorts: 'Shorts', history: 'Geçmiş', videos: 'Videolarınız', watchLater: 'Daha sonra izle', liked: 'Beğenilen videolar' },
    auth: { login: 'GİRİŞ YAP', logout: 'ÇIKIŞ YAP' },
    footer: 'Olinkbu Medya'
  }
};

const Header = ({ user, onLogin }: any) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-24 dark:bg-black/80 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-[60] border-b dark:border-white/5 border-black/5 transition-colors">
      <div className="flex items-center gap-4 cursor-pointer group">
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
          <img 
            src="/logo2.png" 
            className="w-[150%] h-[150%] max-w-none group-hover:scale-110 transition-transform object-contain pointer-events-none drop-shadow-2xl" 
            alt="Olinkbu" 
          />
        </div>
        <span className="font-strong text-3xl sm:text-4xl tracking-tighter uppercase dark:text-white text-black flex items-center mt-1">
          Olinkbu<sup className="text-[12px] sm:text-[14px] ml-1 opacity-60 font-bold">PRO</sup>
        </span>
      </div>

    <div className="flex items-center gap-4">
      {user ? (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold dark:text-white text-gray-900">{user.displayName}</p>
            <p className="text-[10px] text-gray-500 font-medium">Küratör</p>
          </div>
          <img src={user.photoURL} className="w-10 h-10 rounded-full border-2 border-brand/20 p-0.5" alt="avatar" />
        </div>
      ) : (
        <button onClick={onLogin} className="px-6 py-2.5 dark:bg-white dark:text-black bg-black text-white rounded-xl text-sm font-strong uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
          GİRİŞ YAP
        </button>
      )}
    </div>
    </header>
  );
};

// Category Chips logic removed to simplify UI


// --- MOCK DATA ---
const MOCK_SNIPPETS: Snippet[] = [
  { id: '1', userId: 'mock', userName: 'rock_tanrisi', userPhoto: 'https://i.pravatar.cc/150?u=rock', videoUrl: 'https://youtu.be/xJ7uJvXWofA', videoId: 'xJ7uJvXWofA', platform: 'youtube', startSec: 270, endSec: 300, comment: 'Comfortably Numb - Efsane Solo: Tüylerim her seferinde diken diken oluyor. Pink Floyd\'un zirvesi.', category: '🎸 Music Hunter', likesCount: 12450, reactions: { lightbulb: 120, deep: 50, fire: 400, inspire: 300 }, createdAt: Date.now() },
  { id: '2', userId: 'mock', userName: 'film_gurmesi', userPhoto: 'https://i.pravatar.cc/150?u=film', videoUrl: 'https://youtu.be/8mOOXqYyMVA', videoId: '8mOOXqYyMVA', platform: 'youtube', startSec: 88, endSec: 118, comment: 'The Matrix - Kurşunlardan Kaçış: Sinema tarihinin değiştiği o saniye. Bullet time!', category: '🎬 Cinema Eye', likesCount: 9820, reactions: { lightbulb: 500, deep: 80, fire: 600, inspire: 200 }, createdAt: Date.now() },
  { id: '3', userId: 'mock', userName: 'motivasyon_merkezi', userPhoto: 'https://i.pravatar.cc/150?u=moti', videoUrl: 'https://youtu.be/UF8uR6Z6KLc', videoId: 'UF8uR6Z6KLc', platform: 'youtube', startSec: 868, endSec: 898, comment: 'Steve Jobs - Stay Hungry: Stanford konuşmasının vurucu sonu. Her sabah dinlemelik.', category: '💡 Motivation Collector', likesCount: 15600, reactions: { lightbulb: 1200, deep: 400, fire: 300, inspire: 2500 }, createdAt: Date.now() },
  { id: '4', userId: 'mock', userName: 'spor_arsivi', userPhoto: 'https://i.pravatar.cc/150?u=spor', videoUrl: 'https://youtu.be/qQYz0I5dE_A', videoId: 'qQYz0I5dE_A', platform: 'youtube', startSec: 150, endSec: 180, comment: 'Kobe Bryant - Mamba Out: 60 sayı attığı son maç ve o tüyler ürperten veda...', category: '🔥 Chaos Energy', likesCount: 22100, reactions: { lightbulb: 50, deep: 800, fire: 2000, inspire: 1500 }, createdAt: Date.now() },
  { id: '5', userId: 'mock', userName: 'nostalji_duraği', userPhoto: 'https://i.pravatar.cc/150?u=nost', videoUrl: 'https://youtu.be/aR1z8kRj3A0', videoId: 'aR1z8kRj3A0', platform: 'youtube', startSec: 75, endSec: 105, comment: 'Ezel - Ramiz Dayı Sadakat: Sadakat sırf sevmek değildir... Türk dizi tarihinin en iyi tiradı.', category: '🌌 Deep Thinker', likesCount: 8450, reactions: { lightbulb: 300, deep: 1200, fire: 100, inspire: 400 }, createdAt: Date.now() },
  { id: '6', userId: 'mock', userName: 'jazz_lover', userPhoto: 'https://i.pravatar.cc/150?u=jazz', videoUrl: 'https://youtu.be/ZZY-Ytrw2co', videoId: 'ZZY-Ytrw2co', platform: 'youtube', startSec: 425, endSec: 455, comment: 'Whiplash - Final Sahnesi: Not My Tempo! Kan, ter ve mükemmeliyetçilik.', category: '🎬 Cinema Eye', likesCount: 11200, reactions: { lightbulb: 150, deep: 200, fire: 900, inspire: 800 }, createdAt: Date.now() },
  { id: '7', userId: 'mock', userName: 'felsefe_kulubu', userPhoto: 'https://i.pravatar.cc/150?u=fels', videoUrl: 'https://youtu.be/GO5FwsblpT8', videoId: 'GO5FwsblpT8', platform: 'youtube', startSec: 65, endSec: 95, comment: 'Carl Sagan - Soluk Mavi Nokta: Tüm dertlerimizin ne kadar anlamsız olduğunu anlatan o eşsiz evren tasviri.', category: '🌌 Deep Thinker', likesCount: 14300, reactions: { lightbulb: 2000, deep: 3000, fire: 50, inspire: 1800 }, createdAt: Date.now() },
  { id: '8', userId: 'mock', userName: 'hiphop_head', userPhoto: 'https://i.pravatar.cc/150?u=rap', videoUrl: 'https://youtu.be/XbGs_qK2PQA', videoId: 'XbGs_qK2PQA', platform: 'youtube', startSec: 265, endSec: 295, comment: 'Eminem - Rap God (Fast Part): Nefes almadan saniyelerce kelime kusmak. Gerçek bir makine.', category: '🔥 Chaos Energy', likesCount: 19500, reactions: { lightbulb: 80, deep: 20, fire: 3500, inspire: 400 }, createdAt: Date.now() },
  { id: '9', userId: 'mock', userName: 'komedi_dukkani', userPhoto: 'https://i.pravatar.cc/150?u=komik', videoUrl: 'https://youtu.be/Jv47iK2fKx4', videoId: 'Jv47iK2fKx4', platform: 'youtube', startSec: 45, endSec: 75, comment: 'G.O.R.A - Komutan Logar: Bir cisim yaklaşıyor efendim! Klasik Cem Yılmaz esprisi.', category: '😂 Chaos Energy', likesCount: 32000, reactions: { lightbulb: 100, deep: 10, fire: 2000, inspire: 50 }, createdAt: Date.now() },
  { id: '10', userId: 'mock', userName: 'futbol_asigi', userPhoto: 'https://i.pravatar.cc/150?u=messi', videoUrl: 'https://youtu.be/sA3B0EXkZ-w', videoId: 'sA3B0EXkZ-w', platform: 'youtube', startSec: 12, endSec: 42, comment: 'Ankara Messi: Spikerin çıldırdığı, Messi\'nin efsaneleştiği o tarihi an.', category: '⚡ Chaos Energy', likesCount: 28400, reactions: { lightbulb: 50, deep: 100, fire: 4000, inspire: 1000 }, createdAt: Date.now() },
];

export default function App() {
  const [lang, setLang] = useState<Lang>('tr');
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'create' | 'profile' | 'saved' | 'settings'>('home');
  const [profileTab, setProfileTab] = useState<'all' | 'music' | 'video'>('all');
  const [snippets, setSnippets] = useState<Snippet[]>(MOCK_SNIPPETS);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [privacyPrivate, setPrivacyPrivate] = useState(false);
  const [savedSnippets, setSavedSnippets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('olinkbu_saved');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const handleToggleSave = (snippetId: string) => {
    if (!user) return handleLogin();
    setSavedSnippets(prev => {
      const next = prev.includes(snippetId) ? prev.filter(id => id !== snippetId) : [...prev, snippetId];
      localStorage.setItem('olinkbu_saved', JSON.stringify(next));
      return next;
    });
  };

  const [inputUrl, setInputUrl] = useState('');
  const [clipVideoId, setClipVideoId] = useState<string | null>(null);
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [snippetCategory, setSnippetCategory] = useState('#felsefe');
  
  const [generatedLinks, setGeneratedLinks] = useState<{ yt?: string; ytm?: string; spot?: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAdmin(currentUser?.email === 'yigitleromer@gmail.com');
    });
    
    const q = query(collection(db, 'snippets'), orderBy('createdAt', 'desc'), limit(30));
    const unsubFeed = onSnapshot(q, (snapshot) => {
      const firestoreSnippets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Snippet));
      setSnippets(firestoreSnippets.length > 0 ? firestoreSnippets : MOCK_SNIPPETS);
    });

    return () => { unsubAuth(); unsubFeed(); };
  }, []);

  const handleLogin = async () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const res = parseInputUrl(inputUrl);
    if (res.platform === 'youtube' && res.id) {
      setClipVideoId(res.id);
      const timeParam = startSec > 0 ? `&t=${startSec}` : '';
      setGeneratedLinks({
        yt: `https://youtu.be/${res.id}${timeParam}`,
        ytm: `https://music.youtube.com/watch?v=${res.id}${timeParam}`
      });
    } else if (res.platform === 'spotify' && res.id) {
      setClipVideoId(null);
      setGeneratedLinks({
        spot: `https://open.spotify.com/track/${res.id}`
      });
    } else {
      setClipVideoId(null);
      setGeneratedLinks(null);
    }
  }, [inputUrl, startSec]);

  const handleCopy = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleCreateSnippet = async () => {
    if (!user || !clipVideoId) return;
    try {
      await addDoc(collection(db, 'snippets'), {
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        videoUrl: `https://youtu.be/${clipVideoId}`,
        videoId: clipVideoId,
        platform: 'youtube',
        startSec,
        endSec,
        comment: userComment,
        category: snippetCategory,
        likesCount: 0,
        createdAt: serverTimestamp()
      });
      setClipVideoId(null);
      setInputUrl('');
      setUserComment('');
      setActiveTab('home');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'snippets'); }
  };

  const handleLike = async (id: string, count: number) => {
    if (!user) return handleLogin();
    try { await setDoc(doc(db, 'snippets', id), { likesCount: count + 1 }, { merge: true }); } catch (e) { console.error(e); }
  };

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const t = translations[lang];

  return (
    <div className="min-h-screen dark:bg-black bg-gray-50 dark:text-white text-gray-900 transition-colors">
      
      <Header 
        user={user} 
        onLogin={handleLogin} 
        onMenuClick={() => {}} 
        theme={theme} 
        toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        lang={lang}
        setLang={setLang}
      />

      <div className="flex pt-24 h-screen">
        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden lg:flex flex-col w-64 overflow-y-auto p-4 border-r dark:border-white/5 border-black/5 scrollbar-thin dark:scrollbar-thumb-white/10 scrollbar-thumb-black/10 dark:bg-black/40 bg-white/40 transition-colors">
          <nav className="space-y-2">
            <NavItem icon={<Home className="w-5 h-5" />} label={t.nav.home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <NavItem icon={<Compass className="w-5 h-5" />} label="Keşfet" active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
            <NavItem icon={<PlusSquare className="w-5 h-5" />} label={t.nav.create} active={activeTab === 'create'} onClick={() => setActiveTab('create')} />
            <NavItem icon={<Bookmark className="w-5 h-5" />} label="Kaydedilenler" active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} />
            <NavItem icon={<UserIcon className="w-5 h-5" />} label={t.nav.profile} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          </nav>
          
          <div className="border-t dark:border-white/5 border-black/5 mt-6 pt-6 pb-8 space-y-2 transition-colors">
            <NavItem icon={<Settings className="w-5 h-5" />} label={t.nav.settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>
        </aside>

        {/* Main Container */}
        <main className="flex-1 overflow-y-auto scrollbar-thin dark:scrollbar-thumb-white/10 scrollbar-thumb-black/10 dark:bg-black bg-gray-50 transition-colors">
          
          <div className={`p-6 lg:p-10 ${activeTab === 'home' ? 'max-w-screen-xl mx-auto' : 'max-w-4xl mx-auto'}`}>
            <AnimatePresence mode="wait">
              
              {activeTab === 'home' && (
                <motion.section key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center pb-24">
                  
                  {/* Hero Section at the top of Home */}
                  <div className="w-full max-w-3xl mb-12">
                    <div className="relative overflow-hidden bg-gradient-to-br dark:from-gray-900 dark:to-black from-gray-100 to-white border dark:border-white/5 border-black/5 rounded-[2.5rem] p-6 md:p-10 shadow-[0_0_100px_-20px_rgba(29,185,84,0.1)] flex flex-col transition-colors">
                       <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                       </div>

                       <div className="relative z-10 space-y-6 w-full mx-auto">
                          <div className="space-y-3 text-center">
                             <h2 className="text-3xl md:text-4xl font-strong italic leading-[0.9] uppercase tracking-tighter dark:text-white text-black">
                                HİSSİYATI <br /> <span className="text-brand">SANİYESİNDE</span> YAKALA.
                             </h2>
                             <p className="dark:text-gray-400 text-gray-500 font-medium text-sm">Favori anını sticker veya kesit olarak paylaş.</p>
                          </div>

                          <div className="flex flex-col md:flex-row dark:bg-black/60 bg-white/60 border dark:border-white/10 border-black/10 rounded-2xl p-2 focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10 transition-all shadow-2xl items-stretch">
                             <div className="flex-1 flex items-center px-4 py-3">
                                <LinkIcon className="w-6 h-6 text-brand mr-4" />
                                <input 
                                  type="text" 
                                  placeholder="YouTube veya Spotify linkini yapıştır..." 
                                  className="flex-1 bg-transparent outline-none font-bold text-base dark:placeholder:text-gray-700 placeholder:text-gray-400 dark:text-white text-black" 
                                  value={inputUrl} 
                                  onChange={(e) => setInputUrl(e.target.value)} 
                                />
                             </div>
                             <button 
                               onClick={() => {
                                 if (inputUrl) setActiveTab('create');
                               }}
                               disabled={!inputUrl}
                               className="bg-brand text-black px-8 py-3 rounded-xl font-strong uppercase tracking-[0.1em] shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                             >
                               KESİT AL
                             </button>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* MAIN FEED: Vertical Feed */}
                  <div className="w-full max-w-md space-y-8">
                    {snippets.length > 0 ? (
                      <>
                        {snippets.map(s => <SnippetSocialCard key={s.id} snippet={s} theme={theme} onLike={() => handleLike(s.id, s.likesCount)} isSaved={savedSnippets.includes(s.id)} onSave={() => handleToggleSave(s.id)} />)}
                      </>
                    ) : (
                      <div className="text-center py-40 dark:text-gray-600 text-gray-400 font-medium italic">Henüz keşfedilmeyi bekleyen bir an yok.</div>
                    )}
                  </div>
                </motion.section>
              )}

            {activeTab === 'explore' && (
              <motion.section key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
                 <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400 w-5 h-5" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Yeni bir an, küratör veya kategori bul..." className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand/30 transition-all font-medium dark:text-white text-black" />
                 </div>

                 {!searchQuery && (
                   <>
                     <div className="space-y-4">
                       <h3 className="text-sm font-strong dark:text-white text-black uppercase tracking-[0.2em] italic flex items-center gap-2"><Trophy className="w-4 h-4 text-brand" /> HAFTANIN KÜRATÖRLERİ</h3>
                       <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                         {[
                           { name: 'rock_tanrisi', role: 'Music Hunter', img: 'https://i.pravatar.cc/150?u=rock', count: 120 },
                           { name: 'felsefe_kulubu', role: 'Deep Thinker', img: 'https://i.pravatar.cc/150?u=fels', count: 85 },
                           { name: 'film_gurmesi', role: 'Cinema Eye', img: 'https://i.pravatar.cc/150?u=film', count: 64 },
                           { name: 'spor_arsivi', role: 'Chaos Energy', img: 'https://i.pravatar.cc/150?u=spor', count: 42 }
                         ].map(curator => (
                           <div key={curator.name} className="flex-shrink-0 snap-center dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5 rounded-2xl p-4 w-40 flex flex-col items-center text-center">
                             <img src={curator.img} alt={curator.name} className="w-16 h-16 rounded-full border-2 border-brand mb-3 object-cover" />
                             <span className="font-strong text-sm truncate w-full">{curator.name}</span>
                             <span className="text-[10px] text-brand uppercase tracking-widest mt-1">{curator.role}</span>
                             <span className="text-xs dark:text-gray-500 text-gray-500 font-bold mt-3">{curator.count} Snippets</span>
                           </div>
                         ))}
                       </div>
                     </div>

                     <div className="space-y-4">
                       <h3 className="text-sm font-strong dark:text-white text-black uppercase tracking-[0.2em] italic flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> EN ÇOK KAYDEDİLEN ANLAR</h3>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {snippets.slice(0, 3).map(s => (
                             <div key={s.id} className="aspect-[4/5] relative group overflow-hidden rounded-xl cursor-pointer" onClick={() => setActiveTab('home')}>
                                <img src={`https://img.youtube.com/vi/${s.videoId}/0.jpg`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="grid" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                                   <span className="text-white font-bold text-xs line-clamp-2 leading-tight">{s.comment}</span>
                                   <div className="flex items-center gap-1.5 mt-2.5">
                                      <Bookmark className="w-3 h-3 text-brand fill-brand" />
                                      <span className="text-white text-[10px] font-strong">{s.likesCount}+ Kayıt</span>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                     </div>

                     <div className="space-y-4">
                       <h3 className="text-sm font-strong dark:text-white text-black uppercase tracking-[0.2em] italic flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500" /> GÖZDEN KAÇAN CEVHERLER</h3>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {snippets.slice(3, 6).map(s => (
                             <div key={s.id} className="aspect-[4/5] relative group overflow-hidden rounded-xl cursor-pointer" onClick={() => setActiveTab('home')}>
                                <img src={`https://img.youtube.com/vi/${s.videoId}/0.jpg`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="grid" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                                   <span className="text-white font-bold text-xs line-clamp-2 leading-tight">{s.comment}</span>
                                   <div className="flex items-center gap-1.5 mt-2.5">
                                      <Eye className="w-3 h-3 text-blue-400" />
                                      <span className="text-white text-[10px] font-strong">Az İzlendi, Çok Sevildi</span>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                     </div>
                   </>
                 )}

                 {searchQuery && (
                   <div className="grid grid-cols-3 gap-1 md:gap-2">
                      {snippets.filter(s => s.comment.toLowerCase().includes(searchQuery.toLowerCase()) || s.userName.toLowerCase().includes(searchQuery.toLowerCase()) || s.category.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                         <div key={s.id} className="aspect-square relative group overflow-hidden rounded-md cursor-pointer" onClick={() => setActiveTab('home')}>
                            <img src={`https://img.youtube.com/vi/${s.videoId}/0.jpg`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="grid" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                               <Heart className="w-4 h-4 fill-white mr-1" /> {s.likesCount}
                            </div>
                         </div>
                      ))}
                   </div>
                 )}
              </motion.section>
            )}

            {activeTab === 'create' && (
              <motion.section key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="relative overflow-hidden bg-gradient-to-br dark:from-gray-900 dark:to-black from-gray-100 to-white border dark:border-white/5 border-black/5 rounded-[2.5rem] p-6 md:p-12 mb-8 shadow-[0_0_100px_-20px_rgba(29,185,84,0.1)] flex flex-col transition-colors">
                     <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                     </div>

                     <div className="relative z-10 space-y-8 w-full max-w-3xl mx-auto">
                        <div className="space-y-4 text-center">
                           <h2 className="text-4xl md:text-5xl font-strong italic leading-[0.9] uppercase tracking-tighter dark:text-white text-black">
                              HİSSİYATI <br /> <span className="text-brand">SANİYESİNDE</span> YAKALA.
                           </h2>
                           <p className="dark:text-gray-400 text-gray-500 font-medium text-lg">Favori anını sticker veya kesit olarak paylaş.</p>
                        </div>

                        <div className="flex flex-col md:flex-row dark:bg-black/60 bg-white/60 border dark:border-white/10 border-black/10 rounded-2xl p-2 focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10 transition-all shadow-2xl items-stretch">
                           <div className="flex-1 flex items-center px-4 py-3">
                              <LinkIcon className="w-6 h-6 text-brand mr-4" />
                              <input 
                                type="text" 
                                placeholder="YouTube veya Spotify linkini yapıştır..." 
                                className="flex-1 bg-transparent outline-none font-bold text-lg dark:placeholder:text-gray-700 placeholder:text-gray-400 dark:text-white text-black" 
                                value={inputUrl} 
                                onChange={(e) => setInputUrl(e.target.value)} 
                              />
                           </div>
                           <button 
                             disabled={!inputUrl}
                             className="bg-brand text-black px-10 py-4 rounded-xl font-strong uppercase tracking-[0.2em] shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                           >
                             Oluştur
                           </button>
                        </div>

                    {generatedLinks && (
                       <div className="space-y-4 animate-in slide-in-from-top-2 duration-500 pt-4 border-t border-white/10 text-left">
                          <p className="text-[10px] font-strong text-brand uppercase tracking-widest text-center">Hızlı Link Oluşturucu</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                             {generatedLinks.yt && <ResultRow icon={<Youtube className="text-red-500" />} title="YouTube Link" link={generatedLinks.yt} onCopy={() => handleCopy(generatedLinks.yt!)} isCopied={copiedLink === generatedLinks.yt} />}
                             {generatedLinks.ytm && <ResultRow icon={<PlayCircle className="text-red-500" />} title="Premium/Music" link={generatedLinks.ytm} onCopy={() => handleCopy(generatedLinks.ytm!)} isCopied={copiedLink === generatedLinks.ytm} />}
                             {generatedLinks.spot && <ResultRow icon={<Music className="text-green-500" />} title="Spotify Link" link={generatedLinks.spot} onCopy={() => handleCopy(generatedLinks.spot!)} isCopied={copiedLink === generatedLinks.spot} />}
                          </div>
                       </div>
                    )}

                    {clipVideoId && (
                      <div className="space-y-6 pt-6 border-t dark:border-white/5 border-black/5 animate-in fade-in duration-700">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Zaman Ayarlı Kesit Oluştur</p>
                        <YouTubeClipper videoId={clipVideoId} onMarkStart={setStartSec} onMarkEnd={setEndSec} start={startSec} end={endSec} />
                        {user ? (
                           <div className="space-y-4">
                              <textarea className="w-full dark:bg-black/30 bg-black/5 border dark:border-white/5 border-black/5 rounded-2xl p-4 h-32 outline-none focus:border-brand/30 transition-all font-medium dark:text-white text-black" placeholder="Bu an hakkında bir küratör notu bırak..." value={userComment} onChange={(e) => setUserComment(e.target.value)} />
                              <div className="flex flex-wrap gap-2">
                                 {['#felsefe', '#spor', '#motivasyon', '#komik', '#müzik'].map(c => <button key={c} onClick={() => setSnippetCategory(c)} className={`px-4 py-2 rounded-full text-[10px] font-bold border transition-colors ${snippetCategory === c ? 'bg-brand text-black border-brand' : 'dark:border-white/10 border-black/10 dark:text-gray-500 text-gray-500 hover:bg-black/5 dark:hover:bg-white/5'}`}>{c}</button>)}
                              </div>
                              <button onClick={handleCreateSnippet} disabled={!userComment} className="w-full py-5 bg-brand text-black font-strong rounded-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">PAYLAŞ</button>
                           </div>
                        ) : (
                           <div className="text-center space-y-4 pt-4 border-t dark:border-white/5 border-black/5">
                              <p className="text-sm dark:text-gray-400 text-gray-500 font-medium">Bu anı Olinkbu'da paylaşmak ve küratör notu eklemek için giriş yap.</p>
                              <button onClick={handleLogin} className="w-full py-5 bg-brand text-black font-strong rounded-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">GİRİŞ YAP VE PAYLAŞ</button>
                           </div>
                        )}
                      </div>
                    )}

                    {!user && !clipVideoId && !generatedLinks && (
                       <button onClick={handleLogin} className="w-full py-5 dark:bg-white dark:text-black bg-black text-white font-strong rounded-2xl uppercase tracking-widest shadow-lg dark:shadow-white/5">GİRİŞ YAP VE BAŞLA</button>
                    )}
                 </div>
                 </div>
              </motion.section>
            )}

            {activeTab === 'profile' && (
              <motion.section key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:space-y-8">
                {user ? (
                  <>
                     <header className="flex flex-col md:flex-row items-center md:items-start gap-8 px-4 py-12 lg:gap-14 lg:px-6">
                        <div className="relative shrink-0 group">
                           <div className="absolute -inset-1 bg-gradient-to-tr from-brand to-red-500 rounded-full blur opacity-40 group-hover:opacity-75 transition-opacity" />
                           <img src={user?.photoURL || 'https://via.placeholder.com/150'} alt="user" className="relative w-28 h-28 md:w-40 md:h-40 rounded-full border-4 dark:border-black border-white object-cover shadow-2xl" />
                           <button className="absolute bottom-1 right-1 bg-brand text-black p-2 rounded-full border-4 dark:border-black border-white shadow-lg hover:scale-110 transition-transform">
                              <Camera className="w-5 h-5" />
                           </button>
                        </div>
                        
                        <div className="flex-1 text-center md:text-left space-y-6">
                           <div className="flex flex-col md:flex-row items-center gap-4">
                              <h2 className="text-3xl md:text-4xl font-strong italic leading-none truncate max-w-[250px] dark:text-white text-black">{user?.displayName || 'Kullanıcı'}</h2>
                              <div className="flex gap-2">
                                 <button className="px-6 py-2 dark:bg-white/10 bg-black/5 dark:hover:bg-white/20 hover:bg-black/10 rounded-xl text-xs font-bold transition-all">Profili Düzenle</button>
                                 <button className="p-2 dark:bg-white/5 bg-black/5 dark:hover:bg-white/10 hover:bg-black/10 rounded-xl transition-all"><Settings className="w-5 h-5" /></button>
                              </div>
                           </div>
                           
                           <div className="flex justify-center md:justify-start gap-10">
                              <div className="text-center md:text-left">
                                 <span className="block font-strong text-2xl leading-none">{snippets.filter(s => s.userId === user?.uid).length}</span>
                                 <span className="text-[10px] text-gray-500 uppercase font-strong tracking-widest mt-1 block">Snippets</span>
                              </div>
                              <div className="text-center md:text-left">
                                 <span className="block font-strong text-2xl leading-none">2.4K</span>
                                 <span className="text-[10px] text-gray-500 uppercase font-strong tracking-widest mt-1 block">Takipçi</span>
                              </div>
                              <div className="text-center md:text-left">
                                 <span className="block font-strong text-2xl leading-none">168</span>
                                 <span className="text-[10px] text-gray-500 uppercase font-strong tracking-widest mt-1 block">Takip</span>
                              </div>
                           </div>
   
                           <div className="max-w-xs space-y-4 mx-auto md:mx-0">
                              <p className="text-sm dark:text-gray-400 text-gray-500 font-medium leading-relaxed">
                                 İlham veren anların küratörü.
                              </p>
                              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-brand/10 text-brand border border-brand/20">🧬 Deep Thinker</span>
                                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">🎵 Music Hunter</span>
                              </div>
                              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-white/5 bg-black/5" title="7 Gündür Yeni Keşifler Yapıyorsun">
                                  <span className="text-orange-500">🔥</span>
                                  <span className="text-xs font-bold text-gray-400">7 Day Streak</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-white/5 bg-black/5" title="Viral Kesitler Bulan">
                                  <span className="text-yellow-400">🏆</span>
                                  <span className="text-xs font-bold text-gray-400">Viral Finder</span>
                                </div>
                              </div>
                           </div>
                        </div>
                     </header>
   
                     {/* Profile Tabs */}
                     <div className="flex border-t dark:border-white/10 border-black/10">
                        <button 
                          onClick={() => setProfileTab('all')}
                          className={`flex-1 py-4 flex items-center justify-center gap-2 border-t-2 transition-all ${profileTab === 'all' ? 'border-brand dark:text-white text-black' : 'border-transparent dark:text-gray-500 text-gray-400'}`}
                        >
                          <PlusSquare className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Tümü</span>
                        </button>
                        <button 
                          onClick={() => setProfileTab('music')}
                          className={`flex-1 py-4 flex items-center justify-center gap-2 border-t-2 transition-all ${profileTab === 'music' ? 'border-brand dark:text-white text-black' : 'border-transparent dark:text-gray-500 text-gray-400'}`}
                        >
                          <Music className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Müziklerim</span>
                        </button>
                        <button 
                          onClick={() => setProfileTab('video')}
                          className={`flex-1 py-4 flex items-center justify-center gap-2 border-t-2 transition-all ${profileTab === 'video' ? 'border-brand dark:text-white text-black' : 'border-transparent dark:text-gray-500 text-gray-400'}`}
                        >
                          <PlayCircle className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Videolarım</span>
                        </button>
                     </div>
   
                     <div className="grid grid-cols-3 gap-0.5 lg:pt-4">
                        {snippets
                          .filter(s => s.userId === user?.uid)
                          .filter(s => {
                             if (profileTab === 'all') return true;
                             if (profileTab === 'music') return s.category === '#müzik';
                             if (profileTab === 'video') return s.category !== '#müzik';
                             return true;
                          })
                          .map(s => (
                           <div key={s.id} className="aspect-square bg-gray-900 overflow-hidden relative group rounded-md">
                              <img src={`https://img.youtube.com/vi/${s.videoId}/0.jpg`} className="w-full h-full object-cover" alt="grid" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                 <PlayCircle className="w-8 h-8 text-white filter drop-shadow-lg" />
                              </div>
                           </div>
                        ))}
                     </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
                    <div className="w-24 h-24 dark:bg-white/5 bg-black/5 rounded-full flex items-center justify-center mb-8 border dark:border-white/10 border-black/10 shadow-2xl">
                      <UserIcon className="w-10 h-10 dark:text-white/50 text-black/50" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-strong italic mb-6 uppercase tracking-tighter">
                      Olinkbu<sup className="text-lg opacity-60 ml-1">PRO</sup>'YA KATIL
                    </h2>
                    <p className="dark:text-gray-400 text-gray-500 max-w-md mx-auto mb-10 text-sm leading-relaxed">
                      Kendi snippet'larınızı oluşturmak, profilinizi kişiselleştirmek ve favori anlarınızı saklamak için ücretsiz kayıt olun.
                    </p>
                    <button 
                      onClick={handleLogin} 
                      className="px-10 py-5 bg-white text-black font-strong rounded-full uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                    >
                      Giriş Yap / Kayıt ol
                    </button>
                  </div>
                )}
              </motion.section>
            )}

            {activeTab === 'saved' && (
              <motion.section key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                 <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-strong italic uppercase text-black dark:text-white">Koleksiyonlarım</h2>
                    <button className="px-4 py-2 dark:bg-white/10 bg-black/5 rounded-xl font-bold text-sm hover:dark:bg-white/20 hover:bg-black/10 transition-colors">+ Yeni Oluştur</button>
                 </div>

                 {user ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {/* Real Saved Snippets Collection */}
                       <div className="group cursor-pointer" onClick={() => {
                         // Filter snippets by savedSnippets
                         // This is just a UI representation, in a real app would open the collection
                       }}>
                         <div className="aspect-square relative rounded-[2rem] overflow-hidden mb-4 border-2 border-brand shadow-[0_0_30px_rgba(29,185,84,0.15)]">
                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 p-1 bg-brand/5">
                               {savedSnippets.length > 0 ? (
                                 <>
                                   {savedSnippets.slice(0, 3).map((id, idx) => {
                                     const s = snippets.find(snippet => snippet.id === id);
                                     return s ? <img key={id} src={`https://img.youtube.com/vi/${s.videoId}/0.jpg`} className={`w-full h-full object-cover ${idx === 0 ? 'rounded-tl-[1.5rem]' : idx === 1 ? 'rounded-tr-[1.5rem]' : 'rounded-bl-[1.5rem]'}`} alt="thumb" /> : null;
                                   })}
                                   <div className="w-full h-full bg-brand/20 rounded-br-[1.5rem] flex items-center justify-center text-brand font-strong text-xl">
                                     +{Math.max(0, savedSnippets.length - 3)}
                                   </div>
                                 </>
                               ) : (
                                 <div className="col-span-2 row-span-2 flex items-center justify-center text-gray-500 italic text-xs">Henüz bir şey yok</div>
                               )}
                            </div>
                         </div>
                         <h3 className="font-strong text-lg flex items-center gap-2">Favorilerim <Lock className="w-3 h-3 text-gray-500" /></h3>
                         <p className="text-sm dark:text-gray-400 text-gray-500 font-medium mt-1">{savedSnippets.length} Kaydedilen An</p>
                       </div>

                       {/* Mock Collection 1 */}
                       <div className="group cursor-pointer">
                         <div className="aspect-square relative rounded-[2rem] overflow-hidden mb-4 border dark:border-white/5 border-black/5 opacity-60">
                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 p-1 bg-black/5 dark:bg-white/5">
                               <img src={`https://img.youtube.com/vi/xJ7uJvXWofA/0.jpg`} className="w-full h-full object-cover rounded-tl-[1.5rem]" alt="thumb" />
                               <img src={`https://img.youtube.com/vi/d17ggav1Ljc/0.jpg`} className="w-full h-full object-cover rounded-tr-[1.5rem]" alt="thumb" />
                               <img src={`https://img.youtube.com/vi/A22oy8dFjqc/0.jpg`} className="w-full h-full object-cover rounded-bl-[1.5rem]" alt="thumb" />
                               <div className="w-full h-full bg-brand/20 rounded-br-[1.5rem] flex items-center justify-center text-brand font-strong text-xl">+42</div>
                            </div>
                         </div>
                         <h3 className="font-strong text-lg flex items-center gap-2">Müzikal Yolculuk <Lock className="w-3 h-3 text-gray-500" /></h3>
                         <p className="text-sm dark:text-gray-400 text-gray-500 font-medium mt-1">Örnek Koleksiyon</p>
                       </div>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
                      <div className="w-24 h-24 dark:bg-white/5 bg-black/5 rounded-full flex items-center justify-center mb-8 border dark:border-white/10 border-black/10 shadow-2xl">
                        <Bookmark className="w-10 h-10 dark:text-white/50 text-black/50" />
                      </div>
                      <h2 className="text-3xl font-strong italic mb-6 uppercase tracking-tighter">
                        KAYDEDİLENLER
                      </h2>
                      <p className="dark:text-gray-400 text-gray-500 max-w-md mx-auto mb-10 text-sm leading-relaxed">
                        Favori anlarınızı saklamak ve istediğiniz zaman onlara geri dönmek için giriş yapın.
                      </p>
                      <button 
                        onClick={handleLogin} 
                        className="px-10 py-5 bg-brand text-black font-strong rounded-full uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(29,185,84,0.2)]"
                      >
                        Giriş Yap
                      </button>
                    </div>
                 )}
              </motion.section>
            )}

            {activeTab === 'settings' && (
              <motion.section key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 px-4">
                 <h2 className="text-3xl font-strong italic mb-8 uppercase">Ayarlar</h2>
                 <div className="space-y-4">
                    <button 
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="w-full p-4 dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5 rounded-2xl flex items-center justify-between dark:hover:bg-white/10 hover:bg-black/10 transition-all text-left"
                    >
                       <div className="flex items-center gap-4">
                          <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-brand' : 'text-gray-500'}`} />
                          <span className="font-bold">Gece Modu</span>
                       </div>
                       <div className={`w-10 h-5 rounded-full transition-colors ${theme === 'dark' ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-800'}`} />
                    </button>

                    <button 
                      onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
                      className="w-full p-4 dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5 rounded-2xl flex items-center justify-between dark:hover:bg-white/10 hover:bg-black/10 transition-all text-left"
                    >
                       <div className="flex items-center gap-4">
                          <Globe className="w-5 h-5 text-blue-500" />
                          <span className="font-bold">{lang === 'tr' ? "English" : "Türkçe"}</span>
                       </div>
                       <span className="text-xs font-bold text-brand uppercase tracking-widest">{lang === 'tr' ? "TR" : "EN"}</span>
                    </button>

                    <button onClick={() => setNotificationsEnabled(!notificationsEnabled)} className="w-full p-4 dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5 rounded-2xl flex items-center justify-between dark:hover:bg-white/10 hover:bg-black/10 transition-all text-left">
                       <span className="font-bold">Bildirimler</span>
                       <div className={`w-10 h-5 rounded-full transition-all ${notificationsEnabled ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-800'}`} />
                    </button>
                    <button onClick={() => setPrivacyPrivate(!privacyPrivate)} className="w-full p-4 dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5 rounded-2xl flex items-center justify-between dark:hover:bg-white/10 hover:bg-black/10 transition-all text-left">
                       <span className="font-bold">Gizli Hesap</span>
                       <div className={`w-10 h-5 rounded-full transition-all ${privacyPrivate ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-800'}`} />
                    </button>
                    <button onClick={handleLogout} className="w-full p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all">Çıkış Yap</button>
                 </div>
              </motion.section>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>

    {/* Bottom Navigation - Mobile */}
      <footer className="lg:hidden fixed bottom-0 w-full dark:bg-black/90 bg-white/90 backdrop-blur-xl border-t dark:border-white/10 border-black/10 px-6 py-4 flex justify-between items-center z-50 transition-colors">
        <button onClick={() => setActiveTab('home')} className={`transition-all ${activeTab === 'home' ? 'text-brand scale-110' : 'text-gray-500'}`}><Home className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab('explore')} className={`transition-all ${activeTab === 'explore' ? 'text-brand scale-110' : 'text-gray-500'}`}><Compass className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab('create')} className={`p-2 bg-white/10 rounded-xl transition-all ${activeTab === 'create' ? 'text-brand bg-brand/10 scale-110' : 'text-gray-500'}`}><PlusSquare className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab('saved')} className={`transition-all ${activeTab === 'saved' ? 'text-brand scale-110' : 'text-gray-500'}`}><Bookmark className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab('profile')} className={`transition-all ${activeTab === 'profile' ? 'text-brand scale-110' : 'text-gray-500'}`}><UserIcon className="w-6 h-6" /></button>
      </footer>
    </div>
  );
}
