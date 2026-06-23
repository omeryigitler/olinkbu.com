import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Check,
  Clipboard,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Instagram,
  Link as LinkIcon,
  Music,
  PlayCircle,
  Send,
  Share2,
  Sparkles,
  Youtube,
} from 'lucide-react';

type ParsedMedia = {
  platform: 'youtube' | 'spotify';
  id: string;
  cleanUrl: string;
} | null;

type GeneratedLinks = {
  yt?: string;
  ytm?: string;
  spot?: string;
} | null;

type CreateStudioProps = {
  inputUrl: string;
  setInputUrl: (value: string) => void;
  parsedMedia: ParsedMedia;
  generatedLinks: GeneratedLinks;
  copiedLink: string | null;
  startSec: number;
  endSec: number;
  userComment: string;
  setUserComment: (value: string) => void;
  snippetCategory: string;
  setSnippetCategory: (value: string) => void;
  isLoggedIn: boolean;
  onStart: () => void;
  onCopy: (link: string) => void;
  onCreate: () => void;
  onLogin: () => void;
  renderClipper: () => ReactNode;
};

const categories = ['#felsefe', '#spor', '#motivasyon', '#komik', '#müzik'];
const VIDEO_MIME_OPTIONS = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

function formatSecondsToMMSS(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function compactLink(link: string) {
  if (!link) return 'Link bekleniyor';
  return link.length > 42 ? `${link.slice(0, 39)}...` : link;
}

function pickVideoMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return VIDEO_MIME_OPTIONS.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
}

function getVideoExtension(mimeType: string) {
  return mimeType.includes('mp4') ? 'mp4' : 'webm';
}

function GeneratedLinkButton({ label, link, icon, isCopied, onCopy }: { label: string; link: string; icon: ReactNode; isCopied: boolean; onCopy: () => void }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white/85 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
        <span className="block truncate text-xs font-bold text-slate-700">{compactLink(link)}</span>
      </span>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${isCopied ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'}`}>
        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </span>
    </button>
  );
}

export function CreateStudio({
  inputUrl,
  setInputUrl,
  parsedMedia,
  generatedLinks,
  copiedLink,
  startSec,
  endSec,
  userComment,
  setUserComment,
  snippetCategory,
  setSnippetCategory,
  isLoggedIn,
  onStart,
  onCopy,
  onCreate,
  onLogin,
  renderClipper,
}: CreateStudioProps) {
  const [showStoryKit, setShowStoryKit] = useState(false);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canStart = inputUrl.trim().length > 0;
  const shareUrl = useMemo(() => generatedLinks?.yt || generatedLinks?.ytm || generatedLinks?.spot || inputUrl.trim(), [generatedLinks, inputUrl]);
  const clipTitle = userComment.trim() || 'Hissiyatı anında yakala';
  const clipRange = parsedMedia?.platform === 'youtube' ? `${formatSecondsToMMSS(startSec)} – ${formatSecondsToMMSS(endSec)}` : 'Spotify anı';

  const drawStoryCanvas = (progress = 1) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const eased = 1 - Math.pow(1 - Math.min(1, Math.max(0, progress)), 3);
    const pulse = 0.5 + Math.sin(progress * Math.PI * 8) * 0.5;

    ctx.clearRect(0, 0, 1080, 1920);
    const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(0.62, '#fff5f5');
    bg.addColorStop(1, '#f2f4f8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = '#E10600';
    ctx.beginPath();
    ctx.roundRect(72, 92, 936 * Math.max(0.18, eased), 18, 9);
    ctx.fill();

    ctx.fillStyle = '#080808';
    ctx.font = '900 92px Inter, Arial, sans-serif';
    ctx.fillText('olinkbu', 72, 210);

    ctx.fillStyle = '#E10600';
    ctx.beginPath();
    ctx.arc(870, 170, 58 + pulse * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(870, 170, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, (1 - eased) * 70);
    ctx.globalAlpha = 0.25 + eased * 0.75;
    ctx.fillStyle = '#111827';
    ctx.font = '900 italic 96px Inter, Arial, sans-serif';
    ctx.fillText('HİSSİYATI', 72, 520);
    ctx.fillStyle = '#E10600';
    ctx.fillText('ANINDA', 72, 640);
    ctx.fillStyle = '#111827';
    ctx.fillText('YAKALA.', 72, 760);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(15,23,42,0.18)';
    ctx.shadowBlur = 50;
    ctx.beginPath();
    ctx.roundRect(72, 880, 936, 520, 54);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#E10600';
    ctx.beginPath();
    ctx.roundRect(112, 928, 170, 52, 26);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px Inter, Arial, sans-serif';
    ctx.fillText(snippetCategory.replace('#', '').toUpperCase(), 136, 964);

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 58px Inter, Arial, sans-serif';
    const words = clipTitle.slice(0, 96).split(' ');
    let line = '';
    let y = 1080;
    for (const word of words) {
      const testLine = `${line}${word} `;
      if (ctx.measureText(testLine).width > 800 && line) {
        ctx.fillText(line.trim(), 112, y);
        line = `${word} `;
        y += 72;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), 112, y);

    ctx.fillStyle = '#64748b';
    ctx.font = '700 34px Inter, Arial, sans-serif';
    ctx.fillText(clipRange, 112, 1300);

    ctx.strokeStyle = 'rgba(225,6,0,0.18)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.roundRect(112, 1438, 856, 26, 13);
    ctx.stroke();
    ctx.fillStyle = '#E10600';
    ctx.beginPath();
    ctx.roundRect(112, 1438, 856 * eased, 26, 13);
    ctx.fill();

    ctx.fillStyle = '#E10600';
    ctx.beginPath();
    ctx.roundRect(112, 1486, 856, 112, 34);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px Inter, Arial, sans-serif';
    ctx.fillText('STORY · REELS · POST', 168, 1557);

    ctx.fillStyle = '#475569';
    ctx.font = '700 30px Inter, Arial, sans-serif';
    ctx.fillText(compactLink(shareUrl), 112, 1695);

    ctx.fillStyle = `rgba(225,6,0,${0.12 + pulse * 0.18})`;
    ctx.beginPath();
    ctx.arc(900, 1780, 62 + pulse * 20, 0, Math.PI * 2);
    ctx.fill();
  };

  useEffect(() => {
    if (!showStoryKit) return;
    const timer = window.setTimeout(() => drawStoryCanvas(1), 60);
    return () => window.clearTimeout(timer);
  }, [showStoryKit, clipTitle, snippetCategory, shareUrl, startSec, endSec]);

  const downloadStoryImage = () => {
    drawStoryCanvas(1);
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'olinkbu-story-card.png';
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const renderStoryVideoFile = async () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined') return null;

    const stream = (canvas as HTMLCanvasElement & { captureStream?: (frameRate?: number) => MediaStream }).captureStream?.(30);
    if (!stream) return null;

    const mimeType = pickVideoMimeType();
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const durationMs = 6200;
    const startedAt = performance.now();

    return await new Promise<File>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onerror = () => reject(new Error('Video üretimi tamamlanamadı.'));
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const finalMimeType = recorder.mimeType || mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: finalMimeType });
        const extension = getVideoExtension(finalMimeType);
        resolve(new File([blob], `olinkbu-instagram-video.${extension}`, { type: finalMimeType }));
      };

      const drawFrame = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / durationMs);
        drawStoryCanvas(progress);
        if (progress < 1 && recorder.state === 'recording') {
          requestAnimationFrame(drawFrame);
          return;
        }
        if (recorder.state === 'recording') recorder.stop();
      };

      drawStoryCanvas(0);
      recorder.start(250);
      requestAnimationFrame(drawFrame);
    });
  };

  const withVideoFile = async (action: (file: File) => Promise<void> | void) => {
    if (isRenderingVideo) return;
    setIsRenderingVideo(true);
    setVideoStatus('Video hazırlanıyor...');
    try {
      const file = await renderStoryVideoFile();
      if (!file) {
        setVideoStatus('Bu tarayıcı video üretimini desteklemiyor. PNG kartı kullanabilirsin.');
        return;
      }
      await action(file);
      setVideoStatus('Video hazır.');
    } catch {
      setVideoStatus('Video oluşturulamadı. Farklı bir tarayıcı veya mobil cihazda tekrar dene.');
    } finally {
      setIsRenderingVideo(false);
    }
  };

  const downloadStoryVideo = () => withVideoFile((file) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  });

  const shareStoryVideo = () => withVideoFile(async (file) => {
    const shareData = {
      title: 'olinkbu Instagram video',
      text: 'Olinkbu ile yakaladığım an.',
      files: [file],
    };

    if (navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
      return;
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
    setVideoStatus('Paylaşım desteklenmedi; video indirildi. Instagram’a yükleyebilirsin.');
  });

  return (
    <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white p-4 shadow-[0_30px_120px_-70px_rgba(15,23,42,0.75)] lg:h-[calc(100vh-8.5rem)] lg:min-h-[680px] lg:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-red-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-slate-900/5 blur-3xl" />

      <div className="relative z-10 grid h-full gap-5 lg:grid-cols-[0.82fr_1.18fr] xl:grid-cols-[0.78fr_1.22fr]">
        <aside className="flex min-h-0 flex-col rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5 lg:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-red-600 shadow-sm ring-1 ring-slate-200">
                <Sparkles className="h-3.5 w-3.5" /> Create Studio
              </div>
              <h2 className="text-4xl font-black italic uppercase leading-[0.9] tracking-[-0.06em] text-slate-950 xl:text-5xl">
                Hissiyatı <span className="text-red-600">Anında</span> Yakala.
              </h2>
            </div>
            <span className="hidden rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-red-600/20 sm:inline-flex">Yatay</span>
          </div>

          <div className="rounded-3xl bg-white p-3 shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100 focus-within:ring-2 focus-within:ring-red-500/30">
              <LinkIcon className="h-5 w-5 shrink-0 text-red-600" />
              <input
                type="text"
                value={inputUrl}
                onChange={(event) => setInputUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && canStart) onStart();
                }}
                placeholder="YouTube veya Spotify linkini yapıştır..."
                className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-950 outline-none placeholder:text-slate-400"
              />
              <button type="button" onClick={onStart} disabled={!canStart} className="rounded-xl bg-red-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-50">
                Oluştur
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {generatedLinks?.yt && <GeneratedLinkButton label="YouTube" link={generatedLinks.yt} icon={<Youtube className="h-4 w-4" />} isCopied={copiedLink === generatedLinks.yt} onCopy={() => onCopy(generatedLinks.yt!)} />}
            {generatedLinks?.ytm && <GeneratedLinkButton label="Music" link={generatedLinks.ytm} icon={<PlayCircle className="h-4 w-4" />} isCopied={copiedLink === generatedLinks.ytm} onCopy={() => onCopy(generatedLinks.ytm!)} />}
            {generatedLinks?.spot && <GeneratedLinkButton label="Spotify" link={generatedLinks.spot} icon={<Music className="h-4 w-4" />} isCopied={copiedLink === generatedLinks.spot} onCopy={() => onCopy(generatedLinks.spot!)} />}
          </div>

          {inputUrl && !parsedMedia && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">Geçerli bir YouTube veya Spotify linki gir.</p>}

          <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <textarea
              value={userComment}
              onChange={(event) => setUserComment(event.target.value)}
              placeholder="Bu an hakkında kısa bir küratör notu yaz..."
              className="h-28 w-full resize-none rounded-3xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-500/10"
            />

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSnippetCategory(category)}
                  className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition ${snippetCategory === category ? 'border-red-600 bg-red-600 text-white shadow-lg shadow-red-600/20' : 'border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-600'}`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setShowStoryKit(true)} disabled={!shareUrl} className="flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 disabled:opacity-50">
                <Instagram className="h-5 w-5" /> Story/Reels
              </button>
              <button type="button" onClick={() => onCopy(shareUrl)} disabled={!shareUrl} className="flex items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-red-600 transition hover:bg-red-100 disabled:opacity-50">
                <Clipboard className="h-5 w-5" /> Linki Kopyala
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={isLoggedIn ? onCreate : onLogin}
            disabled={isLoggedIn && (!parsedMedia || !userComment.trim())}
            className="mt-5 flex items-center justify-center gap-3 rounded-3xl bg-red-600 px-7 py-5 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_22px_55px_rgba(225,6,0,0.28)] transition hover:-translate-y-0.5 hover:bg-red-700 disabled:opacity-50"
          >
            <Send className="h-5 w-5" /> {isLoggedIn ? 'Paylaş' : 'Giriş Yap ve Başla'}
          </button>
        </aside>

        <section className="min-h-0 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_22px_80px_rgba(15,23,42,0.08)] lg:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-full bg-red-600 shadow-lg shadow-red-600/20" />
              <div>
                <h3 className="text-lg font-black text-slate-950">Kesit Editörü</h3>
                <p className="text-xs font-semibold text-slate-500">Video soldaki akışa göre yatay alana sığar.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700">1080p</div>
          </div>

          <div className="h-[calc(100%-4.25rem)] min-h-[520px] overflow-y-auto pr-1">
            {parsedMedia?.platform === 'youtube' ? (
              <div className="rounded-[1.5rem] bg-slate-950/5 p-3 ring-1 ring-slate-200">
                {renderClipper()}
              </div>
            ) : (
              <div className="grid min-h-[340px] place-items-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-center">
                <div className="max-w-sm px-6">
                  <Music className="mx-auto mb-4 h-12 w-12 text-red-600" />
                  <h3 className="text-2xl font-black text-slate-950">Spotify anı hazır</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Spotify linki için zaman seçimi yerine not, kategori ve story kartı akışı kullanılacak.</p>
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.72fr]">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Oluşturulan kesit</p>
                <div className="flex items-center gap-4">
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20"><PlayCircle className="h-9 w-9 fill-current" /></div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-lg font-black text-slate-950">{clipTitle}</h4>
                    <p className="mt-1 text-sm font-bold text-slate-500">{clipRange}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">{compactLink(shareUrl)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Instagram paylaşımı</p>
                <button type="button" onClick={() => setShowStoryKit(true)} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700">
                  <Film className="h-5 w-5" /> Reels/Post/Story video
                </button>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-500 text-white"><Share2 className="h-4 w-4" /></span>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-black text-white">𝕏</span>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-600"><LinkIcon className="h-4 w-4" /></span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showStoryKit && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xl">
          <div className="grid w-full max-w-5xl gap-6 rounded-[2rem] bg-white p-5 shadow-2xl lg:grid-cols-[0.85fr_1.15fr]">
            <div className="flex flex-col justify-center p-3">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-red-600"><Instagram className="h-4 w-4" /> Story · Reels · Post</div>
              <h3 className="text-5xl font-black italic uppercase leading-none tracking-[-0.06em] text-slate-950">Instagram için video hazırla.</h3>
              <p className="mt-5 text-base font-semibold leading-7 text-slate-600">1080x1920 dikey animasyonlu video üret. Mobilde paylaş butonu sistem paylaşım penceresini açar; Instagram Story, Reels veya Post seçilebilir. Desktop’ta video dosyasını indirip yükleyebilirsin.</p>
              {videoStatus && <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{videoStatus}</p>}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={shareStoryVideo} disabled={isRenderingVideo} className="flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-white disabled:opacity-60"><Share2 className="h-5 w-5" /> {isRenderingVideo ? 'Hazırlanıyor' : 'Instagram’a paylaş'}</button>
                <button type="button" onClick={downloadStoryVideo} disabled={isRenderingVideo} className="flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-white disabled:opacity-60"><Film className="h-5 w-5" /> Video indir</button>
                <button type="button" onClick={downloadStoryImage} className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-900"><ImageIcon className="h-5 w-5" /> PNG indir</button>
                <button type="button" onClick={() => onCopy(shareUrl)} className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-900"><Copy className="h-5 w-5" /> Linki kopyala</button>
              </div>
              <button type="button" onClick={() => setShowStoryKit(false)} className="mt-3 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:bg-slate-50">Kapat</button>
            </div>
            <div className="grid place-items-center rounded-[1.5rem] bg-slate-100 p-4">
              <canvas ref={canvasRef} width="1080" height="1920" className="max-h-[78vh] w-auto rounded-[1.5rem] bg-white shadow-2xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
