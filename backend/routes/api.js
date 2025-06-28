const express = require("express");
const { User, MatchingRequest } = require("../models");
const { authenticateToken } = require("../middleware/auth");
const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

const router = express.Router();

/**
 * @swagger
 * /api/me:
 *   get:
 *     summary: 내 정보 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const response = {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: {
        name: user.name,
        bio: user.bio,
        imageUrl: user.profileImage
          ? `/images/${user.role}/${user.id}`
          : `https://placehold.co/500x500.jpg?text=${user.role.toUpperCase()}`,
      },
    };

    // 멘토인 경우 스킬 추가
    if (user.role === "mentor") {
      response.profile.skills = user.skills || [];
    }

    res.json(response);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/images/{role}/{id}:
 *   get:
 *     summary: 프로필 이미지 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 역할
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 프로필 이미지
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 이미지를 찾을 수 없음
 */
router.get("/images/:role/:id", authenticateToken, async (req, res) => {
  try {
    const { role, id } = req.params;

    // 역할 검증
    if (!["mentor", "mentee"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // 사용자 존재 확인
    const user = await User.findOne({
      where: { id: parseInt(id), role },
      attributes: ["id", "profileImage"],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 프로필 이미지가 있는 경우 파일 서빙
    if (user.profileImage) {
      const imagePath = path.join(__dirname, '../uploads', user.profileImage);
      
      try {
        await fs.access(imagePath);
        return res.sendFile(imagePath);
      } catch (fileError) {
        console.error("Profile image file not found:", fileError);
        // 파일이 없으면 기본 이미지로 리다이렉트
      }
    }

    // 기본 이미지로 리다이렉트
    return res.redirect(
      `https://placehold.co/500x500.jpg?text=${role.toUpperCase()}`,
    );
  } catch (error) {
    console.error("Image fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: 프로필 수정
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
 *               id:
 *                 type: integer
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               bio:
 *                 type: string
 *               image:
 *                 type: string
 *                 description: BASE64 encoded image
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
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
    const { name, bio, image, skills } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 업데이트 데이터 준비
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;

    // 멘토인 경우 스킬 업데이트
    if (user.role === "mentor" && skills !== undefined) {
      updateData.skills = skills;
    }

    // Base64 이미지 처리
    if (image && image.length > 0) {
      try {
        // Base64 헤더 제거 (data:image/jpeg;base64, 등)
        const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // 이미지 크기 검증 (1MB 제한)
        if (imageBuffer.length > 1024 * 1024) {
          return res.status(400).json({ error: "Image size must be less than 1MB" });
        }

        // 이미지 메타데이터 확인
        const metadata = await sharp(imageBuffer).metadata();
        
        // 이미지 형식 검증 (jpeg, png만 허용)
        if (!['jpeg', 'jpg', 'png'].includes(metadata.format)) {
          return res.status(400).json({ error: "Only JPEG and PNG images are allowed" });
        }

        // 이미지 크기 검증 (500x500 ~ 1000x1000)
        if (metadata.width < 500 || metadata.height < 500 || 
            metadata.width > 1000 || metadata.height > 1000) {
          return res.status(400).json({ 
            error: "Image dimensions must be between 500x500 and 1000x1000 pixels" 
          });
        }

        // uploads 디렉토리 생성
        const uploadsDir = path.join(__dirname, '../uploads');
        try {
          await fs.mkdir(uploadsDir, { recursive: true });
        } catch (err) {
          // 디렉토리가 이미 존재하는 경우 무시
        }

        // 이미지 파일 저장
        const filename = `user-${user.id}.jpg`;
        const filepath = path.join(uploadsDir, filename);
        
        // JPEG 형식으로 변환하여 저장 (품질 90%)
        await sharp(imageBuffer)
          .jpeg({ quality: 90 })
          .toFile(filepath);

        updateData.profileImage = filename;
      } catch (imageError) {
        console.error("Image processing error:", imageError);
        return res.status(400).json({ error: "Invalid image format or processing failed" });
      }
    }

    // 프로필 업데이트
    await user.update(updateData);

    // 업데이트된 사용자 정보 조회
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    const response = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      profile: {
        name: updatedUser.name,
        bio: updatedUser.bio,
        imageUrl: updatedUser.profileImage
          ? `/images/${updatedUser.role}/${updatedUser.id}`
          : `https://placehold.co/500x500.jpg?text=${updatedUser.role.toUpperCase()}`,
      },
    };

    // 멘토인 경우 스킬 추가
    if (updatedUser.role === "mentor") {
      response.profile.skills = updatedUser.skills || [];
    }

    res.json(response);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/mentors:
 *   get:
 *     summary: 멘토 목록 조회 (멘티 전용)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: skill
 *         schema:
 *           type: string
 *         description: 스킬 필터
 *       - in: query
 *         name: order_by
 *         schema:
 *           type: string
 *           enum: [name, skill]
 *         description: 정렬 기준
 *     responses:
 *       200:
 *         description: 멘토 목록 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get("/mentors", authenticateToken, async (req, res) => {
  try {
    const { skill, order_by } = req.query;

    // 기본 조건
    const whereCondition = {
      role: "mentor",
      isActive: true,
    };

    // 스킬 필터링
    if (skill) {
      whereCondition.skills = {
        [require("sequelize").Op.like]: `%"${skill}"%`,
      };
    }

    // 정렬 조건
    let orderCondition = [["id", "ASC"]]; // 기본 정렬
    if (order_by === "name") {
      orderCondition = [["name", "ASC"]];
    } else if (order_by === "skill") {
      orderCondition = [["skills", "ASC"]];
    }

    const mentors = await User.findAll({
      where: whereCondition,
      attributes: { exclude: ["password"] },
      order: orderCondition,
    });

    const response = mentors.map((mentor) => ({
      id: mentor.id,
      email: mentor.email,
      role: mentor.role,
      profile: {
        name: mentor.name,
        bio: mentor.bio,
        imageUrl: mentor.profileImage
          ? `/images/${mentor.role}/${mentor.id}`
          : `https://placehold.co/500x500.jpg?text=${mentor.role.toUpperCase()}`,
        skills: mentor.skills || [],
      },
    }));

    res.json(response);
  } catch (error) {
    console.error("Mentors fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
