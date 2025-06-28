import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api";
import "./MentorList.css";

function MentorList() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    skill: "",
    order_by: "",
    page: 1,
    limit: 9,
  });
  const [pagination, setPagination] = useState({});
  const [requestingMentor, setRequestingMentor] = useState(null);

  const fetchMentors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getMentors(filters);
      setMentors(response.mentors);
      setPagination(response.pagination);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMentors();
  }, [fetchMentors]);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
      page: 1, // 필터 변경 시 첫 페이지로 리셋
    });
  };

  const handlePageChange = (newPage) => {
    setFilters({
      ...filters,
      page: newPage,
    });
  };

  const handleMatchingRequest = async (mentorId, message = "") => {
    if (user.role !== "mentee") {
      setError("멘티만 매칭 요청을 보낼 수 있습니다.");
      return;
    }

    try {
      setRequestingMentor(mentorId);
      await apiService.createMatchingRequest({
        mentorId,
        message,
      });
      alert("매칭 요청이 성공적으로 전송되었습니다!");
    } catch (error) {
      setError(error.message);
    } finally {
      setRequestingMentor(null);
    }
  };

  const renderPagination = () => {
    if (!pagination.pages || pagination.pages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= pagination.pages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`pagination-btn ${pagination.page === i ? "active" : ""}`}
        >
          {i}
        </button>,
      );
    }

    return (
      <div className="pagination">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="pagination-btn"
        >
          이전
        </button>
        {pages}
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages}
          className="pagination-btn"
        >
          다음
        </button>
      </div>
    );
  };

  if (loading && mentors.length === 0) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="mentor-list-container">
      <div className="mentor-list-header">
        <h1>멘토 찾기</h1>
        <p>당신에게 맞는 전문 멘토를 찾아보세요</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError("")} className="error-close">
            ×
          </button>
        </div>
      )}

      {/* 필터 섹션 */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="search">스킬 검색:</label>
          <input
            type="text"
            id="search"
            name="skill"
            value={filters.skill}
            onChange={handleFilterChange}
            placeholder="React, JavaScript, Node.js 등"
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="name">이름순 정렬:</label>
          <input
            type="radio"
            id="name"
            name="order_by"
            value="name"
            checked={filters.order_by === "name"}
            onChange={handleFilterChange}
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="skill">스킬순 정렬:</label>
          <input
            type="radio"
            id="skill"
            name="order_by"
            value="skill"
            checked={filters.order_by === "skill"}
            onChange={handleFilterChange}
          />
        </div>
      </div>

      {/* 멘토 목록 */}
      <div className="mentors-grid">
        {mentors.map((mentor) => (
          <div key={mentor.id} className="mentor-card mentor">
            <div className="mentor-image">
              {mentor.profileImage ? (
                <img
                  src={`http://localhost:3001${mentor.profileImage}`}
                  alt={mentor.name}
                />
              ) : (
                <div className="mentor-avatar">
                  {mentor.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="mentor-info">
              <h3 className="mentor-name">{mentor.name}</h3>

              {mentor.experience !== null && (
                <p className="mentor-experience">경험: {mentor.experience}년</p>
              )}

              {mentor.hourlyRate && (
                <p className="mentor-rate">
                  시간당 {mentor.hourlyRate.toLocaleString()}원
                </p>
              )}

              {mentor.bio && <p className="mentor-bio">{mentor.bio}</p>}

              {mentor.skills && mentor.skills.length > 0 && (
                <div className="mentor-skills">
                  {mentor.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {user.role === "mentee" && (
                <div>
                  <input
                    type="text"
                    id="message"
                    data-mentor-id={mentor.id}
                    data-testid={`message-${mentor.id}`}
                    placeholder="멘토에게 전달할 메시지"
                    style={{ marginBottom: "10px", width: "100%" }}
                  />
                  <button
                    id="request"
                    onClick={() => {
                      const messageInput = document.querySelector(`[data-testid="message-${mentor.id}"]`);
                      const message = messageInput.value || "";
                      handleMatchingRequest(mentor.id, message);
                    }}
                    disabled={requestingMentor === mentor.id}
                    className="request-btn"
                  >
                    {requestingMentor === mentor.id ? "요청 중..." : "매칭 요청"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {mentors.length === 0 && !loading && (
        <div className="no-mentors">
          <p>조건에 맞는 멘토가 없습니다.</p>
          <p>다른 검색 조건을 시도해보세요.</p>
        </div>
      )}

      {/* 페이지네이션 */}
      {renderPagination()}

      {loading && mentors.length > 0 && (
        <div className="loading-overlay">Loading...</div>
      )}
    </div>
  );
}

export default MentorList;
