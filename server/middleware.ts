import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// 1. IP-based Rate Limiter (In-Memory + File Persistence)
const ipCache = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 12 * 60 * 60 * 1000; // 12 hours
const MAX_REQUESTS = 3; // 3 generations per 12 hours
const IP_LIMITS_FILE = path.join(process.cwd(), 'server', 'ip_limits.json');

const saveIpCacheToFile = () => {
  try {
    const data: Record<string, { count: number; resetTime: number }> = {};
    for (const [ip, record] of ipCache.entries()) {
      data[ip] = record;
    }
    fs.writeFileSync(IP_LIMITS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[RateLimiter] Failed to save ipCache to file:', error);
  }
};

const loadIpCacheFromFile = () => {
  try {
    if (fs.existsSync(IP_LIMITS_FILE)) {
      const content = fs.readFileSync(IP_LIMITS_FILE, 'utf-8');
      const data = JSON.parse(content);
      const now = Date.now();
      for (const ip of Object.keys(data)) {
        const record = data[ip];
        if (now <= record.resetTime) {
          ipCache.set(ip, record);
        }
      }
    }
  } catch (error) {
    console.error('[RateLimiter] Failed to load ipCache from file:', error);
  }
};

// Initialize cache from file on startup
loadIpCacheFromFile();

export const getClientIp = (req: Request): string => {
  // Prioritize Cloudflare client IP, then Real IP, then Forwarded chain, then fallback
  let ip = (req.headers['cf-connecting-ip'] as string) || 
           (req.headers['x-real-ip'] as string);

  if (!ip && req.headers['x-forwarded-for']) {
    const forwarded = req.headers['x-forwarded-for'] as string;
    ip = forwarded.split(',')[0].trim();
  }

  const resolvedIp = ip || req.ip;
  if (!resolvedIp) {
    // Safety fallback: Generate a random ID per request to prevent locking out all undetected clients globally
    return `unknown_fallback_${Math.random().toString(36).substring(2, 9)}`;
  }
  return resolvedIp;
};

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = ipCache.get(ip);

  if (!record || now > record.resetTime) {
    ipCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    saveIpCacheToFile();
    return next();
  }

  if (record.count >= MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many requests. You can only generate 3 documents every 12 hours.'
    });
  }

  record.count += 1;
  saveIpCacheToFile();
  next();
};

export const getRateLimit = (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = ipCache.get(ip);

  if (!record || now > record.resetTime) {
    res.json({ count: 0, limit: MAX_REQUESTS });
    return;
  }

  res.json({ count: record.count, limit: MAX_REQUESTS });
};


