const rateLimit = require("express-rate-limit");
const xss = require("xss");
const validator = require("validator");

// Rate limiting 설정
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000),
      });
    },
  });
};

// 일반 API용 레이트 리미팅 (분당 100회)
const generalLimiter = createRateLimit(
  60 * 1000, // 1분
  100,
  "Too many requests from this IP, please try again later."
);

// 인증 API용 레이트 리미팅 (분당 5회)
const authLimiter = createRateLimit(
  60 * 1000, // 1분
  5,
  "Too many authentication attempts, please try again later."
);

// 이미지 업로드용 레이트 리미팅 (분당 10회)
const uploadLimiter = createRateLimit(
  60 * 1000, // 1분
  10,
  "Too many upload attempts, please try again later."
);

// XSS 방어 함수
const sanitizeInput = (input) => {
  if (typeof input === "string") {
    return xss(input, {
      whiteList: {}, // 모든 HTML 태그 제거
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script"],
    });
  }
  return input;
};

// 재귀적으로 객체의 모든 문자열 값을 sanitize
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === "string") {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
};

// XSS 방어 미들웨어
const xssProtection = (req, res, next) => {
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    next();
  } catch (error) {
    console.error("XSS protection error:", error);
    res.status(400).json({ error: "Invalid input detected" });
  }
};

// 입력 검증 헬퍼 함수들
const validateInput = {
  email: (email) => {
    return validator.isEmail(email) && validator.isLength(email, { min: 5, max: 254 });
  },
  
  password: (password) => {
    return validator.isLength(password, { min: 8, max: 128 }) &&
           /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password); // 최소 1개의 소문자, 대문자, 숫자
  },
  
  name: (name) => {
    return validator.isLength(name, { min: 1, max: 100 }) &&
           /^[a-zA-Z가-힣\s]+$/.test(name);
  },
  
  bio: (bio) => {
    return !bio || validator.isLength(bio, { min: 0, max: 1000 });
  },
  
  message: (message) => {
    return !message || validator.isLength(message, { min: 0, max: 500 });
  },
  
  skills: (skills) => {
    if (!Array.isArray(skills)) return false;
    return skills.every(skill => 
      typeof skill === "string" && 
      validator.isLength(skill, { min: 1, max: 50 })
    );
  }
};

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  xssProtection,
  sanitizeInput,
  sanitizeObject,
  validateInput,
};
