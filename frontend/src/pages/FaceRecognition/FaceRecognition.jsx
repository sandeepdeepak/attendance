import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaArrowLeft,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaCamera,
} from "react-icons/fa";
import "./FaceRecognition.css";
import Webcam from "react-webcam";
import axios from "axios";
import { API_URL } from "../../config";

const FaceRecognition = ({ onBackClick, onMemberClick }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [isCapturing, setIsCapturing] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [showResultTimer, setShowResultTimer] = useState(null);
  const [membershipExpired, setMembershipExpired] = useState(false);
  const [memberId, setMemberId] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const webcamRef = useRef(null);

  // Start camera when user clicks the button
  const startCamera = () => {
    setCameraError(null);
    setShowWebcam(true);
    setIsCapturing(true);
    setCountdown(3);
  };

  // Start countdown when camera is activated
  useEffect(() => {
    if (isCapturing && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isCapturing && countdown === 0) {
      // Capture image when countdown reaches 0
      setTimeout(() => {
        handleCapture();
      }, 500);
    }
  }, [countdown, isCapturing]);

  // Handle camera errors
  useEffect(() => {
    if (showWebcam) {
      const checkCameraAvailability = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(
            (device) => device.kind === "videoinput"
          );

          if (videoDevices.length === 0) {
            setCameraError("No camera detected on your device");
          }
        } catch (err) {
          console.error("Error checking camera:", err);
          setCameraError("Could not access camera. Please check permissions.");
        }
      };

      checkCameraAvailability();
    }
  }, [showWebcam]);

  const handleCapture = async () => {
    if (webcamRef.current) {
      try {
        const image = webcamRef.current.getScreenshot();
        if (!image) {
          setCameraError("Failed to capture image. Please try again.");
          return;
        }

        setCapturedImage(image);
        setIsCapturing(false);
        setShowWebcam(false);

        // Send image to API for face recognition
        setIsSearching(true);
        setSearchError(null);

        // Create form data
        const form = new FormData();

        // Convert base64 image to blob
        const searchImgBlob = await (await fetch(image)).blob();
        const searchImgFile = new File([searchImgBlob], "capture.jpg", {
          type: "image/jpeg",
        });

        form.append("image", searchImgFile);
        form.append("collectionId", "default"); // Using "default" as collection ID

        let response;

        if (axios) {
          // Make API call if axios is available
          response = await axios.post(`${API_URL}/api/search`, form);
          const result = response.data;
          setSearchResult(result);

          // Check if membership has expired
          let isExpired = false;

          if (result.match) {
            // Check if the API response already indicates expired membership
            if (result.membershipExpired) {
              isExpired = true;
            } else if (result.member && result.membership) {
              // If not explicitly marked as expired, check using the membership data
              const today = new Date();
              const endDate = new Date(result.membership.endDate);
              isExpired = today > endDate;
            }

            // Set the state for UI rendering
            setMembershipExpired(isExpired);

            // Store member ID for the "View Details" button
            if (result.id) {
              setMemberId(result.id);
            } else if (result.member && result.member.id) {
              setMemberId(result.member.id);
            }
          } else if (result.match) {
            // If there's a match but no member details
            if (result.id) {
              setMemberId(result.id);
            }
          }
        } else {
          // Simulate API response if axios is not available
          console.log(
            "Simulating API call with image:",
            image.substring(0, 50) + "..."
          );

          // Simulate a delay
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Mock response
          const mockResult = {
            success: true,
            match: true,
            person: {
              name: "John Doe",
              id: "12345",
              confidence: 0.92,
            },
          };
          setSearchResult(mockResult);

          // Store member ID for the "View Details" button
          setMemberId(mockResult.person.id);
        }
      } catch (error) {
        console.error("Error searching face:", error);
        setSearchError("Failed to process face. Please try again.");
      } finally {
        setIsSearching(false);
      }
    }
  };

  // Calculate if membership has expired
  const checkMembershipExpired = (startDate, membershipPlan) => {
    if (!startDate || !membershipPlan) return false;

    const start = new Date(startDate);
    const today = new Date();

    // Calculate end date based on membership plan
    const planMonths = {
      "1 Month": 1,
      "3 Months": 3,
      "6 Months": 6,
      "12 Months": 12,
    };

    const months = planMonths[membershipPlan] || 1;
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);

    // Compare end date with today
    return today > endDate;
  };

  // Clear timer when component unmounts or when retaking
  useEffect(() => {
    return () => {
      if (showResultTimer) {
        clearTimeout(showResultTimer);
      }
    };
  }, [showResultTimer]);

  const handleRetake = useCallback(() => {
    // Clear any existing timer
    if (showResultTimer) {
      clearTimeout(showResultTimer);
      setShowResultTimer(null);
    }

    setCapturedImage(null);
    setSearchResult(null);
    setSearchError(null);
    setCountdown(3);
    setIsCapturing(true);
  }, [showResultTimer]);

  // Render search results
  const renderSearchResults = () => {
    if (isSearching) {
      return (
        <div className="mt-4 text-center">
          <p className="text-lg">Processing face recognition...</p>
        </div>
      );
    }

    if (searchError) {
      return (
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center text-red-500 mb-2">
            <FaTimes size={24} className="mr-2" />
            <p className="text-lg">Error</p>
          </div>
          <p>{searchError}</p>
          <button
            onClick={handleRetake}
            className="mt-4 bg-white text-black px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (searchResult) {
      if (searchResult.match) {
        // Check if membership has expired
        if (membershipExpired) {
          return (
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center text-yellow-500 mb-2">
                <FaExclamationTriangle size={24} className="mr-2" />
                <p className="text-lg">Membership Expired</p>
              </div>
              <p className="text-xl font-bold">
                {searchResult.member
                  ? `Hello ${searchResult.member.fullName}`
                  : `Hello ${searchResult.id}`}
              </p>
              <div className="mt-3 p-3 rounded-lg bg-red-800">
                <p className="text-lg font-bold">Entry Denied</p>
                <p className="text-sm">Your membership has expired.</p>
                <p className="text-sm">Please renew your membership.</p>
              </div>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  onClick={handleRetake}
                  className="bg-white text-black px-4 py-2 rounded-lg"
                >
                  OK
                </button>
                {/* {searchResult.id && (
                  <button
                    onClick={() => onMemberClick(searchResult.id)}
                    className="bg-[#024a72] text-white px-4 py-2 rounded-lg"
                  >
                    Extend Membership
                  </button>
                )} */}
              </div>
            </div>
          );
        }

        // Get attendance information if available
        const attendanceInfo = searchResult.attendance;
        const isEntry = attendanceInfo && attendanceInfo.type === "ENTRY";
        const isExit = attendanceInfo && attendanceInfo.type === "EXIT";

        // Format timestamp if available
        const formattedTime = attendanceInfo
          ? new Date(attendanceInfo.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "";

        return (
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center text-green-500 mb-2">
              <FaCheck size={24} className="mr-2" />
              <p className="text-lg">Match Found</p>
            </div>
            <p className="text-xl font-bold">
              {searchResult.member
                ? `Welcome ${searchResult.member.fullName}`
                : `Welcome ${searchResult.id}`}
            </p>
            {/* <p className="text-sm text-gray-400 mb-2">
              Confidence: {Math.round(searchResult.similarity)}%
            </p> */}

            {/* Display attendance information */}
            {attendanceInfo && (
              <div
                className={`mt-3 p-3 rounded-lg ${
                  isEntry
                    ? "bg-green-800"
                    : isExit
                    ? "bg-[#024a72]"
                    : "bg-purple-800"
                }`}
              >
                <p className="text-lg font-bold">
                  {isEntry
                    ? "✓ Entry Recorded"
                    : isExit
                    ? "✓ Exit Recorded"
                    : "✓ Attendance Recorded"}
                </p>
                <p className="text-sm">{formattedTime}</p>
              </div>
            )}

            {/* View Member Details button */}
            {memberId && (
              <div className="mt-4">
                <button
                  onClick={() => onMemberClick(memberId)}
                  className="bg-[#024a72] hover:bg-[#03395a] text-white px-6 py-3 rounded-lg font-bold"
                >
                  View Member Details
                </button>
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center text-yellow-500 mb-2">
              <FaTimes size={24} className="mr-2" />
              <p className="text-lg">No Match Found</p>
            </div>
            <p>This person is not in our records.</p>
            <button
              onClick={handleRetake}
              className="mt-4 bg-white text-black px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col items-center px-4 py-8">
      {/* Header with back button and title */}
      <div className="w-full flex items-center mb-12">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={24} />
        </button>
      </div>

      {/* Face recognition viewfinder */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="relative w-64 h-64 mb-8">
          {/* Corner brackets for viewfinder effect */}
          <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-white"></div>
          <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-white"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-white"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-white"></div>

          {/* Webcam view with countdown overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            {capturedImage ? (
              <div className="relative w-full h-full">
                <img
                  src={capturedImage}
                  alt="captured"
                  className="w-full h-full object-cover"
                />
                {!searchResult && !isSearching && !searchError && (
                  <button
                    onClick={handleRetake}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-black px-4 py-2 rounded-lg"
                  >
                    Retake
                  </button>
                )}
              </div>
            ) : showWebcam ? (
              <div className="relative w-full h-full">
                <Webcam
                  audio={false}
                  mirrored
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    width: { ideal: 256 },
                    height: { ideal: 256 },
                    facingMode: { ideal: "user" },
                  }}
                  className="w-full h-full object-cover"
                  onUserMediaError={(err) => {
                    console.error("Webcam error:", err);
                    setCameraError(
                      `Camera error: ${
                        err.name === "NotAllowedError"
                          ? "Permission denied"
                          : err.message || "Unknown error"
                      }`
                    );
                    setShowWebcam(false);
                  }}
                />
                {isCapturing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl font-bold text-white bg-[#0a1f2e] bg-opacity-50 rounded-full w-20 h-20 flex items-center justify-center">
                      {countdown === 0 ? "" : countdown}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {cameraError ? (
                  <div className="text-center text-red-400">
                    <p className="mb-3">{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="bg-white text-black px-4 py-2 rounded-lg"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startCamera}
                    className="bg-white text-black px-6 py-3 rounded-lg flex items-center"
                  >
                    <FaCamera className="mr-2" /> Start Camera
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search results or scan instruction */}
        {capturedImage ? (
          renderSearchResults()
        ) : (
          <h2 className="text-4xl font-light mt-4">
            {showWebcam ? "Scan your face" : "Tap to start camera"}
          </h2>
        )}
      </div>
    </div>
  );
};

export default FaceRecognition;
