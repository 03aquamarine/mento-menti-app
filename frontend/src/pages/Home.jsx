import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Home.css";

function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  console.log("Home 컴포넌트 렌더링:", { user, loading });

  useEffect(() => {
    console.log("Home useEffect:", { user, loading });
    // 인증된 사용자는 프로필 페이지로 리다이렉트
    if (user && !loading) {
      console.log("프로필 페이지로 리다이렉트");
      navigate("/profile");
    }
  }, [user, loading, navigate]);

  // 로딩 중일 때
  if (loading) {
    console.log("로딩 상태");
    return <div className="loading">Loading...</div>;
  }

  // 인증된 사용자인 경우 (리다이렉트 중)
  if (user) {
    console.log("사용자 인증됨, 리다이렉트 중");
    return <div className="loading">Redirecting...</div>;
  }

  console.log("인증되지 않은 사용자, 홈 페이지 표시");

  return (
    <div className="home">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">전문가와 함께 성장하세요</h1>
          <p className="hero-subtitle">
            경험 있는 멘토와 매칭되어 개인 맞춤형 멘토링을 받아보세요. 새로운
            기술을 배우고, 경력을 발전시키며, 목표를 달성하세요.
          </p>

          {!user ? (
            <div className="hero-actions">
              <Link to="/signup" className="btn btn-primary">
                시작하기
              </Link>
              <Link to="/login" className="btn btn-secondary">
                로그인
              </Link>
            </div>
          ) : (
            <div className="hero-actions">
              <Link to="/mentors" className="btn btn-primary">
                멘토 찾기
              </Link>
              <Link to="/profile" className="btn btn-secondary">
                내 프로필
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="features-section">
        <div className="container">
          <h2 className="section-title">왜 우리 플랫폼을 선택해야 할까요?</h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>맞춤형 매칭</h3>
              <p>당신의 관심사와 목표에 맞는 최적의 멘토를 찾아드립니다.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💡</div>
              <h3>검증된 전문가</h3>
              <p>풍부한 경험과 전문성을 갖춘 멘토들과 함께하세요.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>빠른 성장</h3>
              <p>일대일 멘토링으로 더 빠르고 효과적인 학습을 경험하세요.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3>안전한 환경</h3>
              <p>신뢰할 수 있는 플랫폼에서 안전하게 멘토링을 받으세요.</p>
            </div>
          </div>
        </div>
      </div>

      {user && (
        <div className="dashboard-section">
          <div className="container">
            <h2 className="section-title">내 대시보드</h2>

            <div className="dashboard-cards">
              <Link to="/profile" className="dashboard-card">
                <h3>내 프로필</h3>
                <p>프로필을 관리하고 정보를 업데이트하세요.</p>
              </Link>

              <Link to="/mentors" className="dashboard-card">
                <h3>멘토 찾기</h3>
                <p>나에게 맞는 멘토를 찾아보세요.</p>
              </Link>

              <Link to="/matching-requests" className="dashboard-card">
                <h3>매칭 요청</h3>
                <p>
                  {user.role === "mentee"
                    ? "보낸 매칭 요청을 확인하세요."
                    : "받은 매칭 요청을 관리하세요."}
                </p>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
