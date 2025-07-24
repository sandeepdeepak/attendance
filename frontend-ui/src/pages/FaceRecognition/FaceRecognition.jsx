import React from "react";
import { FaArrowLeft } from "react-icons/fa";
import "./FaceRecognition.css";

const FaceRecognition = ({ onBackClick }) => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-8">
      {/* Header with back button and title */}
      <div className="w-full flex items-center mb-12">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={24} />
        </button>
        <div className="text-4xl font-bold text-left">Face Recognition</div>
      </div>

      {/* Face recognition viewfinder */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="relative w-64 h-64 mb-16">
          {/* Corner brackets for viewfinder effect */}
          <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-white"></div>
          <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-white"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-white"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-white"></div>

          {/* Face silhouette with recognition points */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-48 h-48">
              {/* Face silhouette */}
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                style={{ fill: "#333" }}
              >
                <path d="M50,10 C70,10 85,30 85,55 C85,75 70,90 50,90 C30,90 15,75 15,55 C15,30 30,10 50,10 Z" />
              </svg>

              {/* Face recognition mesh points */}
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full"
                style={{ fill: "none", stroke: "white", strokeWidth: "0.5" }}
              >
                {/* Eyes */}
                <circle cx="35" cy="40" r="2" fill="white" />
                <circle cx="65" cy="40" r="2" fill="white" />

                {/* Eyebrows */}
                <circle cx="30" cy="35" r="2" fill="white" />
                <circle cx="40" cy="35" r="2" fill="white" />
                <circle cx="60" cy="35" r="2" fill="white" />
                <circle cx="70" cy="35" r="2" fill="white" />

                {/* Nose */}
                <circle cx="50" cy="50" r="2" fill="white" />
                <circle cx="45" cy="55" r="2" fill="white" />
                <circle cx="55" cy="55" r="2" fill="white" />

                {/* Mouth */}
                <circle cx="40" cy="70" r="2" fill="white" />
                <circle cx="50" cy="72" r="2" fill="white" />
                <circle cx="60" cy="70" r="2" fill="white" />

                {/* Jaw */}
                <circle cx="30" cy="60" r="2" fill="white" />
                <circle cx="25" cy="50" r="2" fill="white" />
                <circle cx="70" cy="60" r="2" fill="white" />
                <circle cx="75" cy="50" r="2" fill="white" />

                {/* Connect the dots */}
                <line x1="35" y1="40" x2="45" y2="55" />
                <line x1="65" y1="40" x2="55" y2="55" />
                <line x1="45" y1="55" x2="55" y2="55" />
                <line x1="40" y1="70" x2="50" y2="72" />
                <line x1="50" y1="72" x2="60" y2="70" />
                <line x1="30" y1="35" x2="40" y2="35" />
                <line x1="60" y1="35" x2="70" y2="35" />
                <line x1="30" y1="60" x2="40" y2="70" />
                <line x1="60" y1="70" x2="70" y2="60" />
                <line x1="25" y1="50" x2="30" y2="60" />
                <line x1="70" y1="60" x2="75" y2="50" />
                <line x1="30" y1="35" x2="25" y2="50" />
                <line x1="70" y1="35" x2="75" y2="50" />
                <line x1="35" y1="40" x2="30" y2="35" />
                <line x1="65" y1="40" x2="70" y2="35" />
                <line x1="40" y1="35" x2="35" y2="40" />
                <line x1="60" y1="35" x2="65" y2="40" />
                <line x1="45" y1="55" x2="40" y2="70" />
                <line x1="55" y1="55" x2="60" y2="70" />
              </svg>
            </div>
          </div>
        </div>

        {/* Scan instruction */}
        <h2 className="text-4xl font-light mt-8">Scan your face</h2>
      </div>
    </div>
  );
};

export default FaceRecognition;
