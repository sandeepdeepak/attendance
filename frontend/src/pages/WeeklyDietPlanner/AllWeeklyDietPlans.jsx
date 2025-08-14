import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_URL } from "../../config";
import {
  FaArrowLeft,
  FaPlus,
  FaUtensils,
  FaEdit,
  FaTrash,
  FaUsers,
  FaFilePdf,
} from "react-icons/fa";
import jsPDF from "jspdf";
import "./WeeklyDietPlanner.css";

const AllWeeklyDietPlans = ({ onBackClick, onAddNewPlanClick }) => {
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

  // Fetch all weekly diet plans when component mounts
  useEffect(() => {
    fetchWeeklyDietPlans();
  }, []);

  const fetchWeeklyDietPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found");
      }

      const response = await axios.get(`${API_URL}/api/weekly-diet-plans`, {
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
      console.error("Error fetching weekly diet plans:", error);
      setError("Failed to load weekly diet plans. Please try again.");
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

      await axios.delete(`${API_URL}/api/weekly-diet-plans/${planId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Remove the deleted plan from state
      setWeeklyPlans(weeklyPlans.filter((plan) => plan.planId !== planId));
      setShowDeleteConfirm(null);

      // Show success message
      setStatusMessage({
        text: "Diet plan deleted successfully",
        type: "success",
      });

      // Clear message after 3 seconds
      setTimeout(() => {
        setStatusMessage({ text: "", type: "" });
      }, 3000);
    } catch (error) {
      console.error("Error deleting diet plan:", error);
      setStatusMessage({
        text: "Failed to delete diet plan. Please try again.",
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
    // Navigate to the WeeklyDietPlanner with the selected plan ID
    onAddNewPlanClick(planId);
  };

  // Function to count total meals in a weekly plan
  const countTotalMeals = (weeklyPlan) => {
    if (!weeklyPlan) return 0;

    return Object.values(weeklyPlan).reduce((total, day) => {
      return total + (day.meals ? day.meals.length : 0);
    }, 0);
  };

  // Function to calculate total calories in a weekly plan
  const calculateTotalCalories = (weeklyPlan) => {
    if (!weeklyPlan) return 0;

    return Object.values(weeklyPlan).reduce((total, day) => {
      if (!day.meals) return total;

      return (
        total +
        day.meals.reduce((dayTotal, meal) => {
          return dayTotal + (meal.totalCalories || meal.calories || 0);
        }, 0)
      );
    }, 0);
  };

  // Function to get a summary of meal types in the plan
  const getMealTypesSummary = (weeklyPlan) => {
    if (!weeklyPlan) return [];

    const mealTypes = new Set();
    Object.values(weeklyPlan).forEach((day) => {
      if (day.meals) {
        day.meals.forEach((meal) => {
          if (meal.mealType) {
            mealTypes.add(meal.mealType);
          }
        });
      }
    });

    return Array.from(mealTypes);
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

  // Function to generate and download PDF for a diet plan
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
      pdf.text(`Total Meals: ${countTotalMeals(plan.weeklyPlan)}`, margin, 40);
      pdf.text(
        `Total Calories: ${calculateTotalCalories(plan.weeklyPlan)} kcal`,
        margin,
        48
      );
      pdf.text(
        `Days Planned: ${
          Object.values(plan.weeklyPlan).filter(
            (day) => day.meals && day.meals.length > 0
          ).length
        }`,
        margin,
        56
      );

      const mealTypes = getMealTypesSummary(plan.weeklyPlan);
      if (mealTypes.length > 0) {
        pdf.text(`Meal Types: ${mealTypes.join(", ")}`, margin, 64);
      }

      pdf.text(`Last Updated: ${formatDate(plan.updatedAt)}`, margin, 72);

      // Add horizontal line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, 78, pageWidth - margin, 78);

      // Add diet plan details for each day
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
      let yPosition = 88;

      days.forEach((day) => {
        const dayPlan = plan.weeklyPlan[day];
        if (!dayPlan || !dayPlan.meals || dayPlan.meals.length === 0) {
          return; // Skip days with no meals
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

        // Add meals
        pdf.setTextColor(0, 0, 0); // Black text
        pdf.setFontSize(10);

        // Group meals by type
        const mealsByType = {
          breakfast: [],
          lunch: [],
          dinner: [],
          other: [],
        };

        dayPlan.meals.forEach((meal) => {
          const type = meal.mealType || "other";
          if (mealsByType[type]) {
            mealsByType[type].push(meal);
          } else {
            mealsByType.other.push(meal);
          }
        });

        // Add meals by type
        const mealTypeOrder = ["breakfast", "lunch", "dinner", "other"];
        mealTypeOrder.forEach((type) => {
          if (mealsByType[type] && mealsByType[type].length > 0) {
            // Check if we need a new page
            if (yPosition > pageHeight - 30) {
              pdf.addPage();
              yPosition = 20;
            }

            // Add meal type header
            pdf.setFontSize(12);
            pdf.setFont(undefined, "bold");
            pdf.text(
              type.charAt(0).toUpperCase() + type.slice(1),
              margin + 5,
              yPosition
            );
            pdf.setFont(undefined, "normal");
            yPosition += 6;

            // Add meals of this type
            mealsByType[type].forEach((meal, mealIndex) => {
              // Check if we need a new page
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = 20;
              }

              pdf.setFontSize(11);
              pdf.setFont(undefined, "bold");
              pdf.text(
                `${mealIndex + 1}. ${meal.name || "Unnamed Meal"}`,
                margin + 10,
                yPosition
              );
              pdf.setFont(undefined, "normal");
              yPosition += 6;

              // Display nutritional information
              pdf.setFontSize(9);
              const nutritionText = `Calories: ${
                meal.totalCalories || meal.calories
              } kcal | Carbs: ${meal.totalCarbs || meal.carbs}g | Proteins: ${
                meal.totalProteins || meal.proteins
              }g | Fats: ${meal.totalFats || meal.fats}g`;
              pdf.text(nutritionText, margin + 15, yPosition);
              yPosition += 5;

              // Display serving information
              if (meal.serving_qty || meal.serving_unit) {
                const servingText = `Serving: ${meal.quantity || 1} × ${
                  meal.serving_qty || 1
                } ${meal.serving_unit || "serving"}${
                  meal.serving_weight_grams
                    ? ` (${meal.serving_weight_grams}g)`
                    : ""
                }`;
                pdf.text(servingText, margin + 15, yPosition);
                yPosition += 5;
              }

              yPosition += 3; // Add some space between meals
            });

            yPosition += 5; // Add space between meal types
          }
        });

        yPosition += 5; // Add space between days
      });

      // Download the PDF
      pdf.save(`${plan.templateName}_diet_plan.pdf`);

      // Show success message
      setStatusMessage({
        text: "Diet plan PDF downloaded successfully",
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
        `${API_URL}/api/weekly-diet-plans/${selectedPlanId}/assign`,
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
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col py-8 weekly-plans-container">
      {/* Header with back button */}
      <div className="weekly-plans-header">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={18} />
        </button>
        <h1 className="text-md font-bold">Weekly Diet Plans</h1>
        <div className="w-8"></div> {/* Empty div for flex alignment */}
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
      <div className="mb-3 p-3">
        <button
          className="bg-[#036ba2] text-white py-3 px-4 rounded-lg w-full flex items-center justify-center"
          onClick={handleCreateNewPlan}
        >
          <FaPlus className="mr-2" /> Add New Weekly Diet Plan
        </button>
      </div>

      {/* Loading, Error, or No Plans States */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-xl">Loading diet plans...</p>
        </div>
      ) : error ? (
        <div className="bg-red-800 text-white p-4 rounded-lg text-center">
          {error}
        </div>
      ) : weeklyPlans.length === 0 ? (
        <div className="text-center py-8 bg-[#123347] rounded-lg p-6">
          <FaUtensils size={40} className="mx-auto mb-4 text-gray-500" />
          <p className="text-xl mb-2">No diet plans found</p>
          <p className="text-gray-400">
            Create your first weekly diet plan by clicking the button above.
          </p>
        </div>
      ) : (
        // List of Weekly Plans
        <div className="weekly-plans-grid gap-2 p-3">
          {weeklyPlans.map((plan) => (
            <div
              key={plan.planId}
              className="plan-card"
              ref={(el) => (planRefs.current[plan.planId] = el)}
            >
              <div className="plan-card-header">
                <div className="flex flex-col">
                  <h2 className="text-lg font-semibold">{plan.templateName}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      Updated: {formatDate(plan.updatedAt)}
                    </span>
                  </div>
                </div>
                <div
                  className="flex items-center justify-center gap-1 bg-[#2a9d8f] px-2 py-1 rounded text-white text-xs cursor-pointer"
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

              <div className="plan-stats">
                <div className="plan-stat-item">
                  <p className="text-gray-400 text-sm">Total Meals</p>
                  <p className="text-xl font-bold">
                    {countTotalMeals(plan.weeklyPlan)}
                  </p>
                </div>
                <div className="plan-stat-item">
                  <p className="text-gray-400 text-sm">Total Calories</p>
                  <p className="text-xl font-bold">
                    {calculateTotalCalories(plan.weeklyPlan)} kcal
                  </p>
                </div>
              </div>

              <div className="mt-3 mb-4">
                <p className="text-sm text-gray-400 mb-2">Meal Types:</p>
                <div className="flex flex-wrap gap-2">
                  {getMealTypesSummary(plan.weeklyPlan).map(
                    (mealType, index) => (
                      <span
                        key={index}
                        className="bg-[#024a72] text-xs px-2 py-1 rounded"
                      >
                        {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                      </span>
                    )
                  )}
                  {getMealTypesSummary(plan.weeklyPlan).length === 0 && (
                    <span className="text-gray-500 text-xs">
                      No meal types defined
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="plan-actions">
                <div className="flex gap-2">
                  <div
                    className="flex items-center justify-center gap-2 bg-[#024a72] px-4 py-2 rounded-lg text-white"
                    onClick={() => handleEditPlan(plan.planId)}
                  >
                    <FaEdit size={14} /> Edit
                  </div>
                  <div
                    className="flex items-center justify-center gap-2 bg-[#036ba2] px-4 py-2 rounded-lg text-white"
                    onClick={() => handleAssignPlan(plan.planId)}
                  >
                    <FaUsers size={14} /> Assign
                  </div>
                </div>

                {showDeleteConfirm === plan.planId ? (
                  <div className="flex gap-2">
                    <div
                      className="bg-gray-700 text-white px-4 py-2 rounded-lg"
                      onClick={() => setShowDeleteConfirm(null)}
                      disabled={deletingPlan}
                    >
                      Cancel
                    </div>
                    <div
                      className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      onClick={() => handleDeletePlan(plan.planId)}
                      disabled={deletingPlan}
                    >
                      {deletingPlan ? "Deleting..." : "Confirm Delete"}
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center gap-2 bg-red-700 px-4 py-2 rounded-lg text-white"
                    onClick={() => setShowDeleteConfirm(plan.planId)}
                  >
                    <FaTrash size={14} /> Delete
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="assign-modal">
          <div className="assign-modal-content">
            <h2 className="text-md font-bold mb-4">
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
                    className="bg-[#036ba2] text-white px-4 py-2 rounded-lg flex items-center"
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

export default AllWeeklyDietPlans;
