const express = require("express");
const Joi = require("joi");
const { MatchingRequest, User } = require("../models");
const {
  authenticateToken,
  requireMentee,
  requireMentor,
} = require("../middleware/auth");

const router = express.Router();

// 매칭 요청 생성 검증 스키마
const createRequestSchema = Joi.object({
  mentorId: Joi.number().integer().positive().required(),
  message: Joi.string().optional(),
});

// 매칭 요청 응답 검증 스키마
const respondRequestSchema = Joi.object({
  status: Joi.string().valid("accepted", "rejected").required(),
});

/**
 * @swagger
 * /api/matching/requests:
 *   post:
 *     summary: 멘토링 요청 생성 (멘티용)
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mentorId
 *             properties:
 *               mentorId:
 *                 type: integer
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: 매칭 요청 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 멘티 권한 필요
 */
router.post(
  "/match-requests",
  authenticateToken,
  requireMentee,
  async (req, res) => {
    try {
      // 요청 데이터 검증
      const { error, value } = createRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation error",
          details: error.details.map((detail) => detail.message),
        });
      }

      const { mentorId, message } = value;

      // 멘토 존재 확인
      const mentor = await User.findOne({
        where: { id: mentorId, role: "mentor", isActive: true },
      });

      if (!mentor) {
        return res.status(404).json({ error: "Mentor not found or inactive" });
      }

      // 자기 자신에게 요청하는지 확인
      if (mentorId === req.user.id) {
        return res
          .status(400)
          .json({ error: "Cannot request mentoring from yourself" });
      }

      // 이미 요청이 있는지 확인
      const existingRequest = await MatchingRequest.findOne({
        where: {
          menteeId: req.user.id,
          mentorId,
          status: "pending",
        },
      });

      if (existingRequest) {
        return res
          .status(409)
          .json({ error: "Pending request already exists" });
      }

      // 매칭 요청 생성
      const matchingRequest = await MatchingRequest.create({
        menteeId: req.user.id,
        mentorId,
        message,
        status: "pending",
      });

      // 요청 정보와 함께 멘토/멘티 정보도 포함해서 응답
      const requestWithDetails = await MatchingRequest.findByPk(
        matchingRequest.id,
        {
          include: [
            {
              model: User,
              as: "mentor",
              attributes: { exclude: ["password"] },
            },
            {
              model: User,
              as: "mentee",
              attributes: { exclude: ["password"] },
            },
          ],
        },
      );

      res.status(201).json({
        message: "Matching request created successfully",
        request: requestWithDetails,
      });
    } catch (error) {
      console.error("Matching request creation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * @swagger
 * /api/matching/requests:
 *   get:
 *     summary: 내 매칭 요청 목록 조회
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sent, received]
 *         description: 요청 타입 (sent=보낸 요청, received=받은 요청)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *         description: 요청 상태
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
 *         description: 매칭 요청 목록 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get("/match-requests/incoming", authenticateToken, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 기본 조건 설정
    let whereCondition = {};
    let includeCondition = [
      {
        model: User,
        as: "mentor",
        attributes: { exclude: ["password"] },
      },
      {
        model: User,
        as: "mentee",
        attributes: { exclude: ["password"] },
      },
    ];

    // 요청 타입에 따른 조건 설정
    if (type === "sent") {
      whereCondition.menteeId = req.user.id;
    } else if (type === "received") {
      whereCondition.mentorId = req.user.id;
    } else {
      // 타입이 지정되지 않으면 보낸 요청과 받은 요청 모두 조회
      whereCondition = {
        [require("sequelize").Op.or]: [
          { menteeId: req.user.id },
          { mentorId: req.user.id },
        ],
      };
    }

    // 상태 필터
    if (status) {
      whereCondition.status = status;
    }

    const requests = await MatchingRequest.findAndCountAll({
      where: whereCondition,
      include: includeCondition,
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      requests: requests.rows,
      pagination: {
        total: requests.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(requests.count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Matching requests fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/matching/requests/{id}/respond:
 *   put:
 *     summary: 매칭 요청에 응답 (멘토용)
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 매칭 요청 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, rejected]
 *     responses:
 *       200:
 *         description: 매칭 요청 응답 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 멘토 권한 필요
 *       404:
 *         description: 매칭 요청을 찾을 수 없음
 */
router.put(
  "/requests/:id/respond",
  authenticateToken,
  requireMentor,
  async (req, res) => {
    try {
      const { id } = req.params;

      // 요청 데이터 검증
      const { error, value } = respondRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation error",
          details: error.details.map((detail) => detail.message),
        });
      }

      const { status } = value;

      // 매칭 요청 조회
      const matchingRequest = await MatchingRequest.findOne({
        where: {
          id,
          mentorId: req.user.id,
          status: "pending",
        },
        include: [
          {
            model: User,
            as: "mentor",
            attributes: { exclude: ["password"] },
          },
          {
            model: User,
            as: "mentee",
            attributes: { exclude: ["password"] },
          },
        ],
      });

      if (!matchingRequest) {
        return res
          .status(404)
          .json({ error: "Matching request not found or already responded" });
      }

      // 상태 업데이트
      await matchingRequest.update({ status });

      // 업데이트된 요청 정보 조회
      const updatedRequest = await MatchingRequest.findByPk(id, {
        include: [
          {
            model: User,
            as: "mentor",
            attributes: { exclude: ["password"] },
          },
          {
            model: User,
            as: "mentee",
            attributes: { exclude: ["password"] },
          },
        ],
      });

      res.json({
        message: `Matching request ${status} successfully`,
        request: updatedRequest,
      });
    } catch (error) {
      console.error("Matching request response error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * @swagger
 * /api/matching/requests/{id}:
 *   get:
 *     summary: 특정 매칭 요청 조회
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 매칭 요청 ID
 *     responses:
 *       200:
 *         description: 매칭 요청 조회 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 매칭 요청을 찾을 수 없음
 */
router.get("/requests/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const matchingRequest = await MatchingRequest.findOne({
      where: {
        id,
        [require("sequelize").Op.or]: [
          { menteeId: req.user.id },
          { mentorId: req.user.id },
        ],
      },
      include: [
        {
          model: User,
          as: "mentor",
          attributes: { exclude: ["password"] },
        },
        {
          model: User,
          as: "mentee",
          attributes: { exclude: ["password"] },
        },
      ],
    });

    if (!matchingRequest) {
      return res
        .status(404)
        .json({ error: "Matching request not found or access denied" });
    }

    res.json({ request: matchingRequest });
  } catch (error) {
    console.error("Matching request fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/matching/requests/{id}:
 *   delete:
 *     summary: 매칭 요청 취소 (멘티용, pending 상태만)
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 매칭 요청 ID
 *     responses:
 *       200:
 *         description: 매칭 요청 취소 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 매칭 요청을 찾을 수 없음
 */
router.delete("/requests/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const matchingRequest = await MatchingRequest.findOne({
      where: {
        id,
        menteeId: req.user.id,
        status: "pending",
      },
    });

    if (!matchingRequest) {
      return res
        .status(404)
        .json({ error: "Matching request not found or cannot be cancelled" });
    }

    await matchingRequest.destroy();

    res.json({ message: "Matching request cancelled successfully" });
  } catch (error) {
    console.error("Matching request cancellation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
