const express = require("express");
const Joi = require("joi");
const { MatchingRequest, User } = require("../models");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// 매칭 요청 생성 검증 스키마
const createRequestSchema = Joi.object({
  mentorId: Joi.number().integer().positive().required(),
  message: Joi.string().required(),
});

/**
 * @swagger
 * /api/match-requests:
 *   post:
 *     summary: 매칭 요청 보내기 (멘티 전용)
 *     security:
 *       - bearerAuth: []
 *     tags: [Matching]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mentorId:
 *                 type: number
 *               menteeId:
 *                 type: number
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: 요청 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 */
router.post("/match-requests", authenticateToken, async (req, res) => {
  try {
    // 멘티만 요청 가능
    if (req.user.role !== "mentee") {
      return res.status(403).json({ error: "Only mentees can send requests" });
    }

    const { error, value } = createRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation error",
        details: error.details[0].message,
      });
    }

    const { mentorId, message } = value;
    const menteeId = req.user.id; // JWT 토큰에서 자동으로 가져오기

    // 멘토 존재 확인
    const mentor = await User.findOne({
      where: { id: mentorId, role: "mentor" },
    });

    if (!mentor) {
      return res.status(400).json({ error: "Mentor not found" });
    }

    // 중복 요청 확인 - 한 멘티는 한 번에 하나의 pending 요청만 가능
    const existingPendingRequest = await MatchingRequest.findOne({
      where: {
        menteeId,
        status: "pending",
      },
    });

    if (existingPendingRequest) {
      return res.status(400).json({ 
        error: "You already have a pending request. Please wait for a response or cancel your current request before sending a new one.",
        currentRequestId: existingPendingRequest.id,
        currentMentorId: existingPendingRequest.mentorId
      });
    }

    // 매칭 요청 생성
    const matchingRequest = await MatchingRequest.create({
      mentorId,
      menteeId,
      message,
      status: "pending",
    });

    res.status(200).json({
      id: matchingRequest.id,
      mentorId: matchingRequest.mentorId,
      menteeId: matchingRequest.menteeId,
      message: matchingRequest.message,
      status: matchingRequest.status,
    });
  } catch (error) {
    console.error("Create matching request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/match-requests/incoming:
 *   get:
 *     summary: 나에게 들어온 요청 목록 (멘토 전용)
 *     security:
 *       - bearerAuth: []
 *     tags: [Matching]
 *     responses:
 *       200:
 *         description: 요청 목록
 */
router.get("/match-requests/incoming", authenticateToken, async (req, res) => {
  try {
    // 멘토만 접근 가능
    if (req.user.role !== "mentor") {
      return res
        .status(403)
        .json({ error: "Only mentors can view incoming requests" });
    }

    const requests = await MatchingRequest.findAll({
      where: { mentorId: req.user.id },
    });

    res.json(requests);
  } catch (error) {
    console.error("Get incoming requests error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/match-requests/outgoing:
 *   get:
 *     summary: 내가 보낸 요청 목록 (멘티 전용)
 *     security:
 *       - bearerAuth: []
 *     tags: [Matching]
 *     responses:
 *       200:
 *         description: 요청 목록
 */
router.get("/match-requests/outgoing", authenticateToken, async (req, res) => {
  try {
    // 멘티만 접근 가능
    if (req.user.role !== "mentee") {
      return res
        .status(403)
        .json({ error: "Only mentees can view outgoing requests" });
    }

    const requests = await MatchingRequest.findAll({
      where: { menteeId: req.user.id },
    });

    res.json(requests);
  } catch (error) {
    console.error("Get outgoing requests error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/match-requests/{id}/accept:
 *   put:
 *     summary: 요청 수락 (멘토 전용)
 *     security:
 *       - bearerAuth: []
 *     tags: [Matching]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 요청 수락 성공
 */
router.put(
  "/match-requests/:id/accept",
  authenticateToken,
  async (req, res) => {
    try {
      // 멘토만 접근 가능
      if (req.user.role !== "mentor") {
        return res
          .status(403)
          .json({ error: "Only mentors can accept requests" });
      }

      const { id } = req.params;

      const matchingRequest = await MatchingRequest.findOne({
        where: {
          id,
          mentorId: req.user.id,
          status: "pending",
        },
      });

      if (!matchingRequest) {
        return res.status(404).json({ error: "Request not found" });
      }

      // 요청 수락
      matchingRequest.status = "accepted";
      await matchingRequest.save();

      // 해당 멘토의 다른 모든 pending 요청을 자동으로 거절
      await MatchingRequest.update(
        { status: "rejected" },
        {
          where: {
            mentorId: req.user.id,
            status: "pending",
            id: { [require("sequelize").Op.ne]: id }, // 현재 수락한 요청은 제외
          },
        }
      );

      // 해당 멘티의 다른 모든 pending 요청도 자동으로 거절 (한 명의 멘티는 한 번에 한 명의 멘토와만 매칭)
      await MatchingRequest.update(
        { status: "rejected" },
        {
          where: {
            menteeId: matchingRequest.menteeId,
            status: "pending",
            id: { [require("sequelize").Op.ne]: id }, // 현재 수락한 요청은 제외
          },
        }
      );

      res.json({
        id: matchingRequest.id,
        mentorId: matchingRequest.mentorId,
        menteeId: matchingRequest.menteeId,
        message: matchingRequest.message,
        status: matchingRequest.status,
      });
    } catch (error) {
      console.error("Accept request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * @swagger
 * /api/match-requests/{id}/reject:
 *   put:
 *     summary: 요청 거절 (멘토 전용)
 *     security:
 *       - bearerAuth: []
 *     tags: [Matching]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 요청 거절 성공
 */
router.put(
  "/match-requests/:id/reject",
  authenticateToken,
  async (req, res) => {
    try {
      // 멘토만 접근 가능
      if (req.user.role !== "mentor") {
        return res
          .status(403)
          .json({ error: "Only mentors can reject requests" });
      }

      const { id } = req.params;

      const matchingRequest = await MatchingRequest.findOne({
        where: {
          id,
          mentorId: req.user.id,
          status: "pending",
        },
      });

      if (!matchingRequest) {
        return res.status(404).json({ error: "Request not found" });
      }

      // 요청 거절
      matchingRequest.status = "rejected";
      await matchingRequest.save();

      res.json({
        id: matchingRequest.id,
        mentorId: matchingRequest.mentorId,
        menteeId: matchingRequest.menteeId,
        message: matchingRequest.message,
        status: matchingRequest.status,
      });
    } catch (error) {
      console.error("Reject request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * @swagger
 * /api/match-requests/{id}:
 *   delete:
 *     summary: 요청 삭제/취소 (멘티 전용)
 *     security:
 *       - bearerAuth: []
 *     tags: [Matching]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 요청 취소 성공
 */
router.delete("/match-requests/:id", authenticateToken, async (req, res) => {
  try {
    // 멘티만 접근 가능
    if (req.user.role !== "mentee") {
      return res
        .status(403)
        .json({ error: "Only mentees can cancel requests" });
    }

    const { id } = req.params;

    const matchingRequest = await MatchingRequest.findOne({
      where: {
        id,
        menteeId: req.user.id,
        status: "pending",
      },
    });

    if (!matchingRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    // 요청 취소
    matchingRequest.status = "cancelled";
    await matchingRequest.save();

    res.json({
      id: matchingRequest.id,
      mentorId: matchingRequest.mentorId,
      menteeId: matchingRequest.menteeId,
      message: matchingRequest.message,
      status: matchingRequest.status,
    });
  } catch (error) {
    console.error("Cancel request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
