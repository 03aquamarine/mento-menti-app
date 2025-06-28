const API_BASE_URL = "http://localhost:8080/api";

class APIService {
  constructor() {
    this.token = localStorage.getItem("token");
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }

  getAuthHeaders() {
    return {
      "Content-Type": "application/json",
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  async handleResponse(response) {
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Network error" }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Authentication APIs
  async register(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    const data = await this.handleResponse(response);
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async login(credentials) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(credentials),
    });
    const data = await this.handleResponse(response);
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  logout() {
    this.setToken(null);
  }

  // User APIs
  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/me`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateProfile(profileData) {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    return this.handleResponse(response);
  }

  async uploadProfileImage(imageFile) {
    const formData = new FormData();
    formData.append("image", imageFile);

    const response = await fetch(`${API_BASE_URL}/users/profile/image`, {
      method: "POST",
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });
    return this.handleResponse(response);
  }

  async getMentors(params = {}) {
    const searchParams = new URLSearchParams(params);
    const response = await fetch(
      `${API_BASE_URL}/mentors?${searchParams}`,
      {
        headers: this.getAuthHeaders(),
      },
    );
    return this.handleResponse(response);
  }

  async getUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Matching APIs
  async createMatchingRequest(requestData) {
    const response = await fetch(`${API_BASE_URL}/match-requests`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(requestData),
    });
    return this.handleResponse(response);
  }

  async getMatchingRequests(params = {}) {
    const type = params.type || "outgoing";
    const endpoint = type === "received" ? "incoming" : "outgoing";
    const response = await fetch(
      `${API_BASE_URL}/match-requests/${endpoint}`,
      {
        headers: this.getAuthHeaders(),
      },
    );
    const requests = await this.handleResponse(response);
    return { requests, pagination: { page: 1, pages: 1 } };
  }

  async respondToMatchingRequest(requestId, status) {
    const action = status === "accepted" ? "accept" : "reject";
    const response = await fetch(
      `${API_BASE_URL}/match-requests/${requestId}/${action}`,
      {
        method: "PUT",
        headers: this.getAuthHeaders(),
      },
    );
    return this.handleResponse(response);
  }

  async cancelMatchingRequest(requestId) {
    const response = await fetch(
      `${API_BASE_URL}/match-requests/${requestId}`,
      {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      },
    );
    return this.handleResponse(response);
  }
}

export default new APIService();
