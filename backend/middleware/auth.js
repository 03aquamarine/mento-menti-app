const jwt = require("jsonwebtoken");
const { User } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// JWT 토큰 생성 (RFC 7519 표준 준수)
const generateToken = (user) => {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60; // 1시간 후 만료

  const payload = {
    // RFC 7519 표준 클레임
    iss: "mentor-mentee-app", // issuer
    sub: user.id.toString(), // subject (user ID)
    aud: "mentor-mentee-users", // audience
    exp: exp, // expiration time
    nbf: now, // not before
    iat: now, // issued at
    jti: `${user.id}-${now}`, // JWT ID

    // 커스텀 클레임
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET);
};

// JWT 토큰 검증 미들웨어
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.sub || decoded.userId; // RFC 7519 표준 클레임 'sub' 또는 호환성을 위한 'userId'
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(403).json({ error: "Invalid token" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ error: "Invalid token" });
  }
};

// 멘토 권한 체크 미들웨어
const requireMentor = (req, res, next) => {
  if (req.user.role !== "mentor") {
    return res.status(403).json({ error: "Mentor access required" });
  }
  next();
};

// 멘티 권한 체크 미들웨어
const requireMentee = (req, res, next) => {
  if (req.user.role !== "mentee") {
    return res.status(403).json({ error: "Mentee access required" });
  }
  next();
};

module.exports = {
  generateToken,
  authenticateToken,
  requireMentor,
  requireMentee,
};
