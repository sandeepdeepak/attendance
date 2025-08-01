import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import DietPlan from "../DietPlan/DietPlan";
import WorkoutPlan from "../WorkoutPlan/WorkoutPlan";
import axios from "axios";
import { API_URL } from "../../config";
import "./MemberPlan.css";

const MemberPlan = ({ memberId, selectedDate, onBackClick }) => {
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

        // Fetch member details
        const memberResponse = await axios.get(
          `${API_URL}/api/members/${memberId}`
        );

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
  }, [memberId]);

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
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col px-4 py-8">
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
      <div className="toggle-container mb-6">
        <div className="toggle-wrapper">
          <button
            className={`toggle-button ${activeTab === "diet" ? "active" : ""}`}
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
        </div>
      </div>

      {/* Render the active component */}
      {activeTab === "diet" ? (
        <DietPlan
          memberId={memberId}
          selectedDate={selectedDate}
          onBackClick={onBackClick}
          hideHeader={true} // Hide the header in DietPlan since we have it in the parent
        />
      ) : (
        <WorkoutPlan
          memberId={memberId}
          selectedDate={selectedDate}
          onBackClick={onBackClick}
          hideHeader={true} // Hide the header in WorkoutPlan since we have it in the parent
        />
      )}
    </div>
  );
};

export default MemberPlan;
