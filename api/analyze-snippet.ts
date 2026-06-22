import { GoogleGenAI } from '@google/genai';
import { applyRateLimitHeaders, checkRateLimit, getRequestIp } from '../src/server/rateLimit';
import { verifyFirebaseIdTokenFromRequest } from '../src/server/firebaseAuth';

type TasteDna = 'Deep Thinker' | 'Music Hunter' | 'Cinema Eye' | 'Chaos Energy' | 'Motivation Collector';

type AnalyzeSnippetRequest = {
  note?: string;
  title?: string;
  transcript?: string;
  platform?: 'youtube' | 'spotify';
  videoUrl?: string;
};

type AnalyzeSnippetResponse = {
  dna: TasteDna;
  category: string;
  confidence: number;
  moodTags: string[];
  goldenQuote: string;
  shareHook: string;
  safety: {
    needsReview: boolean;
    reason?: string;
  };
};

const DNA_VALUES: TasteDna[] = [
  'Deep Thinker',
  'Music Hunter',
  'Cinema Eye',
  'Chaos Energy',
  'Motivation Collector',
];

const fallbackResponse: AnalyzeSnippetResponse = {
  dna: 'Deep Thinker',
  category: '#felsefe',
  confidence: 0.35,
  moodTags: ['curated', 'moment', 'identity'],
  goldenQuote: '',
  shareHook: 'Found a moment worth saving.',
  safety: {
    needsReview: false,
  },
};

function safeString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function parseBody(req: any): AnalyzeSnippetRequest {
  if (!req.body) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body) as AnalyzeSnippetRequest;
  return req.body as AnalyzeSnippetRequest;
}

function validateAiResult(value: any): AnalyzeSnippetResponse {
  const dna = DNA_VALUES.includes(value?.dna) ? value.dna : fallbackResponse.dna;
  const category = safeString(value?.category, 40) || fallbackResponse.category;
  const confidence = typeof value?.confidence === 'number'
    ? Math.min(1, Math.max(0, value.confidence))
    : fallbackResponse.confidence;
  const moodTags = Array.isArray(value?.moodTags)
    ? value.moodTags.map((tag: unknown) => safeString(tag, 24)).filter(Boolean).slice(0, 5)
    : fallbackResponse.moodTags;
  const goldenQuote = safeString(value?.goldenQuote, 160);
  const shareHook = safeString(value?.shareHook, 160) || fallbackResponse.shareHook;

  return {
    dna,
    category: category.startsWith('#') ? category : `#${category}`,
    confidence,
    moodTags,
    goldenQuote,
    shareHook,
    safety: {
      needsReview: Boolean(value?.safety?.needsReview),
      reason: safeString(value?.safety?.reason, 120) || undefined,
    },
  };
}

async function runGeminiAnalysis(input: Required<Pick<AnalyzeSnippetRequest, 'note'>> & AnalyzeSnippetRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const schema = {
    type: 'object',
    properties: {
      dna: { type: 'string', enum: DNA_VALUES },
      category: { type: 'string' },
      confidence: { type: 'number' },
      moodTags: { type: 'array', items: { type: 'string' } },
      goldenQuote: { type: 'string' },
      shareHook: { type: 'string' },
      safety: {
        type: 'object',
        properties: {
          needsReview: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['needsReview'],
      },
    },
    required: ['dna', 'category', 'confidence', 'moodTags', 'goldenQuote', 'shareHook', 'safety'],
  };

  const prompt = [
    'You are Olinkbu Taste DNA classifier.',
    'Classify the media moment by emotional taste identity, not by generic topic.',
    'Return Turkish-friendly labels and concise viral copy.',
    '',
    `Platform: ${input.platform || 'unknown'}`,
    `URL: ${input.videoUrl || ''}`,
    `Title: ${input.title || ''}`,
    `Curator note: ${input.note}`,
    `Transcript excerpt: ${input.transcript || ''}`,
  ].join('\n');

  const interaction = await (ai as any).interactions.create({
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    system_instruction:
      'You produce strict JSON for a taste-driven media identity platform. Never include markdown. Keep outputs short and safe.',
    input: prompt,
    generation_config: {
      thinking_level: 'low',
      temperature: 0.2,
    },
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema,
    },
  });

  return validateAiResult(JSON.parse(interaction.output_text));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getRequestIp(req);
  const ipLimit = checkRateLimit(`ai:ip:${ip}`, { max: 12, windowMs: 60_000 });
  applyRateLimitHeaders(res, ipLimit);

  if (!ipLimit.allowed) {
    return res.status(429).json({ error: 'Too many AI requests. Please slow down.' });
  }

  let user;
  try {
    user = await verifyFirebaseIdTokenFromRequest(req);
  } catch {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const userLimit = checkRateLimit(`ai:user:${user.uid}`, { max: 80, windowMs: 24 * 60 * 60 * 1000 });
  if (!userLimit.allowed) {
    applyRateLimitHeaders(res, userLimit);
    return res.status(429).json({ error: 'Daily AI limit reached.' });
  }

  let body: AnalyzeSnippetRequest;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  const note = safeString(body.note, 800);
  if (!note) {
    return res.status(400).json({ error: 'note is required.' });
  }

  const input = {
    note,
    title: safeString(body.title, 160),
    transcript: safeString(body.transcript, 2000),
    platform: body.platform,
    videoUrl: safeString(body.videoUrl, 1000),
  };

  try {
    const analysis = await runGeminiAnalysis(input);
    return res.status(200).json({ analysis });
  } catch (error: any) {
    console.error('AI analysis failed:', error.message);
    return res.status(503).json({
      error: 'AI analysis is temporarily unavailable.',
      fallback: fallbackResponse,
    });
  }
}
