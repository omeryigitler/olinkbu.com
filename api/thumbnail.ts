import axios from 'axios';

const SPOTIFY_FALLBACK_THUMBNAIL =
  'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800';

function isSpotifyTrackUrl(rawUrl: string) {
  try {
    const parsedUrl = new URL(rawUrl);
    return parsedUrl.hostname === 'open.spotify.com' && parsedUrl.pathname.startsWith('/track/');
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = typeof req.query.url === 'string' ? req.query.url : '';
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (isSpotifyTrackUrl(url)) {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const params = new URLSearchParams({ url: cleanUrl });
    const spotifyOembedUrl = `https://open.spotify.com/oembed?${params.toString()}`;

    try {
      let response;
      try {
        response = await axios.get(spotifyOembedUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 5000,
        });
      } catch {
        const altUrl = `https://embed.spotify.com/oembed/?${params.toString()}`;
        response = await axios.get(altUrl, { timeout: 5000 });
      }

      return res.status(200).json({
        thumbnail_url: response.data.thumbnail_url,
        title: response.data.title,
        provider: 'spotify',
      });
    } catch (error: any) {
      console.error(`Spotify oEmbed failed for ${cleanUrl}: ${error.message}`);
      return res.status(200).json({
        thumbnail_url: SPOTIFY_FALLBACK_THUMBNAIL,
        provider: 'spotify',
        is_fallback: true,
      });
    }
  }

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return res.status(200).json({ provider: 'youtube' });
  }

  return res.status(404).json({ error: 'Provider not supported' });
}
