const express = require("express");
const Joi = require("joi");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { User } = require("../models");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/profiles");
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// 프로필 업데이트 검증 스키마
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  bio: Joi.string().optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  experience: Joi.number().integer().min(0).optional(),
  hourlyRate: Joi.number().positive().optional(),
});

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: 내 프로필 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: 프로필 업데이트
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               bio:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               experience:
 *                 type: integer
 *               hourlyRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: 프로필 업데이트 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 필요
 */
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    // 요청 데이터 검증
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation error",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { name, bio, skills, experience, hourlyRate } = value;

    // 사용자 조회
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 업데이트 데이터 준비
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (skills !== undefined) updateData.skills = skills;

    // 멘토인 경우만 experience와 hourlyRate 업데이트
    if (user.role === "mentor") {
      if (experience !== undefined) updateData.experience = experience;
      if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    }

    // 프로필 업데이트
    await user.update(updateData);

    // 업데이트된 사용자 정보 조회
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/users/profile/image:
 *   post:
 *     summary: 프로필 이미지 업로드
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 이미지 업로드 성공
 *       400:
 *         description: 잘못된 파일
 *       401:
 *         description: 인증 필요
 */
router.post(
  "/profile/image",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // 기존 이미지 파일 삭제
      if (user.profileImage) {
        const oldImagePath = path.join(
          __dirname,
          "../uploads/profiles",
          path.basename(user.profileImage),
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // 새 이미지 경로 저장
      const imageUrl = `/uploads/profiles/${req.file.filename}`;
      await user.update({ profileImage: imageUrl });

      res.json({
        message: "Profile image uploaded successfully",
        imageUrl,
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * @swagger
 * /api/users/mentors:
 *   get:
 *     summary: 멘토 목록 조회
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: 스킬 필터 (쉼표로 구분)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 멘토 목록 조회 성공
 */
router.get("/mentors", async (req, res) => {
  try {
    const { skills, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 기본 조건
    const whereCondition = {
      role: "mentor",
      isActive: true,
    };

    // 스킬 필터링
    if (skills) {
      const skillArray = skills.split(",").map((skill) => skill.trim());
      // SQLite에서 JSON 검색을 위한 조건
      whereCondition.skills = {
        [require("sequelize").Op.or]: skillArray.map((skill) => ({
          [require("sequelize").Op.like]: `%"${skill}"%`,
        })),
      };
    }

    const mentors = await User.findAndCountAll({
      where: whereCondition,
      attributes: { exclude: ["password"] },
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      mentors: mentors.rows,
      pagination: {
        total: mentors.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(mentors.count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Mentors fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: 특정 사용자 프로필 조회
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 사용자 프로필 조회 성공
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("User fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
