import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Auth.css";

function Register() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    role: "mentee",
    bio: "",
    skills: "",
    experience: "",
    hourlyRate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("비밀번호는 최소 8자 이상이어야 합니다.");
      setLoading(false);
      return;
    }

    if (formData.password.length > 128) {
      setError("비밀번호는 최대 128자까지 입력 가능합니다.");
      setLoading(false);
      return;
    }

    // 비밀번호 복잡성 검증 (소문자, 대문자, 숫자 각각 포함)
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordPattern.test(formData.password)) {
      setError("비밀번호는 소문자, 대문자, 숫자를 각각 최소 1개씩 포함해야 합니다.");
      setLoading(false);
      return;
    }

    try {
      const userData = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        bio: formData.bio || undefined,
        skills: formData.skills
          ? formData.skills.split(",").map((skill) => skill.trim())
          : undefined,
      };

      // 멘토인 경우 추가 정보 포함
      if (formData.role === "mentor") {
        if (formData.experience) {
          userData.experience = parseInt(formData.experience);
        }
        if (formData.hourlyRate) {
          userData.hourlyRate = parseFloat(formData.hourlyRate);
        }
      }

      console.log("회원가입 데이터:", userData);
      const result = await register(userData);
      console.log("회원가입 성공, 결과:", result);
      console.log(
        "회원가입 성공! PublicRoute가 자동으로 홈으로 리다이렉트합니다.",
      );
      // navigate("/")를 제거 - PublicRoute에서 자동으로 리다이렉트됨
    } catch (error) {
      console.error("회원가입 실패:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>회원가입</h1>
          <p>멘토링 플랫폼에 가입하여 시작하세요</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">이름</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="이름을 입력하세요"
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">역할</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="mentee">멘티 (멘토링을 받고 싶어요)</option>
              <option value="mentor">멘토 (멘토링을 제공하고 싶어요)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="8자 이상, 대소문자+숫자 포함"
            />
            <small className="form-help">
              8-128자, 소문자/대문자/숫자 각각 최소 1개씩 포함
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="비밀번호를 다시 입력하세요"
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">자기소개 (선택)</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="자신에 대해 간단히 소개해주세요"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="skills">보유 스킬 (선택)</label>
            <input
              type="text"
              id="skills"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="JavaScript, React, Node.js (쉼표로 구분)"
            />
          </div>

          {formData.role === "mentor" && (
            <>
              <div className="form-group">
                <label htmlFor="experience">경험 년수 (선택)</label>
                <input
                  type="number"
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  min="0"
                  placeholder="예: 5"
                />
              </div>

              <div className="form-group">
                <label htmlFor="hourlyRate">시간당 요금 (선택)</label>
                <input
                  type="number"
                  id="hourlyRate"
                  name="hourlyRate"
                  value={formData.hourlyRate}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="예: 50000"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            id="signup"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            이미 계정이 있으신가요?{" "}
            <Link to="/login" className="auth-link">
              로그인하기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
