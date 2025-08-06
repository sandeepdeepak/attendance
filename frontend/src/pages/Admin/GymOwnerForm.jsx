import React, { useState, useRef } from "react";
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
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(gymOwner?.logoUrl || null);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return null;

    try {
      const formData = new FormData();
      formData.append("logo", logoFile);

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        `${API_URL}/api/admin/gym-owners/${gymOwner.email}/logo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload logo");
      }

      const data = await response.json();
      return data.gymOwner.logoUrl;
    } catch (error) {
      console.error("Error uploading logo:", error);
      setError(error.message);
      return null;
    }
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

      // If we're editing and have a logo file, upload it
      if (isEdit && logoFile) {
        const logoUrl = await handleLogoUpload();
        if (logoUrl) {
          console.log("Logo uploaded successfully:", logoUrl);
        }
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

        {isEdit && (
          <div className="form-group logo-upload-group">
            <label>Gym Logo:</label>
            <div className="logo-upload-container">
              {logoPreview && (
                <div className="logo-preview">
                  <img src={logoPreview} alt="Gym Logo Preview" />
                </div>
              )}
              <div className="logo-upload-actions">
                <input
                  type="file"
                  id="logoFile"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleLogoChange}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="upload-button"
                  onClick={() => fileInputRef.current.click()}
                >
                  {logoPreview ? "Change Logo" : "Upload Logo"}
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    className="remove-button"
                    onClick={() => {
                      setLogoPreview(null);
                      setLogoFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    Remove Logo
                  </button>
                )}
              </div>
              <p className="logo-help-text">
                Recommended size: 200x200 pixels. Max file size: 2MB.
              </p>
            </div>
          </div>
        )}

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
