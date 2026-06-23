import {
  BadgeCheck,
  Copy,
  Link as LinkIcon,
  Music,
  Play,
  Scissors,
  Send,
  Share2,
  ShieldCheck,
  Timer,
  Volume2,
  Youtube,
} from 'lucide-react';

type LandingHeroProps = {
  inputUrl: string;
  setInputUrl: (value: string) => void;
  onStart: () => void;
};

const featureItems = [
  { icon: Timer, title: '30 saniye', subtitle: 'Hızlı kesit alma' },
  { icon: BadgeCheck, title: 'Yüksek Kalite', subtitle: '1080p & 4K' },
  { icon: Volume2, title: 'Hassas Kesit', subtitle: 'Milisaniye hassasiyeti' },
  { icon: ShieldCheck, title: 'Güvenli & Hızlı', subtitle: 'Verilerin güvende' },
  { icon: Share2, title: 'Her Yerde Paylaş', subtitle: 'Tek tıkla paylaş' },
];

export function LandingHero({ inputUrl, setInputUrl, onStart }: LandingHeroProps) {
  const canStart = inputUrl.trim().length > 0;

  return (
    <section className="relative w-full overflow-hidden rounded-[2rem] bg-white px-5 py-8 text-black shadow-[0_30px_120px_rgba(15,23,42,0.08)] ring-1 ring-black/5 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute -right-40 top-20 h-[30rem] w-[38rem] rotate-[-8deg] rounded-full bg-[radial-gradient(circle_at_center,rgba(225,0,15,0.32),rgba(225,0,15,0.08)_38%,transparent_68%)] blur-sm" />
      <div className="pointer-events-none absolute right-0 top-1/2 hidden h-40 w-72 -translate-y-1/2 items-center justify-end lg:flex">
        <div className="relative h-[2px] w-full bg-gradient-to-r from-transparent via-red-500 to-red-600 shadow-[0_0_40px_rgba(225,0,15,0.5)]" />
        <div className="absolute right-3 h-12 w-12 rotate-45 border-r-4 border-t-4 border-red-500" />
      </div>

      <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-black shadow-[0_12px_40px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white">
              <Youtube className="h-4 w-4 fill-current" />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white">
              <Music className="h-4 w-4" />
            </span>
            <span>
              YouTube ve Spotify <span className="text-red-600">anlarını yakala</span>
            </span>
          </div>

          <div className="relative">
            <div className="absolute -right-6 -top-5 hidden text-red-600 md:block">
              <div className="h-8 w-1 rotate-[22deg] rounded-full bg-current" />
              <div className="ml-4 mt-1 h-7 w-1 rotate-[76deg] rounded-full bg-current" />
              <div className="ml-8 mt-2 h-7 w-1 rotate-[100deg] rounded-full bg-current" />
            </div>
            <h1 className="max-w-2xl text-[4rem] font-black uppercase leading-[0.92] tracking-[-0.08em] text-slate-950 sm:text-[5.5rem] lg:text-[6rem]">
              Hissiyatı
              <br />
              Anında
              <br />
              <span className="text-red-600">Yakala.</span>
            </h1>
          </div>

          <p className="max-w-xl text-lg font-medium leading-8 text-slate-700">
            Favori YouTube ve Spotify anlarını saniyeler içinde <span className="font-black text-red-600">viral kliplere</span> dönüştür, linkini al ve hemen paylaş.
          </p>

          <div className="max-w-xl space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.10)] ring-1 ring-black/10 sm:flex-row">
              <div className="flex flex-1 items-center gap-3 px-4 py-3">
                <LinkIcon className="h-5 w-5 text-slate-400" />
                <input
                  value={inputUrl}
                  onChange={(event) => setInputUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && canStart) onStart();
                  }}
                  placeholder="YouTube veya Spotify linkini yapıştır..."
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={onStart}
                disabled={!canStart}
                className="rounded-xl bg-red-600 px-8 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_14px_30px_rgba(225,0,15,0.25)] transition hover:-translate-y-0.5 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Kesit Al
              </button>
            </div>

            <button type="button" onClick={onStart} disabled={!canStart} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-red-500 bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-5 w-5" />
              Hemen Paylaş
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-700">
            <span className="flex items-center gap-2"><b className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white">1</b><LinkIcon className="h-4 w-4" /> Linki Yapıştır</span>
            <span className="text-red-300">--&gt;</span>
            <span className="flex items-center gap-2"><b className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white">2</b><Scissors className="h-4 w-4" /> Anı Seç</span>
            <span className="text-red-300">--&gt;</span>
            <span className="flex items-center gap-2"><b className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white">3</b><Share2 className="h-4 w-4" /> Paylaş</span>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_30px_100px_rgba(15,23,42,0.18)] ring-1 ring-black/10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3 font-black"><span className="h-7 w-7 rounded-full bg-gradient-to-br from-red-500 to-red-700" />Editor</div>
              <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">1080p</span>
            </div>

            <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
              <img src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200" alt="Olinkbu editor preview" className="h-full w-full object-cover opacity-90" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <button type="button" className="flex h-20 w-20 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:scale-105">
                  <Play className="ml-1 h-10 w-10 fill-current" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/80 px-5 py-3 text-sm font-bold text-white">
                <span>04:30 / 06:20</span>
                <span>▶</span>
                <span>⛶</span>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex justify-between px-12 text-xs font-bold text-slate-400"><span>04:00</span><span>04:30</span><span>05:00</span><span>05:30</span><span>06:00</span></div>
              <div className="relative h-20 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-black/5">
                <div className="absolute inset-x-4 top-1/2 h-10 -translate-y-1/2 bg-[repeating-linear-gradient(90deg,#cbd5e1_0_3px,transparent_3px_8px)] opacity-90" />
                <div className="absolute left-[36%] right-[18%] top-3 bottom-3 rounded-2xl border-2 border-red-500 bg-red-500/10 shadow-[0_0_35px_rgba(225,0,15,0.18)]" />
                <div className="absolute left-[35.5%] top-5 bottom-5 w-3 rounded-full bg-red-600" />
                <div className="absolute right-[17.5%] top-5 bottom-5 w-3 rounded-full bg-red-600" />
              </div>

              <div className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.10)] ring-1 ring-black/5">
                <img src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=160" className="h-20 w-20 rounded-xl object-cover" alt="clip thumbnail" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500">Oluşturulan Kesit</p>
                  <h3 className="text-lg font-black text-slate-950">Yolculuğun En Güzel Yeri</h3>
                  <p className="text-sm font-semibold text-slate-500">00:04:30 – 00:05:00</p>
                </div>
                <button type="button" className="hidden rounded-xl bg-red-600 px-6 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(225,0,15,0.25)] sm:inline-flex">
                  Linki Kopyala <Copy className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-5 -right-5 hidden rounded-2xl bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-black/5 xl:block">
            <p className="mb-4 text-xs font-black uppercase text-slate-900">Hemen Paylaş</p>
            <div className="flex gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-green-500 text-white">↗</span>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-black text-white">𝕏</span>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600"><LinkIcon className="h-5 w-5" /></span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-10 grid gap-4 rounded-[1.5rem] bg-white p-5 shadow-[0_20px_80px_rgba(15,23,42,0.10)] ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-5">
        {featureItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-center gap-4 lg:border-r lg:border-slate-200 lg:last:border-r-0">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-950"><Icon className="h-7 w-7" /></span>
              <span><b className="block text-base font-black text-slate-950">{item.title}</b><small className="text-sm font-medium text-slate-500">{item.subtitle}</small></span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
