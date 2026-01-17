import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const ALLOWED_ORIGINS = [
  'https://movie-timeline-three.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, action, ...body } = req.body;

    if (!model || typeof model !== 'string') {
      return res.status(400).json({ error: 'model parameter is required' });
    }

    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'action parameter is required' });
    }

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Gemini APIにリクエスト
    const url = `${GEMINI_BASE_URL}/${model}:${action}?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Gemini proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
