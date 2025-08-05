import React, { useState } from "react";
import { API_URL } from "../../config";

const ChangePasswordForm = ({ gymOwner, onSuccess, onCancel }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate passwords
      if (!password) {
        throw new Error("Password is required");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      // Prepare request data - only sending the password
      const requestData = {
        password: password,
        // Keep the existing values for other fields
        gymName: gymOwner.gymName,
        isAdmin: gymOwner.isAdmin,
      };

      const response = await fetch(
        `${API_URL}/api/admin/gym-owners/${gymOwner.email}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change password");
      }

      // Success!
      onSuccess();
    } catch (error) {
      console.error("Error changing password:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-form">
      <h2>Change Password for {gymOwner.email}</h2>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">New Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Saving..." : "Change Password"}
          </button>
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordForm;
