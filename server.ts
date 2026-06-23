import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";

const DEFAULT_PORT = 3000;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const SPOTIFY_FALLBACK_THUMBNAIL =
  "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800";

function isSpotifyTrackUrl(rawUrl: string) {
  try {
    const parsedUrl = new URL(rawUrl);
    return parsedUrl.hostname === "open.spotify.com" && parsedUrl.pathname.startsWith("/track/");
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();

  // JSON parsing for API requests
  app.use(express.json());

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
          // Send a generic music background if everything fails
          return res.json({
            thumbnail_url: SPOTIFY_FALLBACK_THUMBNAIL,
            provider: "spotify",
            is_fallback: true
          });
        }
      }

      // Handle YouTube info (optional if client handles youtube thumbnails)
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        return res.json({ provider: "youtube" });
      }

      res.status(404).json({ error: "Provider not supported" });
    } catch (error: any) {
      console.error("Proxy main error:", error.message);
      res.status(500).json({ error: "Internal proxy error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static files
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
