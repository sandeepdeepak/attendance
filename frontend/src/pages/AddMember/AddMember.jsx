import React, { useState, useRef, useCallback, useEffect } from "react";
import { FaArrowLeft, FaCalendar } from "react-icons/fa";
import "./AddMember.css";
import Webcam from "react-webcam";
import { API_URL } from "../../config";

const AddMember = ({ onBackClick, editMode = false, memberToEdit = null }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    startDate: new Date().toISOString().split("T")[0], // Default to today's date
    dateOfBirth: "", // New field for date of birth
    gender: "male", // Default gender
    membershipPlan: "1 Month", // Default membership plan
    height: "", // Height in cm
    weight: "", // Weight in kg
  });
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);
  const webcamRef = useRef(null);
  const genderDropdownRef = useRef(null);
  const planDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        genderDropdownRef.current &&
        !genderDropdownRef.current.contains(event.target)
      ) {
        setIsGenderDropdownOpen(false);
      }
      if (
        planDropdownRef.current &&
        !planDropdownRef.current.contains(event.target)
      ) {
        setIsPlanDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCustomSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const startCapture = () => {
    setShowWebcam(true);
    setIsCapturing(true);
    setCountdown(3);
  };

  // Handle countdown and capture
  React.useEffect(() => {
    if (isCapturing && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isCapturing && countdown === 0) {
      // Capture image when countdown reaches 0
      setTimeout(() => {
        if (webcamRef.current) {
          const image = webcamRef.current.getScreenshot();
          setCapturedImage(image);
          setIsCapturing(false);
          setShowWebcam(false);
        }
      }, 500);
    }
  }, [countdown, isCapturing]);

  const handleRetake = () => {
    setCapturedImage(null);
    startCapture();
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSaveMember = useCallback(async () => {
    if (!formData.fullName || !formData.phoneNumber || !capturedImage) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Convert base64 image to blob
      const imageResponse = await fetch(capturedImage);
      const imageBlob = await imageResponse.blob();

      // Create form data
      const formDataToSend = new FormData();
      formDataToSend.append("fullName", formData.fullName);
      formDataToSend.append("phoneNumber", formData.phoneNumber);
      formDataToSend.append("startDate", formData.startDate);
      formDataToSend.append("dateOfBirth", formData.dateOfBirth);
      formDataToSend.append("gender", formData.gender);
      formDataToSend.append("membershipPlan", formData.membershipPlan);
      formDataToSend.append("height", formData.height);
      formDataToSend.append("weight", formData.weight);
      formDataToSend.append("faceImage", imageBlob, "face.jpg");

      let url = `${API_URL}/api/members`;
      let method = "POST";

      // If in edit mode, use PUT request to update the member
      if (editMode && memberToEdit) {
        url = `${API_URL}/api/members/${memberToEdit.id}`;
        method = "PUT";
      }

      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      // Send data to API
      const response = await fetch(url, {
        method: method,
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to ${editMode ? "update" : "save"} member`
        );
      }

      const result = await response.json();
      console.log(
        `Member ${editMode ? "updated" : "saved"} successfully:`,
        result
      );

      // After saving, go back to dashboard
      onBackClick();
    } catch (error) {
      console.error(`Error ${editMode ? "updating" : "saving"} member:`, error);
      setSaveError(
        error.message || `Failed to ${editMode ? "update" : "save"} member`
      );
    } finally {
      setIsSaving(false);
    }
  }, [formData, capturedImage, onBackClick, editMode, memberToEdit]);

  // Load member data when in edit mode
  useEffect(() => {
    if (editMode && memberToEdit) {
      setFormData({
        fullName: memberToEdit.fullName || "",
        phoneNumber: memberToEdit.phoneNumber || "",
        startDate:
          memberToEdit.startDate || new Date().toISOString().split("T")[0],
        dateOfBirth: memberToEdit.dateOfBirth || "",
        gender: memberToEdit.gender || "male",
        membershipPlan: memberToEdit.membershipPlan || "1 Month",
        height: memberToEdit.height || "",
        weight: memberToEdit.weight || "",
      });
    }
  }, [editMode, memberToEdit]);

  return (
    <div className="add-member-container">
      {/* Header with back button and title */}
      <div className="add-member-header">
        <button className="back-button" onClick={onBackClick}>
          <FaArrowLeft size={24} />
        </button>
        <div className="page-title">
          {editMode ? "Edit Member" : "Add Member"}
        </div>
      </div>

      {/* Form fields */}
      <div className="form-container">
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter full name"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <input
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter phone number"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Gender</label>
          <div className="custom-select" ref={genderDropdownRef}>
            {/* Hidden select element to maintain form state */}
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              style={{ display: "none" }}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>

            {/* Custom dropdown UI */}
            <div
              className={`select-selected ${
                isGenderDropdownOpen ? "select-arrow-active" : ""
              }`}
              onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
            >
              {formData.gender.charAt(0).toUpperCase() +
                formData.gender.slice(1)}
            </div>

            <div
              className={`select-items ${
                isGenderDropdownOpen ? "" : "select-hide"
              }`}
            >
              <div
                onClick={() => {
                  handleCustomSelectChange("gender", "male");
                  setIsGenderDropdownOpen(false);
                }}
                className={formData.gender === "male" ? "same-as-selected" : ""}
              >
                Male
              </div>
              <div
                onClick={() => {
                  handleCustomSelectChange("gender", "female");
                  setIsGenderDropdownOpen(false);
                }}
                className={
                  formData.gender === "female" ? "same-as-selected" : ""
                }
              >
                Female
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Date of Birth</label>
          <div className="date-input-container">
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              className="form-input"
              required
            />
            <FaCalendar className="date-icon" size={20} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Membership Plan</label>
          <div className="custom-select" ref={planDropdownRef}>
            {/* Hidden select element to maintain form state */}
            <select
              name="membershipPlan"
              value={formData.membershipPlan}
              onChange={handleInputChange}
              style={{ display: "none" }}
            >
              <option value="1 Month">1 Month</option>
              <option value="3 Months">3 Months</option>
              <option value="6 Months">6 Months</option>
              <option value="12 Months">12 Months</option>
            </select>

            {/* Custom dropdown UI */}
            <div
              className={`select-selected ${
                isPlanDropdownOpen ? "select-arrow-active" : ""
              }`}
              onClick={() => setIsPlanDropdownOpen(!isPlanDropdownOpen)}
            >
              {formData.membershipPlan}
            </div>

            <div
              className={`select-items ${
                isPlanDropdownOpen ? "" : "select-hide"
              }`}
            >
              <div
                onClick={() => {
                  handleCustomSelectChange("membershipPlan", "1 Month");
                  setIsPlanDropdownOpen(false);
                }}
                className={
                  formData.membershipPlan === "1 Month"
                    ? "same-as-selected"
                    : ""
                }
              >
                1 Month
              </div>
              <div
                onClick={() => {
                  handleCustomSelectChange("membershipPlan", "3 Months");
                  setIsPlanDropdownOpen(false);
                }}
                className={
                  formData.membershipPlan === "3 Months"
                    ? "same-as-selected"
                    : ""
                }
              >
                3 Months
              </div>
              <div
                onClick={() => {
                  handleCustomSelectChange("membershipPlan", "6 Months");
                  setIsPlanDropdownOpen(false);
                }}
                className={
                  formData.membershipPlan === "6 Months"
                    ? "same-as-selected"
                    : ""
                }
              >
                6 Months
              </div>
              <div
                onClick={() => {
                  handleCustomSelectChange("membershipPlan", "12 Months");
                  setIsPlanDropdownOpen(false);
                }}
                className={
                  formData.membershipPlan === "12 Months"
                    ? "same-as-selected"
                    : ""
                }
              >
                12 Months
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Height (cm)</label>
          <input
            type="number"
            name="height"
            value={formData.height}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter height in cm"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Weight (kg)</label>
          <input
            type="number"
            name="weight"
            value={formData.weight}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter weight in kg"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Plan Start Date</label>
          <div className="date-input-container">
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="form-input"
            />
            <FaCalendar className="date-icon" size={20} />
          </div>
        </div>
      </div>

      {/* Capture Face Section */}
      <div className="capture-section">
        <h2 className="capture-title">Capture Face</h2>

        <div className="capture-content">
          {showWebcam ? (
            <div className="webcam-container">
              <Webcam
                audio={false}
                mirrored
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 192,
                  height: 192,
                  facingMode: "user",
                }}
                className="webcam"
                style={{ clipPath: "ellipse(50% 50% at 50% 50%)" }}
              />
              {isCapturing && (
                <div className="countdown-overlay">
                  <div className="countdown-number">
                    {countdown === 0 ? "" : countdown}
                  </div>
                </div>
              )}
            </div>
          ) : capturedImage ? (
            <div className="webcam-container">
              <img
                src={capturedImage}
                alt="captured face"
                className="webcam"
                style={{ clipPath: "ellipse(50% 50% at 50% 50%)" }}
              />
              <button onClick={handleRetake} className="retake-button">
                Retake
              </button>
            </div>
          ) : (
            <div className="capture-placeholder" onClick={startCapture}>
              <div className="placeholder-text">
                <p>Click to capture</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {saveError && (
        <div className="error-message">
          <p>{saveError}</p>
        </div>
      )}

      {/* Save Button */}
      <button
        className="save-button"
        onClick={handleSaveMember}
        disabled={
          !formData.fullName ||
          !formData.phoneNumber ||
          !formData.dateOfBirth ||
          !capturedImage ||
          isSaving
        }
      >
        {isSaving
          ? editMode
            ? "Updating..."
            : "Saving..."
          : editMode
          ? "Update Member"
          : "Save Member"}
      </button>
    </div>
  );
};

export default AddMember;
