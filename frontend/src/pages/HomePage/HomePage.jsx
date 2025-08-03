import React from "react";
import "./HomePage.css";
import { FaArrowRight } from "react-icons/fa";

const HomePage = ({ onFaceRecognitionClick, onLoginClick }) => {
  return (
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col items-center justify-center px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Welcome to Gym</h1>
        <p className="text-xl">
          Track your workouts and manage your fitness journey
        </p>
      </div>

      <div className="w-full max-w-md">
        <button
          onClick={onFaceRecognitionClick}
          className="w-full bg-[#024a72] hover:bg-[#03395a] text-white py-4 px-6 rounded-lg text-xl font-bold flex items-center justify-center mb-6"
        >
          Go to Face Scan
          <FaArrowRight className="ml-2" />
        </button>

        <div className="text-center mt-8">
          <p className="text-gray-400 mb-2">Are you a gym owner?</p>
          <button onClick={onLoginClick} className="text-white underline">
            Login to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
