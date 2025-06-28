require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");

// 라우트 및 설정 import
const { initDatabase } = require("./models");
const { swaggerUi, specs } = require('./config/swagger');
const { generalLimiter, xssProtection } = require('./middleware/security');
const authRoutes = require("./routes/auth");
const apiRoutes = require("./routes/api");
const userRoutes = require("./routes/users");
const matchingRoutes = require("./routes/matching-new");

const app = express();
const PORT = process.env.PORT || 8080;

// 보안 미들웨어
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

// Rate limiting 적용
app.use(generalLimiter);

// XSS 방어 미들웨어
app.use(xssProtection);

// CORS 설정
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);

// JSON 파싱 미들웨어
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 정적 파일 서빙 (업로드된 이미지)
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use("/uploads", express.static(uploadsPath));

// API 라우트
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);
// app.use('/api/users', userRoutes);
app.use("/api", matchingRoutes);

// Swagger API 문서
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '멘토-멘티 매칭 API 문서',
}));

// OpenAPI JSON 엔드포인트
app.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// 루트 경로에서 Swagger UI로 리다이렉트
app.get("/", (req, res) => {
  res.redirect('/api-docs');
});

// 건강 상태 체크 라우트
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 에러 핸들러
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// 에러 핸들러
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);

  // Multer 에러 처리
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "File too large",
      details: "Maximum file size is 1MB",
    });
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      error: "Invalid file",
      details: "Unexpected file field",
    });
  }

  // Sequelize 에러 처리
  if (error.name === "SequelizeValidationError") {
    return res.status(400).json({
      error: "Validation error",
      details: error.errors.map(err => err.message),
    });
  }

  if (error.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      error: "Resource already exists",
    });
  }

  // JWT 에러 처리
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid token",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Token expired",
    });
  }

  // 프로덕션에서는 상세 에러 정보 숨김
  const isDevelopment = process.env.NODE_ENV === "development";
  
  res.status(error.status || 500).json({
    error: "Internal server error",
    ...(isDevelopment && { details: error.message, stack: error.stack }),
  });
});

// 서버 시작
const startServer = async () => {
  try {
    // 데이터베이스 초기화
    await initDatabase();
    console.log("✅ Database initialized successfully");

    // 서버 시작
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  process.exit(0);
});

// 예외 처리
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// 서버 시작
startServer();

module.exports = app;
