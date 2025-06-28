import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api";
import "./MatchingRequests.css";

function MatchingRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(
    user?.role === "mentor" ? "received" : "sent",
  );
  const [filters, setFilters] = useState({
    type: activeTab,
    status: "",
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({});
  const [respondingRequest, setRespondingRequest] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getMatchingRequests(filters);
      setRequests(response.requests);
      setPagination(response.pagination);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      type: activeTab,
      page: 1,
    }));
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
      page: 1,
    });
  };

  const handlePageChange = (newPage) => {
    setFilters({
      ...filters,
      page: newPage,
    });
  };

  const handleRespondToRequest = async (requestId, status) => {
    try {
      setRespondingRequest(requestId);
      await apiService.respondToMatchingRequest(requestId, status);
      await fetchRequests(); // 목록 새로고침
      alert(`매칭 요청을 ${status === "accepted" ? "수락" : "거절"}했습니다.`);
    } catch (error) {
      setError(error.message);
    } finally {
      setRespondingRequest(null);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm("정말로 이 매칭 요청을 취소하시겠습니까?")) {
      return;
    }

    try {
      await apiService.cancelMatchingRequest(requestId);
      await fetchRequests(); // 목록 새로고침
      alert("매칭 요청이 취소되었습니다.");
    } catch (error) {
      setError(error.message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: "대기중", className: "status-pending" },
      accepted: { text: "수락됨", className: "status-accepted" },
      rejected: { text: "거절됨", className: "status-rejected" },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`status-badge ${badge.className}`}>{badge.text}</span>
    );
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

  if (loading && requests.length === 0) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="matching-requests-container">
      <div className="requests-header">
        <h1>매칭 요청 관리</h1>
        <p>
          {user?.role === "mentor"
            ? "받은 매칭 요청을 관리하고 응답하세요"
            : "보낸 매칭 요청을 확인하세요"}
        </p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError("")} className="error-close">
            ×
          </button>
        </div>
      )}

      {/* 탭 메뉴 */}
      <div className="tabs-container">
        {user?.role === "mentor" && (
          <button
            onClick={() => handleTabChange("received")}
            className={`tab-btn ${activeTab === "received" ? "active" : ""}`}
          >
            받은 요청
          </button>
        )}
        {user?.role === "mentee" && (
          <button
            onClick={() => handleTabChange("sent")}
            className={`tab-btn ${activeTab === "sent" ? "active" : ""}`}
          >
            보낸 요청
          </button>
        )}
      </div>

      {/* 필터 섹션 */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="status">상태 필터:</label>
          <select
            id="status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">전체</option>
            <option value="pending">대기중</option>
            <option value="accepted">수락됨</option>
            <option value="rejected">거절됨</option>
          </select>
        </div>
      </div>

      {/* 요청 목록 */}
      <div className="requests-list">
        {requests.map((request) => (
          <div key={request.id} className="request-card">
            <div className="request-header">
              <div className="request-users">
                {activeTab === "received" ? (
                  <div className="user-info">
                    <h3>멘티: {request.mentee.name}</h3>
                    <p>이메일: {request.mentee.email}</p>
                  </div>
                ) : (
                  <div className="user-info">
                    <h3>멘토: {request.mentor.name}</h3>
                    <p>이메일: {request.mentor.email}</p>
                  </div>
                )}
              </div>
              <div className="request-status" id="request-status">
                {getStatusBadge(request.status)}
              </div>
            </div>

            {request.message && (
              <div className="request-message" mentee={request.menteeId}>
                <h4>메시지:</h4>
                <p>{request.message}</p>
              </div>
            )}

            <div className="request-meta">
              <p>
                요청일: {new Date(request.createdAt).toLocaleString("ko-KR")}
              </p>
            </div>

            {/* 액션 버튼들 */}
            <div className="request-actions">
              {activeTab === "received" && request.status === "pending" && (
                <>
                  <button
                    id="accept"
                    data-testid={`accept-btn-${request.id}`}
                    onClick={() =>
                      handleRespondToRequest(request.id, "accepted")
                    }
                    disabled={respondingRequest === request.id}
                    className="btn btn-accept"
                  >
                    {respondingRequest === request.id ? "처리 중..." : "수락"}
                  </button>
                  <button
                    id="reject"
                    data-testid={`reject-btn-${request.id}`}
                    onClick={() =>
                      handleRespondToRequest(request.id, "rejected")
                    }
                    disabled={respondingRequest === request.id}
                    className="btn btn-reject"
                  >
                    {respondingRequest === request.id ? "처리 중..." : "거절"}
                  </button>
                </>
              )}

              {activeTab === "sent" && request.status === "pending" && (
                <button
                  data-testid={`cancel-btn-${request.id}`}
                  onClick={() => handleCancelRequest(request.id)}
                  className="btn btn-cancel"
                >
                  요청 취소
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {requests.length === 0 && !loading && (
        <div className="no-requests">
          <p>
            {activeTab === "received"
              ? "받은 매칭 요청이 없습니다."
              : "보낸 매칭 요청이 없습니다."}
          </p>
        </div>
      )}

      {/* 페이지네이션 */}
      {renderPagination()}

      {loading && requests.length > 0 && (
        <div className="loading-overlay">Loading...</div>
      )}
    </div>
  );
}

export default MatchingRequests;
