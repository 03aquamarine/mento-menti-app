import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Navbar.css";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          멘토-멘티 매칭
        </Link>

        <div className="navbar-menu">
          {user ? (
            <>
              {user.role === "mentee" && (
                <Link to="/mentors" className="navbar-link">
                  멘토 찾기
                </Link>
              )}
              <Link to="/requests" className="navbar-link">
                요청 관리
              </Link>
              <Link to="/profile" className="navbar-link">
                프로필
              </Link>
              <div className="navbar-user">
                <span className="user-name">{user.name}</span>
                <span className="user-role">
                  ({user.role === "mentor" ? "멘토" : "멘티"})
                </span>
                <button onClick={handleLogout} className="logout-btn">
                  로그아웃
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">
                로그인
              </Link>
              <Link to="/signup" className="navbar-link register-link">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
