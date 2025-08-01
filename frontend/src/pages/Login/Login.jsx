import React, { useState } from "react";
import { API_URL } from "../../config";
import logoImage from "../../assets/logo.png";
import "./Login.css";

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [gymName, setGymName] = useState("");

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
      <div className="login-logo-container">
        <div className="login-logo">
          <img src={logoImage} alt="Gym Logo" className="dumbbell-icon" />
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

      <div className="login-footer">
        <p>
          {isRegistering
            ? "Already have an account?"
            : "Don't have an account?"}{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toggleMode();
            }}
          >
            {isRegistering ? "Sign in" : "Sign up"}
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
