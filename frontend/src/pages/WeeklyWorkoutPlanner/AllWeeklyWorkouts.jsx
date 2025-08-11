import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../config";
import {
  FaArrowLeft,
  FaPlus,
  FaDumbbell,
  FaEdit,
  FaTrash,
  FaEye,
} from "react-icons/fa";
import "./WeeklyWorkoutPlanner.css";

const AllWeeklyWorkouts = ({ onBackClick, onAddNewPlanClick }) => {
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  // Fetch all weekly workout plans when component mounts
  useEffect(() => {
    fetchWeeklyWorkoutPlans();
  }, []);

  const fetchWeeklyWorkoutPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found");
      }

      const response = await axios.get(`${API_URL}/api/weekly-workout-plans`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.data && response.data.plans) {
        // We now have multiple plans
        setWeeklyPlans(response.data.plans);
      } else {
        setWeeklyPlans([]);
      }
    } catch (error) {
      console.error("Error fetching weekly workout plans:", error);
      setError("Failed to load weekly workout plans. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle plan deletion
  const handleDeletePlan = async (planId) => {
    try {
      setDeletingPlan(true);

      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found");
      }

      await axios.delete(`${API_URL}/api/weekly-workout-plans/${planId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Remove the deleted plan from state
      setWeeklyPlans(weeklyPlans.filter((plan) => plan.planId !== planId));
      setShowDeleteConfirm(null);

      // Show success message
      setStatusMessage({
        text: "Workout plan deleted successfully",
        type: "success",
      });

      // Clear message after 3 seconds
      setTimeout(() => {
        setStatusMessage({ text: "", type: "" });
      }, 3000);
    } catch (error) {
      console.error("Error deleting workout plan:", error);
      setStatusMessage({
        text: "Failed to delete workout plan. Please try again.",
        type: "error",
      });

      // Clear message after 3 seconds
      setTimeout(() => {
        setStatusMessage({ text: "", type: "" });
      }, 3000);
    } finally {
      setDeletingPlan(false);
    }
  };

  // Function to handle plan editing
  const handleEditPlan = (planId) => {
    // Navigate to the WeeklyWorkoutPlanner with the selected plan ID
    onAddNewPlanClick(planId);
  };

  // Function to count total exercises in a weekly plan
  const countTotalExercises = (weeklyPlan) => {
    if (!weeklyPlan) return 0;

    return Object.values(weeklyPlan).reduce((total, day) => {
      return total + (day.exercises ? day.exercises.length : 0);
    }, 0);
  };

  // Function to get a summary of body parts targeted in the plan
  const getBodyPartsSummary = (weeklyPlan) => {
    if (!weeklyPlan) return [];

    const bodyParts = new Set();
    Object.values(weeklyPlan).forEach((day) => {
      if (day.exercises) {
        day.exercises.forEach((exercise) => {
          if (exercise.bodyPart) {
            bodyParts.add(exercise.bodyPart);
          }
        });
      }
    });

    return Array.from(bodyParts).slice(0, 3); // Return top 3 body parts
  };

  // Function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to handle creating a new plan
  const handleCreateNewPlan = () => {
    onAddNewPlanClick();
  };

  return (
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col px-4 py-8">
      {/* Header with back button */}
      <button className="text-white p-2" onClick={onBackClick}>
        <FaArrowLeft size={18} />
      </button>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Weekly Workout Plans</h1>
      </div>

      {/* Status message */}
      {statusMessage.text && (
        <div
          className={`mb-4 p-4 rounded-lg text-center ${
            statusMessage.type === "success"
              ? "bg-green-800 text-white"
              : "bg-red-800 text-white"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Add New Plan Button */}
      <div className="mb-6">
        <button
          className="bg-[#036BA2] text-white py-3 px-4 rounded-lg w-full flex items-center justify-center"
          onClick={handleCreateNewPlan}
        >
          <FaPlus className="mr-2" /> Add New Weekly Plan
        </button>
      </div>

      {/* Loading, Error, or No Plans States */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-xl">Loading workout plans...</p>
        </div>
      ) : error ? (
        <div className="bg-red-800 text-white p-4 rounded-lg text-center">
          {error}
        </div>
      ) : weeklyPlans.length === 0 ? (
        <div className="text-center py-8 bg-[#123347] rounded-lg p-6">
          <FaDumbbell size={40} className="mx-auto mb-4 text-gray-500" />
          <p className="text-xl mb-2">No workout plans found</p>
          <p className="text-gray-400">
            Create your first weekly workout plan by clicking the button above.
          </p>
        </div>
      ) : (
        // List of Weekly Plans
        <div className="space-y-4">
          {weeklyPlans.map((plan) => (
            <div key={plan.planId} className="bg-[#123347] rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold">{plan.templateName}</h2>
                <span className="text-xs text-gray-400">
                  Updated: {formatDate(plan.updatedAt)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-[#0a1f2e] p-3 rounded">
                  <p className="text-gray-400 text-sm">Total Exercises</p>
                  <p className="text-xl font-bold">
                    {countTotalExercises(plan.weeklyPlan)}
                  </p>
                </div>
                <div className="bg-[#0a1f2e] p-3 rounded">
                  <p className="text-gray-400 text-sm">Days Planned</p>
                  <p className="text-xl font-bold">
                    {
                      Object.values(plan.weeklyPlan).filter(
                        (day) => day.exercises && day.exercises.length > 0
                      ).length
                    }
                  </p>
                </div>
              </div>

              <div className="mt-3 mb-4">
                <p className="text-sm text-gray-400 mb-2">Body Parts:</p>
                <div className="flex flex-wrap gap-2">
                  {getBodyPartsSummary(plan.weeklyPlan).map(
                    (bodyPart, index) => (
                      <span
                        key={index}
                        className="bg-[#024a72] text-xs px-2 py-1 rounded"
                      >
                        {bodyPart}
                      </span>
                    )
                  )}
                  {getBodyPartsSummary(plan.weeklyPlan).length === 0 && (
                    <span className="text-gray-500 text-xs">
                      No body parts defined
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-between mt-4">
                <button
                  className="flex items-center justify-center gap-2 bg-[#024a72] px-4 py-2 rounded-lg text-white"
                  onClick={() => handleEditPlan(plan.planId)}
                >
                  <FaEdit size={14} /> Edit
                </button>

                {showDeleteConfirm === plan.planId ? (
                  <div className="flex gap-2">
                    <button
                      className="bg-gray-700 text-white px-4 py-2 rounded-lg"
                      onClick={() => setShowDeleteConfirm(null)}
                      disabled={deletingPlan}
                    >
                      Cancel
                    </button>
                    <button
                      className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      onClick={() => handleDeletePlan(plan.planId)}
                      disabled={deletingPlan}
                    >
                      {deletingPlan ? "Deleting..." : "Confirm Delete"}
                    </button>
                  </div>
                ) : (
                  <button
                    className="flex items-center justify-center gap-2 bg-red-700 px-4 py-2 rounded-lg text-white"
                    onClick={() => setShowDeleteConfirm(plan.planId)}
                  >
                    <FaTrash size={14} /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllWeeklyWorkouts;
