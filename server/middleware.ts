import { Request, Response, NextFunction } from 'express';

// 1. IP-based Rate Limiter (In-Memory)
const ipCache = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 12 * 60 * 60 * 1000; // 12 hours
const MAX_REQUESTS = 3; // 3 generations per 12 hours

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
  const now = Date.now();
  const record = ipCache.get(ip);

  if (!record || now > record.resetTime) {
    ipCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (record.count >= MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many requests. You can only generate 3 documents every 12 hours.'
    });
  }

  record.count += 1;
  next();
};

export const getRateLimit = (req: Request, res: Response) => {
  const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
  const now = Date.now();
  const record = ipCache.get(ip);

  if (!record || now > record.resetTime) {
    res.json({ count: 0, limit: MAX_REQUESTS });
    return;
  }

  res.json({ count: record.count, limit: MAX_REQUESTS });
};

