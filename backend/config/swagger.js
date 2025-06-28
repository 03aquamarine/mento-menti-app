const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "멘토-멘티 매칭 API",
      version: "1.0.0",
      description: "멘토와 멘티를 매칭해주는 서비스의 RESTful API",
      contact: {
        name: "API Support",
        email: "support@mentormatching.com",
      },
    },
    servers: [
      {
        url: "http://localhost:8080",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "사용자 ID",
            },
            email: {
              type: "string",
              format: "email",
              description: "이메일",
            },
            name: {
              type: "string",
              description: "이름",
            },
            role: {
              type: "string",
              enum: ["mentor", "mentee"],
              description: "역할",
            },
            bio: {
              type: "string",
              description: "자기소개",
            },
            skills: {
              type: "array",
              items: {
                type: "string",
              },
              description: "보유 스킬",
            },
            experience: {
              type: "integer",
              description: "경험 년수 (멘토만)",
            },
            hourlyRate: {
              type: "number",
              description: "시간당 요금 (멘토만)",
            },
            profileImage: {
              type: "string",
              description: "프로필 이미지 URL",
            },
            isActive: {
              type: "boolean",
              description: "계정 활성화 상태",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "계정 생성일",
            },
          },
        },
        MatchingRequest: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "매칭 요청 ID",
            },
            menteeId: {
              type: "integer",
              description: "멘티 ID",
            },
            mentorId: {
              type: "integer",
              description: "멘토 ID",
            },
            message: {
              type: "string",
              description: "요청 메시지",
            },
            status: {
              type: "string",
              enum: ["pending", "accepted", "rejected"],
              description: "요청 상태",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "요청 생성일",
            },
            mentor: {
              $ref: "#/components/schemas/User",
            },
            mentee: {
              $ref: "#/components/schemas/User",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "에러 메시지",
            },
            details: {
              type: "array",
              items: {
                type: "string",
              },
              description: "상세 에러 정보",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Auth",
        description: "인증 관련 API",
      },
      {
        name: "Users",
        description: "사용자 관련 API",
      },
      {
        name: "Matching",
        description: "매칭 관련 API",
      },
      {
        name: "Images",
        description: "이미지 관련 API",
      },
      {
        name: "System",
        description: "시스템 관련 API",
      },
    ],
  },
  apis: ["./routes/*.js"], // API 문서가 있는 파일 경로
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};
