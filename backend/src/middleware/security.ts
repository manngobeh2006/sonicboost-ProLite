import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// =====================================================
// RATE LIMITING
// =====================================================

// Aggressive rate limiting for auth endpoints (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { success: false, error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests (only count failures)
  skipSuccessfulRequests: true,
});

// Strict rate limiting for password reset (prevent enumeration attacks)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: { success: false, error: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { success: false, error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// =====================================================
// INPUT SANITIZATION
// =====================================================

/**
 * Sanitize string inputs to prevent injection attacks
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove HTML/script tags
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    // Limit length
    .slice(0, 1000);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): { valid: boolean; error?: string } => {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password is too long (max 128 characters)' };
  }
  
  // Check for at least one letter and one number
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain both letters and numbers' };
  }
  
  return { valid: true };
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      const value = req.body[key];
      if (typeof value === 'string') {
        req.body[key] = sanitizeString(value);
      }
    });
  }
  next();
};

// =====================================================
// SECURITY HEADERS
// =====================================================

/**
 * Add security headers to all responses
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable browser XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'none';"
  );
  
  // Remove powered-by header (don't reveal tech stack)
  res.removeHeader('X-Powered-By');
  
  next();
};

// =====================================================
// REQUEST VALIDATION
// =====================================================

/**
 * Validate that request has required fields
 */
export const requireFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter(field => !req.body[field]);
    
    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      });
      return;
    }
    
    next();
  };
};

/**
 * Log suspicious activity
 */
export const logSuspiciousActivity = (req: Request, reason: string) => {
  console.warn('🚨 SECURITY ALERT:', {
    reason,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

// =====================================================
// IP-BASED PROTECTION
// =====================================================

/**
 * Simple in-memory store for failed attempts (use Redis in production)
 */
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

/**
 * Track failed login attempts by IP
 */
export const trackFailedLogin = (ip: string) => {
  const now = Date.now();
  const record = failedAttempts.get(ip) || { count: 0, lastAttempt: now };
  
  // Reset if last attempt was more than 1 hour ago
  if (now - record.lastAttempt > 60 * 60 * 1000) {
    record.count = 1;
  } else {
    record.count++;
  }
  
  record.lastAttempt = now;
  failedAttempts.set(ip, record);
  
  // Log if threshold exceeded
  if (record.count >= 5) {
    console.warn(`🚨 IP ${ip} has ${record.count} failed login attempts`);
  }
  
  return record.count;
};

/**
 * Check if IP should be temporarily blocked
 */
export const isIpBlocked = (ip: string): boolean => {
  const record = failedAttempts.get(ip);
  if (!record) return false;
  
  const now = Date.now();
  const timeSinceLastAttempt = now - record.lastAttempt;
  
  // Block if more than 10 attempts in last hour
  if (record.count >= 10 && timeSinceLastAttempt < 60 * 60 * 1000) {
    return true;
  }
  
  return false;
};

/**
 * Middleware to block suspicious IPs
 */
export const ipProtection = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  
  if (isIpBlocked(ip)) {
    logSuspiciousActivity(req, 'IP temporarily blocked due to excessive failed attempts');
    res.status(429).json({
      success: false,
      error: 'Too many failed attempts. Please try again later.'
    });
    return;
  }
  
  next();
};

// Clean up old records every hour
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  for (const [ip, record] of failedAttempts.entries()) {
    if (record.lastAttempt < oneHourAgo) {
      failedAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000);
