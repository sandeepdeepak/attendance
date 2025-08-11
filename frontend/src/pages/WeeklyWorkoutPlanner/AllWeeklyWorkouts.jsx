import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_URL } from "../../config";
import {
  FaArrowLeft,
  FaPlus,
  FaDumbbell,
  FaEdit,
  FaTrash,
  FaEye,
  FaUsers,
  FaFilePdf,
} from "react-icons/fa";
import jsPDF from "jspdf";
import "./WeeklyWorkoutPlanner.css";

const AllWeeklyWorkouts = ({ onBackClick, onAddNewPlanClick }) => {
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedPlanName, setSelectedPlanName] = useState("");
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState({});
  const [startDates, setStartDates] = useState({});
  const [assigningPlan, setAssigningPlan] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(null);
  const planRefs = useRef({});

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

  // Function to handle plan assignment
  const handleAssignPlan = (planId) => {
    const plan = weeklyPlans.find((p) => p.planId === planId);
    setSelectedPlanId(planId);
    setSelectedPlanName(plan.templateName);
    setShowAssignModal(true);
    fetchMembers();
  };

  // Function to fetch all members
  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);

      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found");
      }

      const response = await axios.get(`${API_URL}/api/members`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.data && response.data.members) {
        setMembers(response.data.members);

        // Initialize start dates for all members to today
        const today = new Date().toISOString().split("T")[0];
        const initialStartDates = {};
        response.data.members.forEach((member) => {
          initialStartDates[member.id] = today;
        });
        setStartDates(initialStartDates);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      setStatusMessage({
        text: "Failed to load members. Please try again.",
        type: "error",
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  // Function to generate and download PDF for a workout plan
  const generatePDF = async (plan) => {
    try {
      setGeneratingPdf(plan.planId);

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // PDF dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      // Add title
      pdf.setFillColor(10, 31, 46); // Dark blue background
      pdf.rect(0, 0, pageWidth, 30, "F");
      pdf.setTextColor(255, 255, 255); // White text
      pdf.setFontSize(18);
      pdf.text(plan.templateName, pageWidth / 2, 15, { align: "center" });

      // Add summary information
      pdf.setTextColor(0, 0, 0); // Black text
      pdf.setFontSize(12);
      pdf.text(
        `Total Exercises: ${countTotalExercises(plan.weeklyPlan)}`,
        margin,
        40
      );
      pdf.text(
        `Days Planned: ${
          Object.values(plan.weeklyPlan).filter(
            (day) => day.exercises && day.exercises.length > 0
          ).length
        }`,
        margin,
        48
      );

      const bodyParts = getBodyPartsSummary(plan.weeklyPlan);
      if (bodyParts.length > 0) {
        pdf.text(`Body Parts: ${bodyParts.join(", ")}`, margin, 56);
      }

      pdf.text(`Last Updated: ${formatDate(plan.updatedAt)}`, margin, 64);

      // Add horizontal line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, 70, pageWidth - margin, 70);

      // Add workout details for each day
      const days = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      let yPosition = 80;

      days.forEach((day) => {
        const dayPlan = plan.weeklyPlan[day];
        if (!dayPlan || !dayPlan.exercises || dayPlan.exercises.length === 0) {
          return; // Skip days with no exercises
        }

        // Format day name with first letter capitalized
        const formattedDay = day.charAt(0).toUpperCase() + day.slice(1);

        // Add day header
        pdf.setFillColor(2, 74, 114); // Blue background for day header
        pdf.rect(margin, yPosition - 6, contentWidth, 10, "F");
        pdf.setTextColor(255, 255, 255); // White text
        pdf.setFontSize(14);
        pdf.text(formattedDay, margin + 5, yPosition);
        yPosition += 10;

        // Add exercises
        pdf.setTextColor(0, 0, 0); // Black text
        pdf.setFontSize(10);

        dayPlan.exercises.forEach((exercise, exIndex) => {
          // Check if we need a new page
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.setFontSize(11);
          pdf.setFont(undefined, "bold");
          pdf.text(
            `${exIndex + 1}. ${exercise.name || "Unnamed Exercise"}`,
            margin + 5,
            yPosition
          );
          pdf.setFont(undefined, "normal");
          pdf.setFontSize(10);
          yPosition += 6;

          if (exercise.bodyPart) {
            pdf.text(`Body Part: ${exercise.bodyPart}`, margin + 10, yPosition);
            yPosition += 5;
          }

          // Display sets, reps, and weight information
          if (exercise.sets) {
            if (typeof exercise.sets === "object") {
              // If sets is an object, display each set on a separate line
              pdf.text("Sets:", margin + 10, yPosition);
              yPosition += 5;

              try {
                // Try to parse the sets object
                const setsObj = exercise.sets;

                // Handle sets as an array of objects or a single object
                if (Array.isArray(setsObj)) {
                  setsObj.forEach((set, index) => {
                    if (typeof set === "object" && set !== null) {
                      // Extract key information from the set object
                      const setInfo = [];
                      if (set.reps) setInfo.push(`Reps: ${set.reps}`);
                      if (set.weight) setInfo.push(`Weight: ${set.weight}`);

                      pdf.text(
                        `  Set ${index + 1}: ${
                          setInfo.join(", ") || JSON.stringify(set)
                        }`,
                        margin + 10,
                        yPosition
                      );
                    } else {
                      pdf.text(
                        `  Set ${index + 1}: ${set}`,
                        margin + 10,
                        yPosition
                      );
                    }
                    yPosition += 5;
                  });
                } else if (typeof setsObj === "object" && setsObj !== null) {
                  // Handle as a key-value object where keys might be set numbers
                  Object.entries(setsObj).forEach(([setKey, value]) => {
                    if (typeof value === "object" && value !== null) {
                      // Extract key information from the value object
                      const setInfo = [];
                      if (value.reps) setInfo.push(`Reps: ${value.reps}`);
                      if (value.weight) setInfo.push(`Weight: ${value.weight}`);

                      pdf.text(
                        `  Set ${setKey}: ${
                          setInfo.join(", ") || JSON.stringify(value)
                        }`,
                        margin + 10,
                        yPosition
                      );
                    } else {
                      pdf.text(
                        `  Set ${setKey}: ${value}`,
                        margin + 10,
                        yPosition
                      );
                    }
                    yPosition += 5;
                  });
                }
              } catch (err) {
                console.error("Error parsing sets:", err);
                // Fallback if parsing fails
                const setsStr = JSON.stringify(exercise.sets).replace(
                  /[{}"]/g,
                  ""
                );
                pdf.text(`  ${setsStr}`, margin + 10, yPosition);
                yPosition += 5;
              }
            } else {
              pdf.text(`Sets: ${exercise.sets}`, margin + 10, yPosition);
              yPosition += 5;
            }
          }

          // Display reps information
          if (exercise.reps) {
            if (typeof exercise.reps === "object") {
              pdf.text("Reps:", margin + 10, yPosition);
              yPosition += 5;

              try {
                const repsObj = exercise.reps;
                Object.entries(repsObj).forEach(([, value], index) => {
                  pdf.text(
                    `  Set ${index + 1}: ${value}`,
                    margin + 10,
                    yPosition
                  );
                  yPosition += 5;
                });
              } catch (err) {
                console.log("Error parsing reps:", err);
                const repsStr = JSON.stringify(exercise.reps).replace(
                  /[{}"]/g,
                  ""
                );
                pdf.text(`  ${repsStr}`, margin + 10, yPosition);
                yPosition += 5;
              }
            } else {
              pdf.text(`Reps: ${exercise.reps}`, margin + 10, yPosition);
              yPosition += 5;
            }
          }

          // Display weight information
          if (exercise.weight) {
            if (typeof exercise.weight === "object") {
              pdf.text("Weight:", margin + 10, yPosition);
              yPosition += 5;

              try {
                const weightObj = exercise.weight;
                Object.entries(weightObj).forEach(([, value], index) => {
                  pdf.text(
                    `  Set ${index + 1}: ${value}`,
                    margin + 10,
                    yPosition
                  );
                  yPosition += 5;
                });
              } catch (err) {
                console.log("Error parsing weight:", err);
                const weightStr = JSON.stringify(exercise.weight).replace(
                  /[{}"]/g,
                  ""
                );
                pdf.text(`  ${weightStr}`, margin + 10, yPosition);
                yPosition += 5;
              }
            } else {
              pdf.text(`Weight: ${exercise.weight}`, margin + 10, yPosition);
              yPosition += 5;
            }
          }

          if (exercise.notes) {
            pdf.text(`Notes: ${exercise.notes}`, margin + 10, yPosition);
            yPosition += 5;
          }

          yPosition += 3; // Add some space between exercises
        });

        yPosition += 5; // Add space between days
      });

      // Download the PDF
      pdf.save(`${plan.templateName}_workout_plan.pdf`);

      // Show success message
      setStatusMessage({
        text: "Workout plan PDF downloaded successfully",
        type: "success",
      });

      // Clear message after 3 seconds
      setTimeout(() => {
        setStatusMessage({ text: "", type: "" });
      }, 3000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setStatusMessage({
        text: "Failed to generate PDF. Please try again.",
        type: "error",
      });

      // Clear message after 3 seconds
      setTimeout(() => {
        setStatusMessage({ text: "", type: "" });
      }, 3000);
    } finally {
      setGeneratingPdf(null);
    }
  };

  // Function to apply the plan to selected members
  const applyPlanToMembers = async () => {
    try {
      setAssigningPlan(true);

      // Get selected member IDs and their start dates
      const memberIds = [];
      const memberStartDates = [];

      Object.keys(selectedMembers).forEach((memberId) => {
        if (selectedMembers[memberId]) {
          memberIds.push(memberId);
          memberStartDates.push(startDates[memberId]);
        }
      });

      if (memberIds.length === 0) {
        setStatusMessage({
          text: "Please select at least one member",
          type: "error",
        });
        setAssigningPlan(false);
        return;
      }

      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found");
      }

      // Call the API to assign the plan
      const response = await axios.post(
        `${API_URL}/api/weekly-workout-plans/${selectedPlanId}/assign`,
        {
          memberIds,
          startDates: memberStartDates,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.data && response.data.success) {
        setStatusMessage({
          text: `Plan assigned to ${memberIds.length} members successfully`,
          type: "success",
        });

        // Close the modal
        setShowAssignModal(false);
        setSelectedPlanId(null);
        setSelectedMembers({});

        // Clear message after 3 seconds
        setTimeout(() => {
          setStatusMessage({ text: "", type: "" });
        }, 3000);
      }
    } catch (error) {
      console.error("Error assigning plan:", error);
      setStatusMessage({
        text: "Failed to assign plan. Please try again.",
        type: "error",
      });
    } finally {
      setAssigningPlan(false);
    }
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
            <div
              key={plan.planId}
              className="bg-[#123347] rounded-lg p-4"
              ref={(el) => (planRefs.current[plan.planId] = el)}
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold">{plan.templateName}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    Updated: {formatDate(plan.updatedAt)}
                  </span>
                  <div
                    className="flex items-center justify-center gap-1 bg-[#2a9d8f] px-2 py-1 rounded text-white text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      generatePDF(plan);
                    }}
                    disabled={generatingPdf === plan.planId}
                  >
                    {generatingPdf === plan.planId ? (
                      <>
                        <div className="w-3 h-3 border-2 border-t-2 border-white rounded-full animate-spin"></div>
                        PDF
                      </>
                    ) : (
                      <>
                        <FaFilePdf size={12} /> PDF
                      </>
                    )}
                  </div>
                </div>
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
                <div className="flex gap-2">
                  <button
                    className="flex items-center justify-center gap-2 bg-[#024a72] px-4 py-2 rounded-lg text-white"
                    onClick={() => handleEditPlan(plan.planId)}
                  >
                    <FaEdit size={14} /> Edit
                  </button>
                  <button
                    className="flex items-center justify-center gap-2 bg-[#036BA2] px-4 py-2 rounded-lg text-white"
                    onClick={() => handleAssignPlan(plan.planId)}
                  >
                    <FaUsers size={14} /> Assign
                  </button>
                </div>

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

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-[#0a1f2e] bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#123347] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              Assign "{selectedPlanName}" to Members
            </h2>

            {loadingMembers ? (
              <div className="text-center py-8">
                <p className="text-xl">Loading members...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xl">No members found</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="select-all"
                      className="mr-2"
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const newSelectedMembers = {};
                        members.forEach((member) => {
                          newSelectedMembers[member.id] = isChecked;
                        });
                        setSelectedMembers(newSelectedMembers);
                      }}
                    />
                    <label htmlFor="select-all" className="font-bold">
                      Select All
                    </label>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="bg-[#0a1f2e] p-3 rounded-lg"
                    >
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`member-${member.id}`}
                          checked={selectedMembers[member.id] || false}
                          onChange={(e) => {
                            setSelectedMembers({
                              ...selectedMembers,
                              [member.id]: e.target.checked,
                            });
                          }}
                          className="mr-2"
                        />
                        <label
                          htmlFor={`member-${member.id}`}
                          className="font-medium"
                        >
                          {member.fullName}
                        </label>
                      </div>

                      {selectedMembers[member.id] && (
                        <div className="ml-6 mt-2">
                          <label className="block text-sm text-gray-300 mb-1">
                            Start Date:
                          </label>
                          <input
                            type="date"
                            value={
                              startDates[member.id] ||
                              new Date().toISOString().split("T")[0]
                            }
                            min={new Date().toISOString().split("T")[0]}
                            onChange={(e) => {
                              setStartDates({
                                ...startDates,
                                [member.id]: e.target.value,
                              });
                            }}
                            className="bg-[#1e293b] text-white p-2 rounded w-full"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg"
                    onClick={() => setShowAssignModal(false)}
                    disabled={assigningPlan}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-[#036BA2] text-white px-4 py-2 rounded-lg flex items-center"
                    onClick={applyPlanToMembers}
                    disabled={assigningPlan}
                  >
                    {assigningPlan ? (
                      <>
                        <div className="w-5 h-5 border-2 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                        Assigning...
                      </>
                    ) : (
                      "Apply Plan"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllWeeklyWorkouts;
