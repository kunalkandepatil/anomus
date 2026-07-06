import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

interface StudentRecord {
  name?: string;
  prn?: string;
  clientId?: string;
  count: number;
  resetTime: number;
}

interface IpRecord {
  globalCount: number;
  resetTime: number;
  students: StudentRecord[];
}

// 1. IP-based Rate Limiter (In-Memory + File Persistence)
const ipCache = new Map<string, IpRecord>();
const RATE_LIMIT_WINDOW = 12 * 60 * 60 * 1000; // 12 hours
const MAX_REQUESTS_PER_STUDENT = 3;
const IP_LIMITS_FILE = path.join(process.cwd(), 'server', 'ip_limits.json');
let writeQueue = Promise.resolve();

const saveIpCacheToFile = () => {
  // Chain write operations sequentially to prevent race conditions and event-loop blocks
  writeQueue = writeQueue.then(async () => {
    try {
      const data: Record<string, IpRecord> = {};
      for (const [ip, record] of ipCache.entries()) {
        data[ip] = record;
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

export const getStudentName = (req: Request): string | undefined => {
  const studentName = req.body?.studentName || req.query?.studentName;
  if (typeof studentName === 'string') {
    const parts = studentName
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return undefined;
    parts.sort();
    return parts.join(' ');
  }
  return undefined;
};

export const getStudentPrn = (req: Request): string | undefined => {
  const prn = req.body?.prn || req.body?.rollNumber || req.query?.prn || req.query?.rollNumber;
  if (typeof prn === 'string' || typeof prn === 'number') {
    const trimmed = String(prn).trim();
    return trimmed || undefined;
  }
  return undefined;
};

const findStudentRecord = (
  studentName?: string,
  studentPrn?: string,
  clientId?: string
): { student: StudentRecord; ipRecord: IpRecord; ip: string } | undefined => {
  const now = Date.now();
  for (const [ip, ipRecord] of ipCache.entries()) {
    if (now > ipRecord.resetTime) continue;
    for (const student of ipRecord.students) {
      if (now > student.resetTime) continue;
      if (studentPrn && student.prn === studentPrn) {
        return { student, ipRecord, ip };
      }
      if (clientId && student.clientId === clientId) {
        return { student, ipRecord, ip };
      }
      if (studentName && student.name === studentName) {
        return { student, ipRecord, ip };
      }
    }
  }
  return undefined;
};

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = getClientIp(req);
  const studentName = getStudentName(req);
  const studentPrn = getStudentPrn(req);
  const clientId = req.headers['x-client-id'] as string | undefined;
  const now = Date.now();

  let ipRecord = ipCache.get(ip);

  // Initialize IP record if not exists or expired
  if (!ipRecord || now > ipRecord.resetTime) {
    ipRecord = {
      globalCount: 0,
      resetTime: now + RATE_LIMIT_WINDOW,
      students: []
    };
    ipCache.set(ip, ipRecord);
  }

  // 1. Student record matching (checks Client ID, PRN, and Name combination globally)
  const match = findStudentRecord(studentName, studentPrn, clientId);

  if (match) {
    if (match.student.count >= MAX_REQUESTS_PER_STUDENT) {
      return res.status(429).json({
        error: `Too many requests. You can only generate ${MAX_REQUESTS_PER_STUDENT} documents every 12 hours.`
      });
    }
    match.student.count += 1;
    // Keep identifiers updated in case they weren't set on first request
    if (studentName && !match.student.name) match.student.name = studentName;
    if (studentPrn && !match.student.prn) match.student.prn = studentPrn;
    if (clientId && !match.student.clientId) match.student.clientId = clientId;

    // Move student record to the new IP if they switched networks
    if (match.ip !== ip) {
      match.ipRecord.students = match.ipRecord.students.filter(s => s !== match.student);
      ipRecord.students.push(match.student);
    }
  } else {
    // Create new student record under this IP
    const newStudent: StudentRecord = {
      name: studentName,
      prn: studentPrn,
      clientId: clientId,
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    };
    ipRecord.students.push(newStudent);
  }

  // Increment global IP request count
  ipRecord.globalCount += 1;

  saveIpCacheToFile();
  next();
};

export const getRateLimit = (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const studentName = getStudentName(req);
  const studentPrn = getStudentPrn(req);
  const clientId = req.headers['x-client-id'] as string | undefined;
  const now = Date.now();

  const match = findStudentRecord(studentName, studentPrn, clientId);

  if (!match) {
    const ipRecord = ipCache.get(ip);
    if (ipRecord && now <= ipRecord.resetTime && ipRecord.students.length === 0) {
      res.json({ count: Math.min(ipRecord.globalCount, MAX_REQUESTS_PER_STUDENT), limit: MAX_REQUESTS_PER_STUDENT });
      return;
    }
    res.json({ count: 0, limit: MAX_REQUESTS_PER_STUDENT });
    return;
  }

  res.json({ count: match.student.count, limit: MAX_REQUESTS_PER_STUDENT });
};

export const getRateLimitInfo = (req: Request) => {
  const ip = getClientIp(req);
  const clientId = req.headers['x-client-id'] as string | undefined;

  let count = 0;
  if (clientId) {
    const match = findStudentRecord(undefined, undefined, clientId);
    if (match) {
      count = match.student.count;
    }
  }
  return { ip, clientId, count };
};


