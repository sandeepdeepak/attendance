import React, { useState, useRef } from "react";
import { FaArrowLeft, FaCalendar } from "react-icons/fa";
import "./AddMember.css";
import Webcam from "react-webcam";

const AddMember = ({ onBackClick }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    startDate: new Date().toISOString().split("T")[0], // Default to today's date
  });
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [isCapturing, setIsCapturing] = useState(false);
  const webcamRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
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

  const handleSaveMember = () => {
    // Here you would typically send the data to an API
    const memberData = {
      ...formData,
      faceImage: capturedImage,
    };

    console.log("Saving member data:", memberData);

    // After saving, go back to dashboard
    onBackClick();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col px-4 py-8">
      {/* Header with back button and title */}
      <div className="w-full flex items-center mb-8">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={24} />
        </button>
        <div className="text-4xl font-bold mx-auto pr-10">Add Member</div>
      </div>

      {/* Form fields */}
      <div className="flex flex-col space-y-6 mb-6">
        <div className="flex flex-col">
          <label className="text-xl mb-2 ms-2 text-gray-300 text-left">
            Full Name
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            className="bg-[#111] text-white p-4 rounded-lg"
            placeholder="Enter full name"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xl mb-2 ms-2 text-gray-300 text-left">
            Phone Number
          </label>
          <input
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            className="bg-[#111] text-white p-4 rounded-lg"
            placeholder="Enter phone number"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xl mb-2 ms-2 text-gray-300 text-left">
            Start Date
          </label>
          <div className="relative">
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="bg-[#111] text-white p-4 rounded-lg w-full"
            />
            <FaCalendar
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
          </div>
        </div>
      </div>

      {/* Capture Face Section */}
      <div className="bg-[#111] p-6 rounded-lg mb-6">
        <h2 className="text-xl text-center mb-4">Capture Face</h2>

        <div className="flex justify-center">
          {showWebcam ? (
            <div className="relative w-48 h-48">
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
                className="w-full h-full rounded-full"
                style={{ clipPath: "ellipse(50% 50% at 50% 50%)" }}
              />
              {isCapturing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-4xl font-bold text-white bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center">
                    {countdown === 0 ? "" : countdown}
                  </div>
                </div>
              )}
            </div>
          ) : capturedImage ? (
            <div className="relative w-48 h-48">
              <img
                src={capturedImage}
                alt="captured face"
                className="w-full h-full rounded-full object-cover"
                style={{ clipPath: "ellipse(50% 50% at 50% 50%)" }}
              />
              <button
                onClick={handleRetake}
                className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-black px-3 py-1 rounded-lg text-sm"
              >
                Retake
              </button>
            </div>
          ) : (
            <div
              className="w-48 h-48 rounded-full border-2 border-gray-500 flex items-center justify-center cursor-pointer"
              onClick={startCapture}
            >
              <div className="text-center text-gray-400">
                <p>Click to capture</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        className="bg-white text-black py-4 rounded-lg text-xl font-semibold mt-auto"
        onClick={handleSaveMember}
        disabled={!formData.fullName || !formData.phoneNumber || !capturedImage}
      >
        Save Member
      </button>
    </div>
  );
};

export default AddMember;
