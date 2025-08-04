import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import DietPlan from "../DietPlan/DietPlan";
import WorkoutPlan from "../WorkoutPlan/WorkoutPlan";
import axios from "axios";
import { API_URL } from "../../config";
import "./MemberPlan.css";

const MemberPlan = ({
  memberId,
  selectedDate,
  onBackClick,
  fromFaceRecognition = false,
}) => {
  const [activeTab, setActiveTab] = useState("diet"); // "diet" or "workout"
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format date for display (YYYY-MM-DD to Month DD, YYYY)
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  useEffect(() => {
    const fetchMemberDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        let config = {};

        // If coming from face recognition, don't require authentication
        if (!fromFaceRecognition) {
          // Get auth token from localStorage
          const authToken = localStorage.getItem("authToken");
          if (!authToken) {
            throw new Error(
              "Authentication token not found. Please login again."
            );
          }

          // Create axios config with auth header
          config = {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          };
        }

        // Determine which API endpoint to use based on source
        const memberEndpoint = fromFaceRecognition
          ? `${API_URL}/api/members/${memberId}/public`
          : `${API_URL}/api/members/${memberId}`;

        // Fetch member details
        const memberResponse = await axios.get(memberEndpoint, config);

        if (memberResponse.data && memberResponse.data.member) {
          setMember(memberResponse.data.member);
        }
      } catch (error) {
        console.error("Error fetching member details:", error);
        setError("Failed to load member details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      fetchMemberDetails();
    }
  }, [memberId, fromFaceRecognition]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col items-center justify-center">
        <p className="text-red-500 text-xl">{error}</p>
        <button
          className="mt-4 bg-white text-black px-4 py-2 rounded-lg"
          onClick={onBackClick}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col items-center justify-center">
        <p className="text-xl">Member not found</p>
        <button
          className="mt-4 bg-white text-black px-4 py-2 rounded-lg"
          onClick={onBackClick}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col">
      {/* Fixed header section */}
      <div className="fixed-header px-4 py-4">
        {/* Header with back button and member name */}
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={18} />
        </button>
        <div className="flex items-start space-x-2">
          <div className="items-center w-full">
            <div className="text-xl font-bold flex-grow">{member.fullName}</div>

            <div className="text-center mb-4">
              <h2 className="text-xl text-gray-400">
                {formatDate(selectedDate)}
              </h2>
            </div>
          </div>
        </div>

        {/* Toggle between Diet and Workout */}
        <div className="toggle-container">
          <div className="toggle-wrapper">
            <button
              className={`toggle-button ${
                activeTab === "diet" ? "active" : ""
              }`}
              onClick={() => setActiveTab("diet")}
            >
              Diet Plan
            </button>
            <button
              className={`toggle-button ${
                activeTab === "workout" ? "active" : ""
              }`}
              onClick={() => setActiveTab("workout")}
            >
              Workout Plan
            </button>
            {/* Fallback element for browsers that don't support :has selector */}
            <div
              className="toggle-button-background"
              style={{
                position: "absolute",
                top: "4px",
                left: "4px",
                width: "calc(50% - 4px)",
                height: "calc(100% - 8px)",
                backgroundColor: "white",
                borderRadius: "9999px",
                transition:
                  "transform 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)",
                zIndex: "1",
                transform:
                  activeTab === "workout"
                    ? "translateX(100%)"
                    : "translateX(0)",
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="scrollable-content">
        {/* Render the active component */}
        {activeTab === "diet" ? (
          <DietPlan
            memberId={memberId}
            selectedDate={selectedDate}
            onBackClick={onBackClick}
            hideHeader={true} // Hide the header in DietPlan since we have it in the parent
            fromFaceRecognition={fromFaceRecognition}
          />
        ) : (
          <WorkoutPlan
            memberId={memberId}
            selectedDate={selectedDate}
            onBackClick={onBackClick}
            hideHeader={true} // Hide the header in WorkoutPlan since we have it in the parent
            fromFaceRecognition={fromFaceRecognition}
          />
        )}
      </div>
    </div>
  );
};

export default MemberPlan;
