import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { rateLimit } from '../lib/rateLimit.js';

// Groq API Key (server-side only, no VITE_ prefix)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// CORS allowed origins
const ALLOWED_ORIGINS = [
  'https://movie-timeline-three.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

// Request validation schema (OpenAI-compatible)
const requestSchema = z.object({
  model: z.string().default('llama-3.3-70b-versatile'),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    })
  ),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(8192).optional(),
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
  if (!GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not set');
    return res.status(500).json({ error: 'Groq API key not configured' });
  }

  try {
    // Rate limiting: 120 requests per hour (final fallback AI)
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
    const rateLimitResult = await rateLimit(ip, 120, 3600);

    if (!rateLimitResult.success) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        resetTime: rateLimitResult.resetTime,
      });
    }

    // Validate request body
    const validatedData = requestSchema.parse(req.body);

    // Call Groq API (OpenAI-compatible)
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: validatedData.model,
        messages: validatedData.messages,
        temperature: validatedData.temperature ?? 0.1,
        max_tokens: validatedData.max_tokens ?? 2048,
        stream: validatedData.stream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Groq API error',
        details: errorText,
      });
    }

    const data = await response.json();

    // Return response
    return res.status(200).json(data);
  } catch (error) {
    console.error('Groq proxy error:', error);

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
