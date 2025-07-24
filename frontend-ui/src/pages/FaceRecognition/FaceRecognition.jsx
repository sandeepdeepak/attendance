import React, { useState, useEffect, useRef } from "react";
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa";
import "./FaceRecognition.css";
import Webcam from "react-webcam";

import axios from "axios";

const FaceRecognition = ({ onBackClick }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [isCapturing, setIsCapturing] = useState(true);
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const webcamRef = useRef(null);

  // Start countdown when component mounts
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

  const handleCapture = async () => {
    if (webcamRef.current) {
      const image = webcamRef.current.getScreenshot();
      setCapturedImage(image);
      setIsCapturing(false);

      // Send image to API for face recognition
      try {
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
          response = await axios.post("http://localhost:7777/api/search", form);
          setSearchResult(response.data);
        } else {
          // Simulate API response if axios is not available
          console.log(
            "Simulating API call with image:",
            image.substring(0, 50) + "..."
          );

          // Simulate a delay
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Mock response
          setSearchResult({
            success: true,
            match: true,
            person: {
              name: "John Doe",
              id: "12345",
              confidence: 0.92,
            },
          });
        }
      } catch (error) {
        console.error("Error searching face:", error);
        setSearchError("Failed to process face. Please try again.");
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setSearchResult(null);
    setSearchError(null);
    setCountdown(3);
    setIsCapturing(true);
  };

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
            <p className="text-sm text-gray-400">
              Confidence: {Math.round(searchResult.similarity)}%
            </p>
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-8">
      {/* Header with back button and title */}
      <div className="w-full flex items-center mb-12">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={24} />
        </button>
        <div className="text-4xl font-bold">Face Recognition</div>
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
            ) : (
              <div className="relative w-full h-full">
                <Webcam
                  audio={false}
                  mirrored
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    width: 256,
                    height: 256,
                    facingMode: "user",
                  }}
                  className="w-full h-full object-cover"
                />
                {isCapturing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl font-bold text-white bg-black bg-opacity-50 rounded-full w-20 h-20 flex items-center justify-center">
                      {countdown === 0 ? "" : countdown}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search results or scan instruction */}
        {capturedImage ? (
          renderSearchResults()
        ) : (
          <h2 className="text-4xl font-light mt-4">Scan your face</h2>
        )}
      </div>
    </div>
  );
};

export default FaceRecognition;
