import React, { useState, useEffect } from "react";
import {
  FaArrowLeft,
  FaSearch,
  FaFire,
  FaSave,
  FaUtensils,
  FaTrash,
  FaPlus,
} from "react-icons/fa";
import axios from "axios";
import { API_URL } from "../../config";
import "./WeeklyDietPlanner.css";
import Select from "react-select";

// Helper function to capitalize first letter of a string
const capitalizeFirstLetter = (string) => {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const WeeklyDietPlanner = ({ onBackClick, planId }) => {
  const [activeDay, setActiveDay] = useState("monday");
  const [weeklyPlan, setWeeklyPlan] = useState({
    monday: { meals: [] },
    tuesday: { meals: [] },
    wednesday: { meals: [] },
    thursday: { meals: [] },
    friday: { meals: [] },
    saturday: { meals: [] },
    sunday: { meals: [] },
  });
  const [templateName, setTemplateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  const [isEditing, setIsEditing] = useState(false);

  // Default popular South Indian dishes to show before search
  const popularSouthIndianFoods = [
    {
      id: "default-1",
      name: "Idli Sambar",
      calories: 192,
      carbs: 38,
      fats: 1,
      proteins: 6,
      fibre: 4,
      serving_qty: 1,
      serving_unit: "cup",
      serving_weight_grams: 240,
      mealType: "breakfast",
    },
    {
      id: "default-2",
      name: "Masala Dosa",
      calories: 250,
      carbs: 40,
      fats: 8,
      proteins: 5,
      fibre: 3,
      serving_qty: 1,
      serving_unit: "medium",
      serving_weight_grams: 150,
      mealType: "breakfast",
    },
    {
      id: "default-3",
      name: "Chicken Biryani",
      calories: 400,
      carbs: 45,
      fats: 15,
      proteins: 25,
      fibre: 2,
      serving_qty: 1,
      serving_unit: "plate",
      serving_weight_grams: 300,
      mealType: "lunch",
    },
    {
      id: "default-4",
      name: "Vegetable Curry",
      calories: 180,
      carbs: 20,
      fats: 8,
      proteins: 5,
      fibre: 6,
      serving_qty: 1,
      serving_unit: "bowl",
      serving_weight_grams: 200,
      mealType: "dinner",
    },
    {
      id: "default-5",
      name: "Chapati",
      calories: 120,
      carbs: 20,
      fats: 3,
      proteins: 4,
      fibre: 2,
      serving_qty: 1,
      serving_unit: "piece",
      serving_weight_grams: 40,
      mealType: "dinner",
    },
    {
      id: "default-6",
      name: "Curd Rice",
      calories: 180,
      carbs: 30,
      fats: 4,
      proteins: 6,
      fibre: 1,
      serving_qty: 1,
      serving_unit: "bowl",
      serving_weight_grams: 200,
      mealType: "lunch",
    },
    {
      id: "default-7",
      name: "Sambar",
      calories: 150,
      carbs: 20,
      fats: 5,
      proteins: 8,
      fibre: 5,
      serving_qty: 1,
      serving_unit: "cup",
      serving_weight_grams: 200,
      mealType: "lunch",
    },
    {
      id: "default-8",
      name: "Coconut Chutney",
      calories: 120,
      carbs: 5,
      fats: 10,
      proteins: 3,
      fibre: 2,
      serving_qty: 1,
      serving_unit: "tbsp",
      serving_weight_grams: 30,
      mealType: "breakfast",
    },
    {
      id: "default-9",
      name: "Upma",
      calories: 210,
      carbs: 35,
      fats: 6,
      proteins: 5,
      fibre: 3,
      serving_qty: 1,
      serving_unit: "bowl",
      serving_weight_grams: 150,
      mealType: "breakfast",
    },
    {
      id: "default-10",
      name: "Rasam",
      calories: 90,
      carbs: 10,
      fats: 3,
      proteins: 2,
      fibre: 1,
      serving_qty: 1,
      serving_unit: "cup",
      serving_weight_grams: 150,
      mealType: "dinner",
    },
  ];

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const mealTypes = ["breakfast", "lunch", "dinner"];

  // Handle day selection
  const handleDaySelect = (day) => {
    setActiveDay(day);
  };

  // Function to fetch weekly diet plan
  const fetchWeeklyDietPlan = async () => {
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
            `${API_URL}/api/weekly-diet-plans/${planId}`,
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
        const response = await axios.get(`${API_URL}/api/weekly-diet-plans`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (response.data && response.data.weeklyPlan) {
          setWeeklyPlan(response.data.weeklyPlan);
        }
      }
    } catch (error) {
      console.error("Error fetching weekly diet plan:", error);
      setStatusMessage({
        text: "Failed to load weekly diet plan. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to save weekly diet plan
  const saveWeeklyDietPlan = async () => {
    try {
      if (!templateName.trim()) {
        setStatusMessage({
          text: "Please enter a template name for your diet plan",
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
          `${API_URL}/api/weekly-diet-plans/${planId}`,
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
          `${API_URL}/api/weekly-diet-plans`,
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
            ? "Weekly diet plan updated successfully!"
            : "Weekly diet plan saved successfully!",
          type: "success",
        });

        // Show success message briefly before navigating back
        setTimeout(() => {
          // Navigate back to the AllWeeklyDietPlans page
          onBackClick();
        }, 1500);
      }
    } catch (error) {
      console.error("Error saving weekly diet plan:", error);
      setStatusMessage({
        text: "Failed to save weekly diet plan. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load weekly plan on component mount
  useEffect(() => {
    fetchWeeklyDietPlan();
  }, []);

  // Function to update meals for the active day
  const updateDayMeals = (meals) => {
    setWeeklyPlan((prevPlan) => ({
      ...prevPlan,
      [activeDay]: { meals },
    }));
  };

  // State for meal selection modal
  const [showMealSelectionModal, setShowMealSelectionModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState("breakfast");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Function to search for foods using Nutritionix API
  const searchFoods = async (query) => {
    if (!query || query.trim() === "") {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await axios.post(
        "https://trackapi.nutritionix.com/v2/natural/nutrients",
        { query: query },
        {
          headers: {
            "Content-Type": "application/json",
            "x-app-id": "c5eb3c81",
            "x-app-key": "c5953fe9c49dee0ae53f3597bf9d832c",
          },
        }
      );

      if (response.data && response.data.foods) {
        // Transform the API response to match our food item structure
        const foods = response.data.foods.map((food, index) => ({
          id: `api-${index}-${Date.now()}`,
          name: capitalizeFirstLetter(food.food_name),
          calories: Math.round(food.nf_calories),
          carbs: Math.round(food.nf_total_carbohydrate),
          fats: Math.round(food.nf_total_fat),
          proteins: Math.round(food.nf_protein),
          fibre: Math.round(food.nf_dietary_fiber || 0),
          serving_qty: food.serving_qty || 1,
          serving_unit: food.serving_unit || "g",
          serving_weight_grams: food.serving_weight_grams || 0,
          mealType: selectedMealType,
        }));

        setSearchResults(foods);
      }
    } catch (error) {
      console.error("Error searching for foods:", error);
      // If API fails, show a message and fall back to default foods
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        searchFoods(searchQuery);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Function to add a meal to the active day
  const addMealToDay = (meal) => {
    const currentMeals = weeklyPlan[activeDay]?.meals || [];

    // Add the meal with quantity and calculated totals
    const mealWithQuantity = {
      ...meal,
      quantity: 1,
      totalCalories: meal.calories,
      totalCarbs: meal.carbs,
      totalFats: meal.fats,
      totalProteins: meal.proteins,
      totalFibre: meal.fibre,
    };

    updateDayMeals([...currentMeals, mealWithQuantity]);
    setShowMealSelectionModal(false);
  };

  // Function to update meal quantity
  const updateMealQuantity = (mealIndex, newQuantity) => {
    if (newQuantity < 1) return; // Don't allow quantity less than 1

    const currentMeals = [...(weeklyPlan[activeDay]?.meals || [])];
    const meal = currentMeals[mealIndex];

    // Update the meal with new quantity and recalculated totals
    currentMeals[mealIndex] = {
      ...meal,
      quantity: newQuantity,
      totalCalories: meal.calories * newQuantity,
      totalCarbs: meal.carbs * newQuantity,
      totalFats: meal.fats * newQuantity,
      totalProteins: meal.proteins * newQuantity,
      totalFibre: meal.fibre * newQuantity,
    };

    updateDayMeals(currentMeals);
  };

  // Function to remove a meal
  const removeMeal = (mealIndex) => {
    const currentMeals = [...(weeklyPlan[activeDay]?.meals || [])];
    currentMeals.splice(mealIndex, 1);
    updateDayMeals(currentMeals);
  };

  // Get meals to display - either search results or popular foods
  const mealsToDisplay =
    searchQuery && searchResults.length > 0
      ? searchResults
      : popularSouthIndianFoods.filter(
          (food) => food.mealType === selectedMealType
        );

  // Calculate nutrition totals for the active day
  const calculateDayTotals = () => {
    const meals = weeklyPlan[activeDay]?.meals || [];
    return meals.reduce(
      (totals, meal) => {
        return {
          calories: totals.calories + (meal.totalCalories || meal.calories),
          carbs: totals.carbs + (meal.totalCarbs || meal.carbs),
          proteins: totals.proteins + (meal.totalProteins || meal.proteins),
          fats: totals.fats + (meal.totalFats || meal.fats),
          fibre: totals.fibre + (meal.totalFibre || meal.fibre),
        };
      },
      { calories: 0, carbs: 0, proteins: 0, fats: 0, fibre: 0 }
    );
  };

  const dayTotals = calculateDayTotals();

  return (
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col px-4 py-8 text-left">
      {/* Header with back button and title */}
      <div className="flex justify-between items-center mb-6">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold">
          {isEditing ? "Edit Diet Plan" : "Create Diet Plan"}
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
              placeholder="Enter a name for this diet plan"
              className="bg-black text-white p-3 rounded w-full"
              required
            />
          </div>

          {/* Removed day tabs from here - moved to above meals card */}

          {/* Nutrition summary for the day - hidden on mobile */}
          <div className="hidden lg:block bg-[#1C2937] rounded-lg p-4 mb-4">
            <h2 className="text-lg font-bold mb-3">
              {activeDay.charAt(0).toUpperCase() + activeDay.slice(1)} Nutrition
            </h2>

            <div className="space-y-3">
              <div className="bg-[#123347] p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Calories</span>
                  <span className="font-bold">{dayTotals.calories} kcal</span>
                </div>
                <div className="w-full bg-gray-700 h-2 mt-1 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (dayTotals.calories / 2500) * 100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="bg-[#123347] p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Proteins</span>
                  <span className="font-bold">{dayTotals.proteins} g</span>
                </div>
                <div className="w-full bg-gray-700 h-2 mt-1 rounded-full overflow-hidden">
                  <div
                    className="bg-green-500 h-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (dayTotals.proteins / 150) * 100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="bg-[#123347] p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Carbs</span>
                  <span className="font-bold">{dayTotals.carbs} g</span>
                </div>
                <div className="w-full bg-gray-700 h-2 mt-1 rounded-full overflow-hidden">
                  <div
                    className="bg-yellow-500 h-full"
                    style={{
                      width: `${Math.min(100, (dayTotals.carbs / 300) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="bg-[#123347] p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Fats</span>
                  <span className="font-bold">{dayTotals.fats} g</span>
                </div>
                <div className="w-full bg-gray-700 h-2 mt-1 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{
                      width: `${Math.min(100, (dayTotals.fats / 80) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="bg-[#123347] p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Fibre</span>
                  <span className="font-bold">{dayTotals.fibre} g</span>
                </div>
                <div className="w-full bg-gray-700 h-2 mt-1 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full"
                    style={{
                      width: `${Math.min(100, (dayTotals.fibre / 30) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="mt-4">
            <button
              className="bg-[#024a72] text-white py-3 px-4 rounded-lg w-full flex items-center justify-center"
              onClick={saveWeeklyDietPlan}
              disabled={loading}
            >
              <FaSave className="mr-2" />
              {loading ? "Saving..." : isEditing ? "Update Plan" : "Save Plan"}
            </button>
          </div>
        </div>

        {/* Right content area - Meals */}
        <div className="lg:w-3/4">
          {/* Meal list for the active day */}
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

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {activeDay.charAt(0).toUpperCase() + activeDay.slice(1)} Meals
                </h2>
                <button
                  className="bg-[#036ba2] text-white py-2 px-4 rounded-lg flex items-center"
                  onClick={() => setShowMealSelectionModal(true)}
                >
                  <FaPlus className="mr-2" /> Add Meals
                </button>
              </div>

              {weeklyPlan[activeDay]?.meals?.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-[#123347] rounded-lg">
                  <FaUtensils size={40} className="mx-auto mb-4 opacity-30" />
                  <p className="text-xl">No meals added for {activeDay}.</p>
                  <p className="mt-2">
                    Click "Add Meals" to start building your diet plan.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weeklyPlan[activeDay]?.meals?.map((meal, index) => (
                    <div
                      key={index}
                      className="bg-[#123347] p-4 rounded-lg meal-item relative"
                    >
                      <div className="absolute top-2 right-2">
                        <button
                          className="text-red-500 hover:text-red-400 bg-[#024a72] rounded-full p-2"
                          onClick={() => removeMeal(index)}
                          title="Remove meal"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>

                      <div className="mb-3 pt-2">
                        <span className="bg-[#024a72] px-2 py-1 rounded text-xs">
                          {capitalizeFirstLetter(meal.mealType)}
                        </span>
                      </div>

                      <h3 className="font-semibold text-left text-lg mb-2 pr-6">
                        {capitalizeFirstLetter(meal.name)}
                      </h3>

                      <div className="text-gray-400 text-sm mb-3">
                        <p>
                          {meal.totalCalories || meal.calories} kcal |{" "}
                          {meal.quantity} {meal.serving_unit}
                          {meal.serving_weight_grams
                            ? ` (${meal.serving_weight_grams}g)`
                            : ""}
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="text-xs">
                          <span className="text-gray-400">Carbs</span>
                          <p className="font-medium">
                            {meal.totalCarbs || meal.carbs}g
                          </p>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-400">Fats</span>
                          <p className="font-medium">
                            {meal.totalFats || meal.fats}g
                          </p>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-400">Proteins</span>
                          <p className="font-medium">
                            {meal.totalProteins || meal.proteins}g
                          </p>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-400">Fibre</span>
                          <p className="font-medium">
                            {meal.totalFibre || meal.fibre}g
                          </p>
                        </div>
                      </div>

                      <div className="quantity-control">
                        <button
                          onClick={() =>
                            updateMealQuantity(index, meal.quantity - 1)
                          }
                        >
                          -
                        </button>
                        <span>{meal.quantity}</span>
                        <button
                          onClick={() =>
                            updateMealQuantity(index, meal.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Calories summary on mobile */}
        <div className="block lg:hidden bg-[#1C2937] rounded-lg p-4 mb-4">
          <div className="space-y-3">
            <div className="bg-[#123347] p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Calories</span>
                <span className="font-bold">{dayTotals.calories} kcal</span>
              </div>
              <div className="w-full bg-gray-700 h-2 mt-1 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full"
                  style={{
                    width: `${Math.min(
                      100,
                      (dayTotals.calories / 2500) * 100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meal Selection Modal - Enhanced for desktop */}
      {showMealSelectionModal && (
        <div className="fixed inset-0 bg-[#0a1f2e] bg-opacity-80 flex items-center justify-center z-50 modal-overlay">
          <div className="bg-[#1C2937] p-6 rounded-lg w-full max-w-5xl modal-content">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Select Meals</h2>
              <button
                className="text-gray-400 hover:text-white"
                onClick={() => setShowMealSelectionModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Meal Type Selection - Horizontal tabs */}
            <div className="flex mb-6">
              {mealTypes.map((type) => (
                <button
                  key={type}
                  className={`px-6 py-3 rounded-t-lg whitespace-nowrap day-tab ${
                    selectedMealType === type ? "active" : ""
                  }`}
                  onClick={() => setSelectedMealType(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="mb-6 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search foods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-4 pl-10 rounded bg-[#0a1f2e] text-white text-lg"
              />
            </div>

            {/* Loading indicator */}
            {isSearching && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}

            {/* Food list - Grid layout for desktop */}
            {!isSearching && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2">
                {mealsToDisplay.map((meal) => (
                  <div
                    key={meal.id}
                    className="cursor-pointer hover:bg-[#1e293b] p-4 rounded-lg search-result-item border border-[#2d3748]"
                    onClick={() => addMealToDay(meal)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-lg font-medium mb-1">
                          {capitalizeFirstLetter(meal.name)}
                        </p>
                        <p className="text-sm text-gray-400 mb-2">
                          {meal.calories} kcal | {meal.serving_qty}{" "}
                          {meal.serving_unit}
                          {meal.serving_weight_grams
                            ? ` (${meal.serving_weight_grams}g)`
                            : ""}
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                          <div>
                            <span className="text-gray-400">Carbs:</span>{" "}
                            {meal.carbs}g
                          </div>
                          <div>
                            <span className="text-gray-400">Fats:</span>{" "}
                            {meal.fats}g
                          </div>
                          <div>
                            <span className="text-gray-400">Proteins:</span>{" "}
                            {meal.proteins}g
                          </div>
                          <div>
                            <span className="text-gray-400">Fibre:</span>{" "}
                            {meal.fibre}g
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="nutrition-badge calories">
                            {meal.calories} kcal
                          </span>
                          <span className="nutrition-badge protein">
                            {meal.proteins}g P
                          </span>
                          <span className="nutrition-badge carbs">
                            {meal.carbs}g C
                          </span>
                          <span className="nutrition-badge fats">
                            {meal.fats}g F
                          </span>
                        </div>
                      </div>
                      <div className="bg-[#024a72] p-2 rounded-full">
                        <FaPlus className="text-white" />
                      </div>
                    </div>
                  </div>
                ))}

                {mealsToDisplay.length === 0 && (
                  <div className="text-center py-8 text-gray-400 col-span-3">
                    <p className="text-xl mb-2">No foods found</p>
                    <p>
                      Try a different search term or select another meal type
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Modal buttons */}
            <div className="flex justify-end mt-6 gap-4">
              <button
                className="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg text-lg font-medium"
                onClick={() => setShowMealSelectionModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyDietPlanner;
