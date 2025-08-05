import React, { useState } from "react";
import { API_URL } from "../../config";

const GymOwnerForm = ({ gymOwner, isEdit, onSubmitSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    email: gymOwner?.email || "",
    gymName: gymOwner?.gymName || "",
    password: "",
    isAdmin: gymOwner?.isAdmin || false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      // Validate form data
      if (
        !formData.email ||
        !formData.gymName ||
        (!isEdit && !formData.password)
      ) {
        throw new Error("Please fill in all required fields");
      }

      // Prepare request data
      const requestData = {
        email: formData.email,
        gymName: formData.gymName,
        isAdmin: formData.isAdmin,
      };

      // Only include password if it's provided (required for new users, optional for edits)
      if (formData.password) {
        requestData.password = formData.password;
      }

      // Determine URL and method based on whether we're editing or creating
      const url = isEdit
        ? `${API_URL}/api/admin/gym-owners/${gymOwner.email}`
        : `${API_URL}/api/admin/gym-owners`;
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save gym owner");
      }

      // Success!
      onSubmitSuccess();
    } catch (error) {
      console.error("Error saving gym owner:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gym-owner-form">
      <h2>{isEdit ? "Edit Gym Owner" : "Add Gym Owner"}</h2>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isEdit} // Email can't be changed for existing users
          />
        </div>

        <div className="form-group">
          <label htmlFor="gymName">Gym Name:</label>
          <input
            type="text"
            id="gymName"
            name="gymName"
            value={formData.gymName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">
            Password: {isEdit && <span>(Leave blank to keep unchanged)</span>}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required={!isEdit} // Required for new users, optional for edits
          />
        </div>

        <div className="form-group checkbox-group">
          <label htmlFor="isAdmin">
            <input
              type="checkbox"
              id="isAdmin"
              name="isAdmin"
              checked={formData.isAdmin}
              onChange={handleChange}
            />
            Admin User
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Saving..." : "Save"}
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

export default GymOwnerForm;
