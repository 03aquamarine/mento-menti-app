import React, { createContext, useContext, useReducer, useEffect } from "react";
import apiService from "../services/api";

const AuthContext = createContext();

const initialState = {
  user: null,
  loading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_USER":
      return { ...state, user: action.payload, loading: false, error: null };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "LOGOUT":
      return { ...state, user: null, loading: false, error: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 초기 로드 시 토큰 확인
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await apiService.getProfile();
          dispatch({ type: "SET_USER", payload: response });
        } catch (error) {
          console.error("Auth check failed:", error);
          apiService.logout();
          dispatch({ type: "SET_ERROR", payload: "Authentication failed" });
        }
      } else {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      console.log("로그인 시도:", credentials);
      const response = await apiService.login(credentials);
      console.log("로그인 응답:", response);
      dispatch({ type: "SET_USER", payload: response.user });
      return response;
    } catch (error) {
      console.error("로그인 에러:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      console.log("회원가입 시도:", userData);
      const response = await apiService.register(userData);
      console.log("회원가입 응답:", response);
      dispatch({ type: "SET_USER", payload: response.user });
      return response;
    } catch (error) {
      console.error("회원가입 에러:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
      throw error;
    }
  };

  const logout = () => {
    apiService.logout();
    dispatch({ type: "LOGOUT" });
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await apiService.updateProfile(profileData);
      dispatch({ type: "SET_USER", payload: response });
      return response;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.message });
      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: "SET_ERROR", payload: null });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
