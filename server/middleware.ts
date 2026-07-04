import { Request, Response, NextFunction } from 'express';

// 1. IP-based Rate Limiter (In-Memory)
const ipCache = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5; // 5 generations per hour

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
      error: 'Too many requests. You can only generate 5 documents per hour.'
    });
  }

  record.count += 1;
  next();
};

