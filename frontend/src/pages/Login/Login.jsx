import React, { useState, useEffect } from "react";
import { API_URL } from "../../config";
import logoImage from "../../assets/logo.png";
import { FaArrowLeft } from "react-icons/fa";
import "./Login.css";

const Login = ({ onLoginSuccess, onBackClick }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [gymName, setGymName] = useState("");
  const [gymOwner, setGymOwner] = useState(null);

  useEffect(() => {
    const fetchGymOwnerInfo = async () => {
      try {
        // Extract the path from the URL
        const path = window.location.pathname;

        // Check if there's a path segment after the base URL
        const pathSegments = path.split("/").filter((segment) => segment);

        if (pathSegments.length > 0) {
          const identifier = pathSegments[0]; // Get the first path segment

          // Fetch gym owner information using the identifier
          const response = await fetch(
            `${API_URL}/api/gym-owner/${identifier}`
          );

          if (response.ok) {
            const data = await response.json();
            setGymOwner(data.gymOwner);
          }
        }
      } catch (error) {
        console.error("Error fetching gym owner information:", error);
      }
    };

    fetchGymOwnerInfo();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegistering
        ? { email, password, gymName }
        : { email, password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Save token to localStorage
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("gymOwner", JSON.stringify(data.gymOwner));

      // Call the onLoginSuccess callback
      onLoginSuccess(data.gymOwner);
    } catch (error) {
      console.error("Authentication error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError("");
  };

  return (
    <div className="login-container">
      {onBackClick && (
        <button
          onClick={onBackClick}
          className="back-button"
          aria-label="Back to home"
        >
          <FaArrowLeft size={20} />
        </button>
      )}
      <div className="login-logo-container">
        <div className="login-logo">
          {gymOwner && gymOwner.logoUrl ? (
            <img
              src={gymOwner.logoUrl}
              alt={`${gymOwner.gymName} Logo`}
              className="gym-owner-logo"
            />
          ) : (
            <img src={logoImage} alt="Gym Logo" className="dumbbell-icon" />
          )}
        </div>
        <div className="text-xl login-subtitle">
          Manage Workout and Diet plans
        </div>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        {error && <div className="login-error">{error}</div>}

        {isRegistering && (
          <div className="form-group">
            <input
              type="text"
              placeholder="Gym Name"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              required
              className="login-input"
            />
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="login-input"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="login-input"
        />

        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? "Processing..." : isRegistering ? "Register" : "Login"}
        </button>

        {!isRegistering && (
          <div className="forgot-password">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert("Please contact support to reset your password.");
              }}
            >
              Forgot Password?
            </a>
          </div>
        )}
      </form>
    </div>
  );
};

export default Login;
