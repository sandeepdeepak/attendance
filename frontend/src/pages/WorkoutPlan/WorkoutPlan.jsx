import React, { useState, useEffect, useRef, useCallback } from "react";

const cachedGifUrls = new Set();

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
import { FaArrowLeft, FaTrash } from "react-icons/fa";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import axios from "axios";
import "./WorkoutPlan.css";
import { API_URL } from "../../config";
import { allWorkouts } from "./all-workouts";

const loadedGifCache = new Set();

const LazyWorkoutItem = ({ workout, isSelected, onClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCached, setIsCached] = useState(loadedGifCache.has(workout.gifUrl));
  const ref = useRef();

  const observerCallback = useCallback(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          console.log(`LazyWorkoutItem visible: ${workout.name}`);
          setIsVisible(true);
        }
      });
    },
    [workout.name]
  );

  useEffect(() => {
    if (isCached) return; // no need to observe if cached

    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: "-100px",
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
  }, [observerCallback, isCached]);

  const handleImageLoad = () => {
    loadedGifCache.add(workout.gifUrl);
    setIsCached(true);
  };

  return (
    <div
      ref={ref}
      className={`cursor-pointer border rounded-lg p-1 flex flex-col items-center ${
        isSelected ? "border-blue-500 bg-blue-900" : "border-gray-700"
      }`}
      onClick={onClick}
    >
      {isVisible || isCached ? (
        <>
          <img
            src={workout.gifUrl}
            alt={workout.name}
            className="w-full h-34 object-contain rounded"
            loading="lazy"
            onLoad={handleImageLoad}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "https://gym-meals-and-workout-planner.s3.us-east-2.amazonaws.com/assets/gym-workouts/0.gif";
            }}
          />
          {/* <p className="mt-2 text-center text-white">{workout.name}</p> */}
        </>
      ) : (
        <div style={{ height: "96px", width: "100%" }}></div>
      )}
    </div>
  );
};

const WorkoutPlan = ({
  memberId,
  selectedDate,
  onBackClick,
  hideHeader = false,
}) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workoutPlan, setWorkoutPlan] = useState({
    exercises: [],
  });

  // Ensure exercises have setCount and repsCount initialized
  useEffect(() => {
    setWorkoutPlan((prevPlan) => {
      const updatedExercises = prevPlan.exercises.map((exercise) => ({
        ...exercise,
        setCount: exercise.setCount !== undefined ? exercise.setCount : 1,
        repsCount: exercise.repsCount !== undefined ? exercise.repsCount : 1,
      }));
      return { ...prevPlan, exercises: updatedExercises };
    });
  }, []);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" }); // type can be "success" or "error"

  // Template state variables
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  // New state for workout selection modal
  const [showWorkoutSelectionModal, setShowWorkoutSelectionModal] =
    useState(false);
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState(new Set());
  const [workoutSearchTerm, setWorkoutSearchTerm] = useState("");
  const animatedComponents = makeAnimated();

  // Convert filter states from Set to array of objects for react-select
  const [filterBodyParts, setFilterBodyParts] = useState([]);
  const [filterEquipments, setFilterEquipments] = useState([]);
  const [filterTargets, setFilterTargets] = useState([]);

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

  // Function to save workout plan to the database
  const saveWorkoutPlan = async () => {
    try {
      // Prepare exercises with setCount and repsCount defaulting to 1 if missing
      const exercisesToSave = workoutPlan.exercises.map((exercise) => ({
        ...exercise,
        setCount: exercise.setCount !== undefined ? exercise.setCount : 1,
        repsCount: exercise.repsCount !== undefined ? exercise.repsCount : 1,
      }));

      await axios.post(`${API_URL}/api/workout-plans`, {
        memberId,
        date: selectedDate,
        exercises: exercisesToSave,
      });
    } catch (error) {
      console.error("Error saving workout plan:", error);
      // We don't show an error to the user here to avoid disrupting the UX
      // The plan will be saved on the next change
    }
  };

  // Function to fetch workout templates
  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await axios.get(`${API_URL}/api/workout-templates`);
      if (response.data && response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error("Error fetching workout templates:", error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Function to apply a template to the current workout plan
  const applyTemplate = (template) => {
    // Update the workout plan with template exercises
    setWorkoutPlan({
      exercises: [...template.exercises],
    });

    // Close the template modal
    setShowTemplateModal(false);
  };

  // Add useEffect to fetch templates when modal is opened (like diet plan page)
  useEffect(() => {
    if (showTemplateModal) {
      fetchTemplates();
    }
  }, [showTemplateModal]);

  // Template Selection Modal JSX similar to diet plan page
  const TemplateSelectionModal = () => {
    if (!showTemplateModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <div className="bg-gray-900 p-6 rounded-lg w-full max-w-md">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Select Workout Template
          </h2>

          {isLoadingTemplates ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : templates.length > 0 ? (
            <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="cursor-pointer hover:bg-gray-800 p-4 rounded"
                  onClick={() => {
                    applyTemplate(template);
                    setShowTemplateModal(false);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <p className="text-xl font-bold">{template.name}</p>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-400 mt-1 text-left">
                      {template.description}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2 text-xs text-gray-400">
                    <span>{template.exercises.length} exercises</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              No workout templates found. Create one by saving a workout plan.
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <button
              className="bg-gray-800 text-white py-3 rounded-lg text-lg font-bold flex-1"
              onClick={() => setShowTemplateModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Function to save the current workout plan as a template
  const saveAsTemplate = async () => {
    if (!templateName) return;

    try {
      const response = await axios.post(`${API_URL}/api/workout-templates`, {
        name: templateName,
        description: templateDescription,
        exercises: workoutPlan.exercises,
      });

      if (response.data && response.data.success) {
        setStatusMessage({
          text: "Workout template saved successfully!",
          type: "success",
        });
        setShowSaveTemplateModal(false);
        setTemplateName("");
        setTemplateDescription("");
      } else {
        setStatusMessage({
          text: "Failed to save workout template. Please try again.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error saving workout template:", error);
      setStatusMessage({
        text: "Failed to save workout template. Please try again.",
        type: "error",
      });
    }
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
        console.error("Error fetching member data:", error);
        setError("Failed to load member data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      fetchMemberDetails();
    }
  }, [memberId]);

  // New useEffect to fetch workout plan on memberId or selectedDate change
  useEffect(() => {
    const fetchWorkoutPlan = async () => {
      if (!memberId || !selectedDate) return;
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(
          `${API_URL}/api/workout-plans/${memberId}/${selectedDate}`
        );

        if (response.data && response.data.workoutPlan) {
          // Ensure setCount and repsCount are set for each exercise
          const exercisesWithCounts = response.data.workoutPlan.exercises.map(
            (exercise) => ({
              ...exercise,
              setCount: exercise.setCount !== undefined ? exercise.setCount : 1,
              repsCount:
                exercise.repsCount !== undefined ? exercise.repsCount : 1,
            })
          );
          setWorkoutPlan({
            ...response.data.workoutPlan,
            exercises: exercisesWithCounts,
          });
        } else {
          setWorkoutPlan({ exercises: [] });
        }
      } catch (error) {
        console.error("Error fetching workout plan:", error);
        setError("Failed to load workout plan. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutPlan();
  }, [memberId, selectedDate]);

  // Save workout plan whenever it changes
  useEffect(() => {
    // Don't save during initial load
    if (loading) return;

    // Debounce saving to avoid too many API calls
    const saveTimeout = setTimeout(() => {
      if (memberId && selectedDate) {
        saveWorkoutPlan();
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [workoutPlan]);

  const handleRemoveExercise = (exerciseId) => {
    setWorkoutPlan((prevPlan) => ({
      ...prevPlan,
      exercises: prevPlan.exercises.filter(
        (exercise) => exercise.id !== exerciseId
      ),
    }));
  };

  const handleUpdateExercise = (exerciseId, field, value) => {
    setWorkoutPlan((prevPlan) => ({
      ...prevPlan,
      exercises: prevPlan.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, [field]: value } : exercise
      ),
    }));
  };

  // Handle selection toggle for workout selection modal
  const toggleWorkoutSelection = (workoutId) => {
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

  // Handle adding selected workouts to the workout plan
  const addSelectedWorkoutsToPlan = () => {
    const selectedWorkouts = allWorkouts.filter((workout) =>
      selectedWorkoutIds.has(workout.id)
    );

    // Add selected workouts to current workout plan exercises
    setWorkoutPlan((prevPlan) => ({
      ...prevPlan,
      exercises: [...prevPlan.exercises, ...selectedWorkouts],
    }));

    // Clear selection and close modal
    setSelectedWorkoutIds(new Set());
    setShowWorkoutSelectionModal(false);
  };

  const handleSendWorkoutPlan = async () => {
    try {
      // Clear any previous status messages
      setStatusMessage({ text: "", type: "" });

      // Save the current workout plan
      await saveWorkoutPlan();

      // Send to WhatsApp
      if (member && member.phoneNumber) {
        try {
          const response = await axios.post(
            `${API_URL}/api/send-workout-plan-whatsapp`,
            {
              memberId,
              date: selectedDate,
              phoneNumber: member.phoneNumber,
            }
          );

          if (response.data.success) {
            setStatusMessage({
              text: "Workout plan sent successfully to WhatsApp!",
              type: "success",
            });
            // Wait 2 seconds before going back
            setTimeout(() => {
              onBackClick();
            }, 2000);
          } else {
            throw new Error("Failed to send to WhatsApp");
          }
        } catch (whatsappError) {
          console.error("Error sending to WhatsApp:", whatsappError);
          setStatusMessage({
            text: "Workout plan saved but could not be sent to WhatsApp. Please try again later.",
            type: "error",
          });
        }
      } else {
        setStatusMessage({
          text: "Workout plan saved successfully!",
          type: "success",
        });
        // Wait 2 seconds before going back
        setTimeout(() => {
          onBackClick();
        }, 2000);
      }
    } catch (error) {
      console.error("Error sending workout plan:", error);
      setStatusMessage({
        text: "Failed to save workout plan. Please try again.",
        type: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
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
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
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
    <div
      className={`${
        hideHeader
          ? ""
          : "min-h-screen bg-black text-white flex flex-col px-4 py-8 gap-6"
      }`}
    >
      {/* Header with back button and member name - only show if hideHeader is false */}
      {!hideHeader && (
        <>
          <button className="text-white p-2" onClick={onBackClick}>
            <FaArrowLeft size={18} />
          </button>
          <div className="flex items-start space-x-2">
            <div className="items-center w-full">
              <div className="text-xl font-bold flex-grow">
                {member.fullName}
              </div>

              <div className="text-center mb-4">
                <h2 className="text-xl text-gray-400">
                  {formatDate(selectedDate)}
                </h2>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Template Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          className="bg-[#4d3a1f] py-3 px-4 rounded-lg flex-1 flex items-center justify-center"
          onClick={() => {
            setShowTemplateModal(true);
            fetchTemplates();
          }}
        >
          <span className="text-[#e6a84b]">Load Template</span>
        </button>
        <button
          className="bg-[#2a7d4f] py-3 px-4 rounded-lg flex-1 flex items-center justify-center"
          onClick={() => setShowSaveTemplateModal(true)}
          disabled={!workoutPlan.exercises.length}
        >
          <span className="text-[#e8e8e8]">Save Template</span>
        </button>
      </div>

      {/* Add Workouts Button */}
      <div className="mb-6">
        <button
          className="bg-[#036BA2] text-white py-3 px-4 rounded-lg w-full"
          onClick={() => setShowWorkoutSelectionModal(true)}
        >
          Add Workouts
        </button>
      </div>

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-3xl font-bold mb-6 text-center">
              Save Template
            </h2>

            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="bg-gray-800 text-white p-3 rounded-lg w-full"
                placeholder="Enter template name"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                className="bg-gray-800 text-white p-3 rounded-lg w-full h-24 resize-none"
                placeholder="Enter description"
              />
            </div>

            <div className="flex gap-2">
              <button
                className="bg-gray-800 text-white py-3 rounded-lg text-lg font-bold flex-1"
                onClick={() => setShowSaveTemplateModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-[#024a72] text-white py-3 rounded-lg text-lg font-bold flex-1"
                onClick={saveAsTemplate}
                disabled={!templateName}
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Plan */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Workout Plan</h2>
        </div>

        {workoutPlan.exercises.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No exercises available.
          </div>
        ) : (
          <div className="space-y-4">
            {workoutPlan.exercises.map((exercise) => (
              <div key={exercise.id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-semibold">{exercise.name}</h3>
                  <button
                    className="text-red-500"
                    onClick={() => handleRemoveExercise(exercise.id)}
                  >
                    <FaTrash size={16} />
                  </button>
                </div>

                <div className="flex mb-2">
                  <div className="w-3/4 mr-2">
                    <LazyWorkoutItem
                      workout={exercise}
                      isSelected={false}
                      onClick={() => {}}
                    />
                  </div>
                  <div className="w-3/4">
                    <div className="grid grid-cols-1 gap-2 mb-2">
                      <div>
                        <label className="block text-gray-400 text-sm">
                          Sets
                        </label>
                        <input
                          type="number"
                          value={exercise.setCount}
                          onChange={(e) =>
                            handleUpdateExercise(
                              exercise.id,
                              "setCount",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="bg-gray-700 text-white p-2 rounded w-full"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm">
                          Reps
                        </label>
                        <input
                          type="number"
                          value={exercise.repsCount}
                          onChange={(e) =>
                            handleUpdateExercise(
                              exercise.id,
                              "repsCount",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="bg-gray-700 text-white p-2 rounded w-full"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status message */}
      {statusMessage.text && (
        <div
          className={`mb-2 mt-4 p-4 rounded-lg text-center ${
            statusMessage.type === "success"
              ? "bg-green-800 text-white"
              : "bg-red-800 text-white"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Send button */}
      <button
        className="bg-white text-black py-4 rounded-lg text-xl font-bold"
        onClick={handleSendWorkoutPlan}
        disabled={workoutPlan.exercises.length === 0}
      >
        Send Workout Plan
      </button>

      {/* Workout Selection Modal */}
      {showWorkoutSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-3xl">
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
                    .map((bodyPart) => ({ value: bodyPart, label: bodyPart }))}
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
                      backgroundColor: state.isFocused ? "#2563eb" : "#1f2937",
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
                      backgroundColor: state.isFocused ? "#2563eb" : "#1f2937",
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
                      backgroundColor: state.isFocused ? "#2563eb" : "#1f2937",
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
                    filterTargets.some((item) => item.value === workout.target);
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
                      {workout.name}
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
      {/* Template Selection Modal */}
      <TemplateSelectionModal />
    </div>
  );
};

export default WorkoutPlan;
