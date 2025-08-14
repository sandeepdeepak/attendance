import React, { useState, useEffect, useRef, useCallback } from "react";

// Cache for loaded GIF URLs to prevent reloading
const cachedGifUrls = new Set();

// Lazy loading component specifically for modal workout images
const LazyModalWorkoutImage = ({ src, alt }) => {
  const [isVisible, setIsVisible] = useState(cachedGifUrls.has(src));
  const ref = useRef();

  const observerCallback = useCallback(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          cachedGifUrls.add(src);
        }
      });
    },
    [src]
  );

  useEffect(() => {
    if (cachedGifUrls.has(src)) return;

    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: "100px",
      threshold: 0.1,
    });
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [observerCallback, src]);

  return (
    <div ref={ref} style={{ width: "100%", height: "96px" }}>
      {isVisible ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-34 object-contain rounded"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://gym-meals-and-workout-planner.s3.us-east-2.amazonaws.com/assets/gym-workouts/0.gif";
          }}
        />
      ) : (
        <div style={{ height: "96px", width: "100%" }}></div>
      )}
    </div>
  );
};

// Regular workout item without lazy loading for added workouts
const WorkoutItem = ({ workout, isSelected, onClick }) => {
  return (
    <div
      className={`cursor-pointer border rounded-lg p-1 flex flex-col items-center ${
        isSelected ? "border-blue-500 bg-blue-900" : "border-gray-700"
      }`}
      onClick={onClick}
    >
      <img
        src={workout.gifUrl}
        alt={workout.name}
        className="w-full h-34 object-contain rounded"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src =
            "https://gym-meals-and-workout-planner.s3.us-east-2.amazonaws.com/assets/gym-workouts/0.gif";
        }}
      />
    </div>
  );
};
import {
  FaArrowLeft,
  FaDumbbell,
  FaSave,
  FaTrash,
  FaPlus,
} from "react-icons/fa";
import axios from "axios";
import { API_URL } from "../../config";
import "./WeeklyWorkoutPlanner.css";
import { allWorkouts } from "../WorkoutPlan/all-workouts";
import Select from "react-select";
import makeAnimated from "react-select/animated";

const WeeklyWorkoutPlanner = ({ onBackClick, planId }) => {
  const [activeDay, setActiveDay] = useState("monday");
  const [weeklyPlan, setWeeklyPlan] = useState({
    monday: { exercises: [] },
    tuesday: { exercises: [] },
    wednesday: { exercises: [] },
    thursday: { exercises: [] },
    friday: { exercises: [] },
    saturday: { exercises: [] },
    sunday: { exercises: [] },
  });
  const [templateName, setTemplateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  const [isEditing, setIsEditing] = useState(false);

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  // Handle day selection
  const handleDaySelect = (day) => {
    setActiveDay(day);
  };

  // Function to fetch weekly workout plan
  const fetchWeeklyWorkoutPlan = async () => {
    try {
      setLoading(true);

      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found");
      }

      // If planId is provided, try to fetch that specific plan
      if (planId) {
        try {
          const response = await axios.get(
            `${API_URL}/api/weekly-workout-plans/${planId}`,
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          );

          if (response.data && response.data.plan) {
            setWeeklyPlan(response.data.plan.weeklyPlan);
            setTemplateName(response.data.plan.templateName);
            setIsEditing(true);
          }
        } catch (planError) {
          console.error("Error fetching specific plan:", planError);

          // If there's a validation error with the key, fall back to creating a new plan
          if (
            planError.response &&
            (planError.response.data.error?.includes("ValidationException") ||
              planError.response.status === 404)
          ) {
            console.log(
              "Plan not found or validation error, creating new plan instead"
            );
            setIsEditing(false);

            // Show a message to the user
            setStatusMessage({
              text: "Could not find the selected plan. Creating a new plan instead.",
              type: "info",
            });

            // Clear the message after 3 seconds
            setTimeout(() => {
              setStatusMessage({ text: "", type: "" });
            }, 3000);
          } else {
            // For other errors, show the error message
            throw planError;
          }
        }
      } else {
        // For backward compatibility, still check the old endpoint
        const response = await axios.get(
          `${API_URL}/api/weekly-workout-plans`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (response.data && response.data.weeklyPlan) {
          setWeeklyPlan(response.data.weeklyPlan);
        }
      }
    } catch (error) {
      console.error("Error fetching weekly workout plan:", error);
      setStatusMessage({
        text: "Failed to load weekly workout plan. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to save weekly workout plan
  const saveWeeklyWorkoutPlan = async () => {
    try {
      if (!templateName.trim()) {
        setStatusMessage({
          text: "Please enter a template name for your workout plan",
          type: "error",
        });
        return;
      }

      setLoading(true);

      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found");
      }

      let response;

      if (isEditing && planId) {
        // Update existing plan
        response = await axios.put(
          `${API_URL}/api/weekly-workout-plans/${planId}`,
          { weeklyPlan, templateName },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
      } else {
        // Create new plan
        response = await axios.post(
          `${API_URL}/api/weekly-workout-plans`,
          { weeklyPlan, templateName },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
      }

      if (response.data && response.data.success) {
        setStatusMessage({
          text: isEditing
            ? "Weekly workout plan updated successfully!"
            : "Weekly workout plan saved successfully!",
          type: "success",
        });

        // Show success message briefly before navigating back
        setTimeout(() => {
          // Navigate back to the AllWeeklyWorkouts page
          onBackClick();
        }, 1500);
      }
    } catch (error) {
      console.error("Error saving weekly workout plan:", error);
      setStatusMessage({
        text: "Failed to save weekly workout plan. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load weekly plan on component mount
  useEffect(() => {
    fetchWeeklyWorkoutPlan();
  }, []);

  // Function to update exercises for the active day
  const updateDayExercises = (exercises) => {
    setWeeklyPlan((prevPlan) => ({
      ...prevPlan,
      [activeDay]: { exercises },
    }));
  };

  // State for workout selection modal
  const [showWorkoutSelectionModal, setShowWorkoutSelectionModal] =
    useState(false);
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState(new Set());
  const [workoutSearchTerm, setWorkoutSearchTerm] = useState("");
  const animatedComponents = makeAnimated();

  // Filter states for workout selection
  const [filterBodyParts, setFilterBodyParts] = useState([]);
  const [filterEquipments, setFilterEquipments] = useState([]);
  const [filterTargets, setFilterTargets] = useState([]);
  const [lastToggledWorkoutId, setLastToggledWorkoutId] = useState(null);

  // Custom WorkoutPlanAdapter component to adapt WorkoutPlan for weekly planning
  const WorkoutPlanAdapter = () => {
    // Use the exercises directly from the weeklyPlan state to ensure consistency
    const exercises = weeklyPlan[activeDay]?.exercises || [];

    // Function to update exercises that directly updates the parent state
    const updateExercises = (newExercises) => {
      updateDayExercises(newExercises);
    };

    // Function to handle adding selected workouts to the plan
    const addSelectedWorkoutsToPlan = () => {
      const selectedWorkouts = allWorkouts
        .filter((workout) => selectedWorkoutIds.has(workout.id))
        .map((workout) => {
          const setCount = 1; // Default to 1 set
          const repsCount = 10; // Default to 10 reps

          // Initialize sets array with default values
          const sets = Array(setCount)
            .fill()
            .map(() => ({
              weight: 5, // Default weight is 5kg
              reps: repsCount, // Default reps
            }));

          return {
            ...workout,
            setCount,
            repsCount,
            sets,
          };
        });

      // Add selected workouts directly to the parent state
      updateExercises([...exercises, ...selectedWorkouts]);

      // Clear selection and close modal
      setSelectedWorkoutIds(new Set());
      setShowWorkoutSelectionModal(false);
    };

    // Ref for the last toggled workout
    const lastToggledWorkoutRef = useRef(null);
    // State to track the last toggled workout ID

    // Handle selection toggle for workout selection modal
    const toggleWorkoutSelection = (workoutId) => {
      // Store the ID of the workout being toggled
      console.log("Toggling workout selection for ID:", workoutId);
      setLastToggledWorkoutId(workoutId);

      setSelectedWorkoutIds((prevSelected) => {
        const newSelected = new Set(prevSelected);
        if (newSelected.has(workoutId)) {
          newSelected.delete(workoutId);
        } else {
          newSelected.add(workoutId);
        }
        return newSelected;
      });
    };

    // Scroll to the last toggled workout when selection state changes
    useEffect(() => {
      setTimeout(() => {
        console.log("Last toggled workout ID:", lastToggledWorkoutId);
        if (lastToggledWorkoutId) {
          // Find the element with the ref
          const element = document.getElementById(
            `workout-item-${lastToggledWorkoutId}`
          );
          if (element) {
            console.log("Scrolling to workout item:", element);
            // Scroll the element into view with smooth behavior
            element.scrollIntoView({ behavior: "instant", block: "center" });
          }
        }
      }, 0); // Delay to ensure DOM updates
    }, [selectedWorkoutIds, lastToggledWorkoutId]);

    return (
      <div className="workout-plan-container">
        <div className="bg-[#1C2937] rounded-lg p-4 mb-4">
          {/* <h2 className="text-xl font-bold mb-4">
            {activeDay.charAt(0).toUpperCase() + activeDay.slice(1)} Workouts
          </h2> */}

          {exercises.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No exercises added for {activeDay}. Add workouts below.
            </div>
          ) : (
            <div className="space-y-4">
              {exercises.map((exercise, index) => (
                <div key={index} className="bg-[#123347] p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2 relative">
                    <h3 className="font-semibold text-left mt-2 text-lg">
                      {exercise.name.charAt(0).toUpperCase() +
                        exercise.name.slice(1)}
                    </h3>
                    <div
                      className="absolute -top-7 -left-6 text-red-500 bg-[#024a72] rounded-full p-[10px]"
                      onClick={() => {
                        const updatedExercises = [...exercises];
                        updatedExercises.splice(index, 1);
                        updateExercises(updatedExercises);
                      }}
                    >
                      <FaTrash size={12} />
                    </div>
                  </div>

                  <div className="flex mb-2 items-center">
                    <div className="w-3/4 mr-2">
                      <WorkoutItem
                        workout={exercise}
                        isSelected={false}
                        onClick={() => {}}
                      />
                    </div>
                    <div className="w-3/4">
                      <div className="mb-2 p-2">
                        <label className="block text-gray-400 text-sm">
                          Sets
                        </label>
                        <input
                          type="number"
                          value={exercise.setCount || 1}
                          onChange={(e) => {
                            const newSetCount = parseInt(e.target.value) || 1;
                            const updatedExercises = [...exercises];

                            // Create or adjust sets array based on new setCount
                            let newSets = [...(exercise.sets || [])];

                            // If increasing sets, add new sets with default values
                            if (newSetCount > newSets.length) {
                              const additionalSets = Array(
                                newSetCount - newSets.length
                              )
                                .fill()
                                .map(() => ({
                                  weight: 5, // Default weight
                                  reps: exercise.repsCount || 10, // Default reps
                                }));
                              newSets = [...newSets, ...additionalSets];
                            }
                            // If decreasing sets, truncate the array
                            else if (newSetCount < newSets.length) {
                              newSets = newSets.slice(0, newSetCount);
                            }

                            updatedExercises[index] = {
                              ...exercise,
                              setCount: newSetCount,
                              sets: newSets,
                            };
                            updateExercises(updatedExercises);
                          }}
                          className="bg-[#1e293b] text-white p-2 rounded w-full"
                          min="1"
                        />
                      </div>

                      {/* Sets details */}
                      <div className="mt-3">
                        <label className="block text-gray-400 text-sm mb-2">
                          Set Details
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {exercise.sets &&
                            exercise.sets.map((set, setIndex) => (
                              <div
                                key={setIndex}
                                className="flex items-center gap-2 bg-[#0a1f2e] p-2 rounded"
                              >
                                <span className="text-xs text-gray-400 w-6 mt-3">
                                  #{setIndex + 1}
                                </span>
                                {/* Only show weight dropdown for specific equipment types */}
                                {[
                                  "leverage machine",
                                  "barbell",
                                  "dumbbell",
                                  "weighted",
                                ].includes(exercise.equipment) && (
                                  <div className="flex-1">
                                    <label className="block text-gray-400 text-xs">
                                      Weight
                                    </label>
                                    <select
                                      value={set.weight || 5}
                                      onChange={(e) => {
                                        const updatedExercises = [...exercises];
                                        const updatedSets = [
                                          ...(exercise.sets || []),
                                        ];
                                        updatedSets[setIndex] = {
                                          ...set,
                                          weight: parseFloat(e.target.value),
                                        };
                                        updatedExercises[index] = {
                                          ...exercise,
                                          sets: updatedSets,
                                        };
                                        updateExercises(updatedExercises);
                                      }}
                                      className="bg-[#1e293b] text-white p-1 rounded w-20 text-sm text-right"
                                    >
                                      {[
                                        2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20,
                                        22.5, 25, 27.5, 30, 35, 40, 45, 50,
                                      ].map((weight) => (
                                        <option key={weight} value={weight}>
                                          {weight} kg
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <label className="block text-gray-400 text-xs">
                                    Reps
                                  </label>
                                  <input
                                    type="number"
                                    value={set.reps || 10}
                                    onChange={(e) => {
                                      const updatedExercises = [...exercises];
                                      const updatedSets = [
                                        ...(exercise.sets || []),
                                      ];
                                      updatedSets[setIndex] = {
                                        ...set,
                                        reps: parseInt(e.target.value) || 10,
                                      };
                                      updatedExercises[index] = {
                                        ...exercise,
                                        sets: updatedSets,
                                      };
                                      updateExercises(updatedExercises);
                                    }}
                                    className="bg-[#1e293b] text-white p-1 rounded w-8 text-sm"
                                    min="1"
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workout Selection Modal */}
        {showWorkoutSelectionModal && (
          <div className="fixed inset-0 bg-[#0a1f2e] bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-[#1C2937] p-6 rounded-lg w-full max-w-3xl">
              <h2 className="text-3xl font-bold mb-6 text-center">
                Select Workouts
              </h2>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search workouts..."
                  value={workoutSearchTerm}
                  onChange={(e) => setWorkoutSearchTerm(e.target.value)}
                  className="w-full p-2 rounded bg-gray-800 text-white"
                />
              </div>

              {/* Multi-select filters */}
              <div className="grid grid-cols-1">
                {/* Body Part Filter */}
                <div className="mb-4">
                  <Select
                    closeMenuOnSelect={false}
                    components={animatedComponents}
                    isMulti
                    options={[...new Set(allWorkouts.map((w) => w.bodyPart))]
                      .filter(Boolean)
                      .map((bodyPart) => ({
                        value: bodyPart,
                        label: bodyPart,
                      }))}
                    value={filterBodyParts}
                    onChange={setFilterBodyParts}
                    placeholder="Select Body Parts"
                    className="text-black"
                    styles={{
                      control: (base) => ({
                        ...base,
                        backgroundColor: "#1f2937", // match bg-gray-800
                        color: "white",
                      }),
                      menu: (base) => ({
                        ...base,
                        backgroundColor: "#1f2937", // match bg-gray-800
                        color: "white",
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: "#2563eb", // match bg-[#024a72]
                        color: "white",
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: "white",
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isFocused
                          ? "#2563eb"
                          : "#1f2937",
                        color: "white",
                        cursor: "pointer",
                      }),
                    }}
                  />
                </div>

                {/* Equipment Filter */}
                <div className="mb-4">
                  <Select
                    closeMenuOnSelect={false}
                    components={animatedComponents}
                    isMulti
                    options={[...new Set(allWorkouts.map((w) => w.equipment))]
                      .filter(Boolean)
                      .map((equipment) => ({
                        value: equipment,
                        label: equipment,
                      }))}
                    value={filterEquipments}
                    onChange={setFilterEquipments}
                    placeholder="Select Equipment"
                    className="text-black"
                    styles={{
                      control: (base) => ({
                        ...base,
                        backgroundColor: "#1f2937",
                        color: "white",
                      }),
                      menu: (base) => ({
                        ...base,
                        backgroundColor: "#1f2937",
                        color: "white",
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: "#2563eb",
                        color: "white",
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: "white",
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isFocused
                          ? "#2563eb"
                          : "#1f2937",
                        color: "white",
                        cursor: "pointer",
                      }),
                    }}
                  />
                </div>

                {/* Target Muscle Filter */}
                <div className="mb-4">
                  <Select
                    closeMenuOnSelect={false}
                    components={animatedComponents}
                    isMulti
                    options={[...new Set(allWorkouts.map((w) => w.target))]
                      .filter(Boolean)
                      .map((target) => ({ value: target, label: target }))}
                    value={filterTargets}
                    onChange={setFilterTargets}
                    placeholder="Select Targets"
                    className="text-black"
                    styles={{
                      control: (base) => ({
                        ...base,
                        backgroundColor: "#1f2937",
                        color: "white",
                      }),
                      menu: (base) => ({
                        ...base,
                        backgroundColor: "#1f2937",
                        color: "white",
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: "#2563eb",
                        color: "white",
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: "white",
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isFocused
                          ? "#2563eb"
                          : "#1f2937",
                        color: "white",
                        cursor: "pointer",
                      }),
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto overflow-x-hidden">
                {allWorkouts
                  .filter((workout) => {
                    const matchesName = workout.name
                      .toLowerCase()
                      .includes(workoutSearchTerm.toLowerCase());
                    const matchesBodyPart =
                      filterBodyParts.length === 0 ||
                      filterBodyParts.some(
                        (item) => item.value === workout.bodyPart
                      );
                    const matchesEquipment =
                      filterEquipments.length === 0 ||
                      filterEquipments.some(
                        (item) => item.value === workout.equipment
                      );
                    const matchesTarget =
                      filterTargets.length === 0 ||
                      filterTargets.some(
                        (item) => item.value === workout.target
                      );
                    return (
                      matchesName &&
                      matchesBodyPart &&
                      matchesEquipment &&
                      matchesTarget
                    );
                  })
                  .map((workout) => (
                    <div
                      key={workout.id}
                      id={`workout-item-${workout.id}`}
                      ref={
                        workout.id === lastToggledWorkoutId
                          ? lastToggledWorkoutRef
                          : null
                      }
                      className={`cursor-pointer border rounded-lg p-1 flex flex-col items-center ${
                        selectedWorkoutIds.has(workout.id)
                          ? "border-blue-500 bg-blue-900"
                          : "border-gray-700"
                      }`}
                      onClick={() => toggleWorkoutSelection(workout.id)}
                    >
                      <LazyModalWorkoutImage
                        src={workout.gifUrl}
                        alt={workout.name}
                      />
                      <p className="mt-10 text-center text-white">
                        {workout.name.charAt(0).toUpperCase() +
                          workout.name.slice(1)}
                      </p>
                    </div>
                  ))}
              </div>
              <div className="flex justify-end mt-6 gap-2">
                <button
                  className="bg-gray-800 text-white py-3 px-6 rounded-lg text-lg font-bold"
                  onClick={() => setShowWorkoutSelectionModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="bg-green-600 text-white py-3 px-6 rounded-lg text-lg font-bold"
                  onClick={addSelectedWorkoutsToPlan}
                  disabled={selectedWorkoutIds.size === 0}
                >
                  Add Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col px-4 py-8 text-left">
      {/* Header with back button and title */}
      <div className="flex justify-between items-center mb-6">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={18} />
        </button>
        <h1 className="text-md font-bold">
          {isEditing ? "Edit Workout Plan" : "Create Workout Plan"}
        </h1>
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

      {/* Main content area - desktop layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sidebar - Template name and day selection */}
        <div className="lg:w-1/4">
          {/* Template Name Input */}
          <div className="mb-6 bg-[#1C2937] p-4 rounded-lg">
            <label className="block text-gray-400 text-sm mb-2 ml-2">
              Template Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter a name for this workout plan"
              className="bg-black text-white p-3 rounded w-full"
              required
            />
          </div>

          {/* Workout stats summary for the day - hidden on mobile */}
          <div className="hidden lg:block bg-[#1C2937] rounded-lg p-4 mb-4">
            <h2 className="text-lg font-bold mb-3">
              {activeDay.charAt(0).toUpperCase() + activeDay.slice(1)} Stats
            </h2>

            <div className="space-y-3">
              <div className="bg-[#123347] p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Exercises</span>
                  <span className="font-bold">
                    {weeklyPlan[activeDay]?.exercises?.length || 0}
                  </span>
                </div>
              </div>

              {/* Body parts summary */}
              <div className="bg-[#123347] p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Body Parts</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.from(
                    new Set(
                      weeklyPlan[activeDay]?.exercises?.map(
                        (exercise) => exercise.bodyPart
                      ) || []
                    )
                  ).map((bodyPart, index) => (
                    <span
                      key={index}
                      className="bg-[#024a72] text-xs px-2 py-1 rounded"
                    >
                      {bodyPart}
                    </span>
                  ))}
                  {(weeklyPlan[activeDay]?.exercises?.length || 0) === 0 && (
                    <span className="text-gray-500 text-xs">
                      No exercises added
                    </span>
                  )}
                </div>
              </div>

              {/* Equipment summary */}
              <div className="bg-[#123347] p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Equipment</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.from(
                    new Set(
                      weeklyPlan[activeDay]?.exercises?.map(
                        (exercise) => exercise.equipment
                      ) || []
                    )
                  ).map((equipment, index) => (
                    <span
                      key={index}
                      className="bg-[#036ba2] text-xs px-2 py-1 rounded"
                    >
                      {equipment}
                    </span>
                  ))}
                  {(weeklyPlan[activeDay]?.exercises?.length || 0) === 0 && (
                    <span className="text-gray-500 text-xs">
                      No equipment needed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="mt-4">
            <button
              className="bg-[#024a72] text-white py-3 px-4 rounded-lg w-full flex items-center justify-center"
              onClick={saveWeeklyWorkoutPlan}
              disabled={loading}
            >
              <FaSave className="mr-2" />
              {loading ? "Saving..." : isEditing ? "Update Plan" : "Save Plan"}
            </button>
          </div>
        </div>

        {/* Right content area - Workouts */}
        <div className="lg:w-3/4">
          {/* Workout list for the active day */}
          <div className="flex-1 mb-4">
            <div className="bg-[#1C2937] rounded-lg p-4">
              {/* Day selection tabs - horizontal tabs */}
              <div className="mb-4">
                <div className="flex overflow-x-auto space-x-2 pb-2">
                  {days.map((day) => (
                    <button
                      key={day}
                      className={`px-4 py-3 rounded-lg whitespace-nowrap day-tab ${
                        activeDay === day ? "active" : ""
                      }`}
                      onClick={() => handleDaySelect(day)}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center justify-between mb-4">
                <h2 className="text-md font-bold">
                  {activeDay.charAt(0).toUpperCase() + activeDay.slice(1)}{" "}
                  Workouts
                </h2>
                <div
                  className="bg-[#036ba2] text-white py-2 px-4 rounded-lg flex items-center"
                  onClick={() => setShowWorkoutSelectionModal(true)}
                >
                  <FaPlus className="mr-2" /> Add Workouts
                </div>
              </div>

              {/* Workout plan for the selected day */}
              <div className="flex-1">
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-xl">Loading...</p>
                  </div>
                ) : (
                  <WorkoutPlanAdapter />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats summary on mobile */}
        <div className="block lg:hidden bg-[#1C2937] rounded-lg p-4 mb-4">
          <div className="space-y-3">
            <div className="bg-[#123347] p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Exercises</span>
                <span className="font-bold">
                  {weeklyPlan[activeDay]?.exercises?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyWorkoutPlanner;
