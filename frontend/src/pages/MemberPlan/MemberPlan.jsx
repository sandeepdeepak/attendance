import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaWeight, FaHistory, FaSave } from "react-icons/fa";
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
  const [showWeightTracker, setShowWeightTracker] = useState(false);
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

        {/* Weight Tracker Button */}
        <div className="flex justify-center mb-4">
          <button
            className={`bg-[#123347] hover:bg-[#1e293b] text-white px-4 py-2 rounded-lg flex items-center ${
              showWeightTracker ? "bg-[#024a72]" : ""
            }`}
            onClick={() => setShowWeightTracker(!showWeightTracker)}
          >
            <FaWeight className="mr-2" />
            Track Weight
          </button>
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
          </div>
        </div>
      </div>

      {/* Weight Tracker Modal/Popup */}
      {showWeightTracker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a1f2e] rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Weight Tracker</h2>
                <button
                  className="text-gray-400 hover:text-white"
                  onClick={() => setShowWeightTracker(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <WeightTracker
                memberId={memberId}
                selectedDate={selectedDate}
                member={member}
                fromFaceRecognition={fromFaceRecognition}
              />
            </div>
          </div>
        </div>
      )}

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

// Weight Tracker Component
const WeightTracker = ({
  memberId,
  selectedDate,
  member,
  fromFaceRecognition,
}) => {
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [weightHistory, setWeightHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    // Set initial weight from member data if available
    if (member && member.weight) {
      setWeight(member.weight);
    }

    // Fetch weight history
    fetchWeightHistory();
  }, [memberId, selectedDate, member]);

  const fetchWeightHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      let config = {};

      // If not coming from face recognition, require authentication
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
      const endpoint = fromFaceRecognition
        ? `${API_URL}/api/weight-history/${memberId}/public`
        : `${API_URL}/api/weight-history/${memberId}`;

      // Fetch weight history from the API
      const response = await axios.get(endpoint, config);

      if (response.data && response.data.success) {
        setWeightHistory(response.data.weightHistory || []);
      } else {
        throw new Error("Failed to fetch weight history");
      }
    } catch (error) {
      console.error("Error fetching weight history:", error);
      setError("Failed to load weight history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!weight) {
      setError("Please enter a weight value");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      let config = {};

      // If not coming from face recognition, require authentication
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

      // Save weight record
      const response = await axios.post(
        `${API_URL}/api/weight-history`,
        {
          memberId,
          date: selectedDate,
          weight,
          notes,
        },
        config
      );

      if (response.data && response.data.success) {
        setSuccess("Weight record saved successfully");
        // Refresh weight history
        fetchWeightHistory();
        // Clear notes field
        setNotes("");
      } else {
        throw new Error("Failed to save weight record");
      }
    } catch (error) {
      console.error("Error saving weight record:", error);
      setError("Failed to save weight record. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="weight-tracker-container">
      <div className="bg-[#123347] rounded-lg p-4 mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <FaWeight className="mr-2" /> Update Weight
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="weight"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Weight (kg) for {formatDate(selectedDate)}
            </label>
            <input
              type="number"
              id="weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              step="0.1"
              min="20"
              max="300"
              className="w-full px-3 py-2 bg-[#0a1f2e] border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter weight in kg"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a1f2e] border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any notes about this weight measurement"
              rows="2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 bg-[#024a72] hover:bg-blue-700 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FaSave className="mr-2" />
            {loading ? "Saving..." : "Save Weight"}
          </button>

          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

          {success && (
            <div className="text-green-500 text-sm mt-2">{success}</div>
          )}
        </form>
      </div>

      <div className="bg-[#123347] rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <FaHistory className="mr-2" /> Weight History
        </h2>

        {loading && <p className="text-gray-400">Loading weight history...</p>}

        {!loading && weightHistory.length === 0 && (
          <p className="text-gray-400">
            No weight records found. Add your first weight measurement above.
          </p>
        )}

        {!loading && weightHistory.length > 0 && (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {weightHistory.map((record, index) => (
              <div key={index} className="bg-[#0a1f2e] p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{formatDate(record.date)}</span>
                  <span className="text-lg font-bold">{record.weight} kg</span>
                </div>
                {record.notes && (
                  <p className="text-sm text-gray-400 mt-1">{record.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberPlan;
