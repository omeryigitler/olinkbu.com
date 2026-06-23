import express from "express";
import path from "path";
import os from "os";
import { promises as fs } from "fs";
import { spawn } from "child_process";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import axios from "axios";

const DEFAULT_PORT = 3000;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const STORY_VIDEO_DURATION_SECONDS = 6.2;
const MAX_UPLOAD_SIZE_MB = 220;
const SPOTIFY_FALLBACK_THUMBNAIL =
  "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800";

type StoryVideoRequest = {
  title?: string;
  category?: string;
  range?: string;
  link?: string;
  startSec?: string | number;
  endSec?: string | number;
};

function isSpotifyTrackUrl(rawUrl: string) {
  try {
    const parsedUrl = new URL(rawUrl);
    return parsedUrl.hostname === "open.spotify.com" && parsedUrl.pathname.startsWith("/track/");
  } catch {
    return false;
  }
}

function normalizeText(value: unknown, fallback: string, maxLength = 120) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

function normalizeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function wrapText(value: string, maxChars = 24, maxLines = 3) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines) break;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine);
  return lines.join("\n");
}

function compactLink(value: string) {
  if (value.length <= 42) return value;
  return `${value.slice(0, 39)}...`;
}

function ffmpegTextFilePath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function getClipTiming(payload: StoryVideoRequest, fallbackDuration = STORY_VIDEO_DURATION_SECONDS) {
  const rawStart = Math.max(0, normalizeNumber(payload.startSec, 0));
  const rawEnd = Math.max(0, normalizeNumber(payload.endSec, rawStart + fallbackDuration));
  const duration = Math.min(60, Math.max(3, rawEnd > rawStart ? rawEnd - rawStart : fallbackDuration));
  return { start: rawStart, duration };
}

async function resolveFfmpegCommand() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;

  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{ default?: string }>;
    const ffmpegStatic = await dynamicImport("ffmpeg-static");
    if (ffmpegStatic.default) return ffmpegStatic.default;
  } catch {
    // Optional dependency is not installed; fall back to system ffmpeg.
  }

  return "ffmpeg";
}

function runFfmpeg(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("FFmpeg timed out."));
    }, 60000);

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `FFmpeg exited with code ${code}`));
    });
  });
}

async function writeOverlayTextFiles(payload: StoryVideoRequest, id: string) {
  const title = wrapText(normalizeText(payload.title, "Hissiyatı anında yakala", 96));
  const category = normalizeText(payload.category, "#olinkbu", 28).replace(/^#?/, "#").toUpperCase();
  const range = normalizeText(payload.range, "Paylaşılabilir an", 42);
  const link = compactLink(normalizeText(payload.link, "olinkbu.com", 120));
  const tempDir = os.tmpdir();
  const titleFile = path.join(tempDir, `olinkbu-title-${id}.txt`);
  const categoryFile = path.join(tempDir, `olinkbu-category-${id}.txt`);
  const rangeFile = path.join(tempDir, `olinkbu-range-${id}.txt`);
  const linkFile = path.join(tempDir, `olinkbu-link-${id}.txt`);

  await Promise.all([
    fs.writeFile(titleFile, title, "utf8"),
    fs.writeFile(categoryFile, category, "utf8"),
    fs.writeFile(rangeFile, range, "utf8"),
    fs.writeFile(linkFile, link, "utf8"),
  ]);

  return { titleFile, categoryFile, rangeFile, linkFile };
}

function storyCardFilter(payloadFiles: Awaited<ReturnType<typeof writeOverlayTextFiles>>, duration: number) {
  const titlePath = ffmpegTextFilePath(payloadFiles.titleFile);
  const categoryPath = ffmpegTextFilePath(payloadFiles.categoryFile);
  const rangePath = ffmpegTextFilePath(payloadFiles.rangeFile);
  const linkPath = ffmpegTextFilePath(payloadFiles.linkFile);

  return [
    "drawbox=x=0:y=0:w=1080:h=1920:color=0xffffff:t=fill",
    "drawbox=x=0:y=1320:w=1080:h=600:color=0xfff5f5:t=fill",
    `drawbox=x=72:y=92:w='max(170,936*min(1,t/${duration}))':h=18:color=0xe10600:t=fill`,
    "drawbox=x=72:y=880:w=936:h=520:color=0xffffff:t=fill",
    "drawbox=x=112:y=928:w=230:h=58:color=0xe10600:t=fill",
    `drawtext=textfile='${categoryPath}':x=136:y=945:fontcolor=0xffffff:fontsize=28`,
    "drawtext=text='olinkbu':x=72:y=150:fontcolor=0x080808:fontsize=92",
    "drawtext=text='HISSIYATI':x=72:y='520-(1-min(1,t/0.9))*70':fontcolor=0x111827:fontsize=96",
    "drawtext=text='ANINDA':x=72:y='640-(1-min(1,t/0.9))*70':fontcolor=0xe10600:fontsize=96",
    "drawtext=text='YAKALA.':x=72:y='760-(1-min(1,t/0.9))*70':fontcolor=0x111827:fontsize=96",
    `drawtext=textfile='${titlePath}':x=112:y=1060:fontcolor=0x0f172a:fontsize=58:line_spacing=16`,
    `drawtext=textfile='${rangePath}':x=112:y=1300:fontcolor=0x64748b:fontsize=34`,
    "drawbox=x=112:y=1438:w=856:h=26:color=0xf7c9c7:t=fill",
    `drawbox=x=112:y=1438:w='856*min(1,t/${duration})':h=26:color=0xe10600:t=fill`,
    "drawbox=x=112:y=1486:w=856:h=112:color=0xe10600:t=fill",
    "drawtext=text='STORY  REELS  POST':x=168:y=1528:fontcolor=0xffffff:fontsize=36",
    `drawtext=textfile='${linkPath}':x=112:y=1695:fontcolor=0x475569:fontsize=30`,
    "drawtext=text='PAYLASILABILIR VIDEO':x=112:y=1808:fontcolor=0xe10600:fontsize=26",
    "format=yuv420p",
  ].join(",");
}

function uploadedVideoFilter(payloadFiles: Awaited<ReturnType<typeof writeOverlayTextFiles>>) {
  const titlePath = ffmpegTextFilePath(payloadFiles.titleFile);
  const categoryPath = ffmpegTextFilePath(payloadFiles.categoryFile);
  const linkPath = ffmpegTextFilePath(payloadFiles.linkFile);

  return [
    "scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    "drawbox=x=0:y=0:w=1080:h=220:color=0x000000@0.42:t=fill",
    "drawbox=x=0:y=1580:w=1080:h=340:color=0x000000@0.56:t=fill",
    "drawtext=text='olinkbu':x=72:y=82:fontcolor=0xffffff:fontsize=70",
    "drawbox=x=72:y=172:w=936:h=14:color=0xe10600:t=fill",
    "drawbox=x=72:y=1646:w=230:h=58:color=0xe10600:t=fill",
    `drawtext=textfile='${categoryPath}':x=96:y=1663:fontcolor=0xffffff:fontsize=28`,
    `drawtext=textfile='${titlePath}':x=72:y=1740:fontcolor=0xffffff:fontsize=52:line_spacing=14`,
    `drawtext=textfile='${linkPath}':x=72:y=1878:fontcolor=0xffffff@0.78:fontsize=28`,
    "format=yuv420p",
  ].join(",");
}

async function createStoryVideo(payload: StoryVideoRequest) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const outputPath = path.join(os.tmpdir(), `olinkbu-instagram-card-${id}.mp4`);
  const textFiles = await writeOverlayTextFiles(payload, id);
  const duration = STORY_VIDEO_DURATION_SECONDS;
  const filter = storyCardFilter(textFiles, duration);
  const ffmpeg = await resolveFfmpegCommand();

  const args = [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=white:s=1080x1920:r=30:d=${duration}`,
    "-f",
    "lavfi",
    "-i",
    `anullsrc=channel_layout=stereo:sample_rate=44100:d=${duration}`,
    "-filter_complex",
    `[0:v]${filter}[v]`,
    "-map",
    "[v]",
    "-map",
    "1:a",
    "-t",
    String(duration),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-profile:v",
    "baseline",
    "-level",
    "3.1",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-movflags",
    "+faststart",
    outputPath,
  ];

  const tempFiles = [textFiles.titleFile, textFiles.categoryFile, textFiles.rangeFile, textFiles.linkFile, outputPath];
  try {
    await runFfmpeg(ffmpeg, args);
    return { outputPath, tempFiles };
  } catch (error) {
    await Promise.allSettled(tempFiles.map((file) => fs.unlink(file)));
    throw error;
  }
}

async function createUploadedVideoClip(inputPath: string, payload: StoryVideoRequest) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const outputPath = path.join(os.tmpdir(), `olinkbu-instagram-video-${id}.mp4`);
  const textFiles = await writeOverlayTextFiles(payload, id);
  const { start, duration } = getClipTiming(payload, 12);
  const filter = uploadedVideoFilter(textFiles);
  const ffmpeg = await resolveFfmpegCommand();

  const args = [
    "-y",
    "-ss",
    String(start),
    "-i",
    inputPath,
    "-t",
    String(duration),
    "-filter_complex",
    `[0:v]${filter}[v]`,
    "-map",
    "[v]",
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-profile:v",
    "baseline",
    "-level",
    "3.1",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "-shortest",
    outputPath,
  ];

  const tempFiles = [inputPath, textFiles.titleFile, textFiles.categoryFile, textFiles.rangeFile, textFiles.linkFile, outputPath];
  try {
    await runFfmpeg(ffmpeg, args);
    return { outputPath, tempFiles };
  } catch (error) {
    await Promise.allSettled(tempFiles.map((file) => fs.unlink(file)));
    throw error;
  }
}

async function startServer() {
  const app = express();
  const upload = multer({
    dest: os.tmpdir(),
    limits: { fileSize: MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
  });

  app.use(express.json({ limit: "1mb" }));

  app.post("/api/story-video", async (req, res) => {
    try {
      const { outputPath, tempFiles } = await createStoryVideo(req.body || {});
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="olinkbu-instagram-card.mp4"');
      res.sendFile(outputPath, (error) => {
        Promise.allSettled(tempFiles.map((file) => fs.unlink(file))).catch(() => undefined);
        if (error) console.error("Story video send error:", error);
      });
    } catch (error: any) {
      console.error("Story video generation failed:", error?.message || error);
      res.status(501).json({ error: "Story video renderer is not available on this server." });
    }
  });

  app.post("/api/render-uploaded-video", upload.single("video"), async (req, res) => {
    const uploadedFile = req.file;
    if (!uploadedFile) {
      return res.status(400).json({ error: "Video file is required." });
    }

    if (!uploadedFile.mimetype.startsWith("video/")) {
      await fs.unlink(uploadedFile.path).catch(() => undefined);
      return res.status(415).json({ error: "Only video files are supported." });
    }

    try {
      const { outputPath, tempFiles } = await createUploadedVideoClip(uploadedFile.path, req.body || {});
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="olinkbu-instagram-video.mp4"');
      res.sendFile(outputPath, (error) => {
        Promise.allSettled(tempFiles.map((file) => fs.unlink(file))).catch(() => undefined);
        if (error) console.error("Uploaded video send error:", error);
      });
    } catch (error: any) {
      console.error("Uploaded video render failed:", error?.message || error);
      await fs.unlink(uploadedFile.path).catch(() => undefined);
      res.status(500).json({ error: "Uploaded video could not be rendered." });
    }
  });

  // API Proxy for thumbnails (Spotify/YouTube/etc)
  app.get("/api/thumbnail", async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      console.log(`Proxying request for URL: ${url}`);
      
      // Handle Spotify oEmbed via Proxy
      if (isSpotifyTrackUrl(url)) {
        const cleanUrl = url.split("?")[0].split("#")[0];
        try {
          const params = new URLSearchParams({ url: cleanUrl });
          const spotifyOembedUrl = `https://open.spotify.com/oembed?${params.toString()}`;
          
          console.log(`Fetching from Spotify oEmbed (open): ${spotifyOembedUrl}`);
          
          let response;
          try {
            response = await axios.get(spotifyOembedUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              },
              timeout: 5000
            });
          } catch (firstErr: any) {
            console.log(`First attempt failed (${firstErr.message}), trying alternative subdomain...`);
            const altUrl = `https://embed.spotify.com/oembed/?${params.toString()}`;
            response = await axios.get(altUrl, { timeout: 5000 });
          }

          return res.json({ 
            thumbnail_url: response.data.thumbnail_url,
            title: response.data.title,
            provider: "spotify" 
          });
        } catch (axiosError: any) {
          console.error(`Spotify oEmbed failed for ${cleanUrl}: ${axiosError.message}`);
          return res.json({
            thumbnail_url: SPOTIFY_FALLBACK_THUMBNAIL,
            provider: "spotify",
            is_fallback: true
          });
        }
      }

      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        return res.json({ provider: "youtube" });
      }

      res.status(404).json({ error: "Provider not supported" });
    } catch (error: any) {
      console.error("Proxy main error:", error.message);
      res.status(500).json({ error: "Internal proxy error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
