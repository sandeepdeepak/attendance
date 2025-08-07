import React, { useState, useEffect } from "react";
import "./HomePage.css";
import { FaArrowRight } from "react-icons/fa";
import { API_URL } from "../../config";
import { updatePWAManifest } from "../../utils/pwaManifestUpdater";

const HomePage = ({ onFaceRecognitionClick, onLoginClick }) => {
  const [gymOwner, setGymOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGymOwnerInfo = async () => {
      try {
        // Extract the path from the URL
        const path = window.location.pathname;

        // Check if there's a path segment after the base URL
        const pathSegments = path.split("/").filter((segment) => segment);

        if (pathSegments.length > 0) {
          const identifier = pathSegments[0]; // Get the first path segment

          // Fetch gym owner information using the identifier
          const response = await fetch(
            `${API_URL}/api/gym-owner/${identifier}`
          );

          if (response.ok) {
            const data = await response.json();
            setGymOwner(data.gymOwner);

            // Update document title with gym name
            if (data.gymOwner && data.gymOwner.gymName) {
              document.title = data.gymOwner.gymName;
            }

            // Update favicon if gym owner has a logo
            if (data.gymOwner && data.gymOwner.logoUrl) {
              const linkElement = document.querySelector("link[rel='icon']");
              if (linkElement) {
                linkElement.href = data.gymOwner.logoUrl;
              }
            }

            // Update PWA manifest with gym owner information
            updatePWAManifest(data.gymOwner);
          }
        }
      } catch (error) {
        console.error("Error fetching gym owner information:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGymOwnerInfo();

    // Reset to default title and favicon when component unmounts
    return () => {
      document.title = "Diet & Workouts"; // Reset to default title
      const linkElement = document.querySelector("link[rel='icon']");
      if (linkElement) {
        linkElement.href = "/pwa-192x192.png"; // Reset to default favicon
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col items-center justify-center px-4 py-8">
      {!loading && gymOwner && gymOwner.logoUrl && (
        <div className="mb-8">
          <img
            src={gymOwner.logoUrl}
            alt={`${gymOwner.gymName} Logo`}
            className="max-h-32 max-w-xs"
          />
        </div>
      )}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">
          {gymOwner ? `Welcome to ${gymOwner.gymName}` : "Welcome to Gym"}
        </h1>
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
