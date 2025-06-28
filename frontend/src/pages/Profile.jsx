import React, { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api";
import "./Profile.css";

function Profile() {
  const { user, updateProfile } = useAuth();
  
  console.log("Profile 컴포넌트 - 사용자 정보:", user);
  
  const [formData, setFormData] = useState({
    name: user?.profile?.name || "",
    bio: user?.profile?.bio || "",
    skills: user?.profile?.skills ? user.profile.skills.join(", ") : "",
    experience: user?.experience || "",
    hourlyRate: user?.hourlyRate || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef();

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
    setSuccess("");

    try {
      const profileData = {
        name: formData.name,
        bio: formData.bio,
        skills: formData.skills
          ? formData.skills.split(",").map((skill) => skill.trim())
          : [],
      };

      // 멘토인 경우 추가 정보 포함
      if (user.role === "mentor") {
        if (formData.experience) {
          profileData.experience = parseInt(formData.experience);
        }
        if (formData.hourlyRate) {
          profileData.hourlyRate = parseFloat(formData.hourlyRate);
        }
      }

      await updateProfile(profileData);
      setSuccess("프로필이 성공적으로 업데이트되었습니다.");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    // 파일 타입 체크
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setImageUploading(true);
    setError("");

    try {
      await apiService.uploadProfileImage(file);
      // 프로필 다시 로드하여 새 이미지 URL 가져오기
      await apiService.getProfile();
      // AuthContext의 user 업데이트는 별도로 처리 필요
      setSuccess("프로필 이미지가 성공적으로 업데이트되었습니다.");
      window.location.reload(); // 임시 해결책
    } catch (error) {
      setError(error.message);
    } finally {
      setImageUploading(false);
    }
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h1>내 프로필</h1>
          <p>프로필 정보를 관리하고 업데이트하세요</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {success && <div className="success-message">{success}</div>}

        <div className="profile-content">
          {/* 프로필 이미지 섹션 */}
          <div className="profile-image-section">
            <div className="profile-image-container">
              {user.profile?.imageUrl && !user.profile.imageUrl.startsWith('https://placehold.co') ? (
                <img
                  src={user.profile.imageUrl}
                  alt="Profile"
                  id="profile-photo"
                  className="profile-image"
                />
              ) : (
                <div className="profile-image-placeholder" id="profile-photo">
                  <span>{user.profile?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="image-upload-btn"
                disabled={imageUploading}
              >
                {imageUploading ? "업로드 중..." : "이미지 변경"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                id="profile"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="profile-info">
            <div className="info-item">
              <span className="label">이메일:</span>
              <span className="value">{user.email}</span>
            </div>
            <div className="info-item">
              <span className="label">역할:</span>
              <span className="value">
                {user.role === "mentor" ? "멘토" : "멘티"}
              </span>
            </div>
            <div className="info-item">
              <span className="label">가입일:</span>
              <span className="value">
                {new Date(user.createdAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
          </div>

          {/* 편집 가능한 프로필 폼 */}
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="name">이름</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="bio">자기소개</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="자신에 대해 간단히 소개해주세요"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label htmlFor="skillsets">보유 스킬</label>
              <input
                type="text"
                id="skillsets"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="JavaScript, React, Node.js (쉼표로 구분)"
              />
            </div>

            {user.role === "mentor" && (
              <>
                <div className="form-group">
                  <label htmlFor="experience">경험 년수</label>
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
                  <label htmlFor="hourlyRate">시간당 요금 (원)</label>
                  <input
                    type="number"
                    id="hourlyRate"
                    name="hourlyRate"
                    value={formData.hourlyRate}
                    onChange={handleChange}
                    min="0"
                    step="1000"
                    placeholder="예: 50000"
                  />
                </div>
              </>
            )}

            <button type="submit" id="save" className="profile-btn" disabled={loading}>
              {loading ? "저장 중..." : "프로필 저장"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
