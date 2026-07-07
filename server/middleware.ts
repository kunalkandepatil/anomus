import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// 1. IP-based Rate Limiter (In-Memory + File Persistence)
// Tracks arrays of timestamps for each IP to implement sliding-window rate limiting.
const ipCache = new Map<string, number[]>();
const IP_LIMITS_FILE = path.join(process.cwd(), 'server', 'ip_limits.json');
let writeQueue = Promise.resolve();

// Safety limits:
// 1. Burst Limit: Max 2 requests per 1 minute (60,000 ms)
// 2. High Usage/Abuse Limit: Max 20 requests per 1 hour (3,600,000 ms)
const MINUTE_WINDOW = 60 * 1000;
const MINUTE_MAX = 2;
const HOUR_WINDOW = 60 * 60 * 1000;
const HOUR_MAX = 20;

const saveIpCacheToFile = () => {
  // Chain write operations sequentially to prevent race conditions and event-loop blocks
  writeQueue = writeQueue.then(async () => {
    try {
      const data: Record<string, number[]> = {};
      for (const [ip, timestamps] of ipCache.entries()) {
        data[ip] = timestamps;
      }
      await fs.promises.writeFile(IP_LIMITS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('[RateLimiter] Failed to save ipCache to file:', error);
    }
  });
};

const loadIpCacheFromFile = () => {
  try {
    if (fs.existsSync(IP_LIMITS_FILE)) {
      const content = fs.readFileSync(IP_LIMITS_FILE, 'utf-8');
      const data = JSON.parse(content);
      const now = Date.now();
      for (const ip of Object.keys(data)) {
        const timestamps = data[ip];
        if (Array.isArray(timestamps)) {
          // Filter out timestamps older than the maximum window (1 hour)
          const validTimestamps = timestamps.filter(t => now - t <= HOUR_WINDOW);
          if (validTimestamps.length > 0) {
            ipCache.set(ip, validTimestamps);
          }
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
  
  let timestamps = ipCache.get(ip) || [];
  
  // Prune timestamps older than 1 hour (maximum window size)
  timestamps = timestamps.filter(t => now - t <= HOUR_WINDOW);
  
  // 1. Check Burst Limit (last minute)
  const minuteCount = timestamps.filter(t => now - t <= MINUTE_WINDOW).length;
  if (minuteCount >= MINUTE_MAX) {
    return res.status(429).json({
      error: 'Please wait a moment before generating another document (max 2 per minute).'
    });
  }
  
  // 2. Check Hourly Limit (last hour)
  if (timestamps.length >= HOUR_MAX) {
    return res.status(429).json({
      error: 'Hourly document limit reached (max 20 per hour). Please try again later.'
    });
  }
  
  // Add current request timestamp
  timestamps.push(now);
  ipCache.set(ip, timestamps);
  saveIpCacheToFile();
  next();
};

export const getRateLimit = (req: Request, res: Response) => {
  // Return null limit to denote unlimited to the client if queried
  res.json({ count: 0, limit: null });
};



