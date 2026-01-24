import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { rateLimit } from '../lib/rateLimit.js';

// DeepSeek API Key (server-side only, no VITE_ prefix)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

// CORS allowed origins
const ALLOWED_ORIGINS = [
  'https://movie-timeline-three.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

// Request validation schema
const requestSchema = z.object({
  model: z.string().default('deepseek-chat'), // deepseek-chat or deepseek-coder
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    })
  ),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(4096).optional(),
  stream: z.boolean().optional().default(false),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS handling
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key
  if (!DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY is not set');
    return res.status(500).json({ error: 'DeepSeek API key not configured' });
  }

  try {
    // Rate limiting: 150 requests per hour (primary AI)
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
    const rateLimitResult = await rateLimit(ip, 150, 3600);

    if (!rateLimitResult.success) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        resetTime: rateLimitResult.resetTime,
      });
    }

    // Validate request body
    const validatedData = requestSchema.parse(req.body);

    // Call DeepSeek API (OpenAI-compatible)
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: validatedData.model,
        messages: validatedData.messages,
        temperature: validatedData.temperature ?? 0.7,
        max_tokens: validatedData.max_tokens ?? 2000,
        stream: validatedData.stream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'DeepSeek API error',
        details: errorText,
      });
    }

    const data = await response.json();

    // Return response
    return res.status(200).json(data);
  } catch (error) {
    console.error('DeepSeek proxy error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request parameters',
        details: error.errors,
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
