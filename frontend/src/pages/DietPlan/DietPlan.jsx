import React, { useState, useEffect } from "react";

// Helper function to capitalize first letter of a string
const capitalizeFirstLetter = (string) => {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
};
import {
  FaArrowLeft,
  FaSearch,
  FaFire,
  FaSave,
  FaList,
  FaTrash,
  FaMagic,
} from "react-icons/fa";
import axios from "axios";
import "./DietPlan.css";
import { API_URL } from "../../config";

const DietPlan = ({
  memberId,
  selectedDate,
  onBackClick,
  hideHeader = false,
  fromFaceRecognition = false,
}) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dietPlan, setDietPlan] = useState({
    breakfast: [],
    lunch: [],
    dinner: [],
  });
  const [nutritionTotals, setNutritionTotals] = useState({
    calories: 0,
    carbs: 0,
    fats: 0,
    proteins: 0,
    fibre: 0,
    serving_qty: 0,
  });
  const [showFoodSelector, setShowFoodSelector] = useState(false);
  const [currentMealType, setCurrentMealType] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" }); // type can be "success" or "error"
  const [calorieGoal, setCalorieGoal] = useState("loss"); // Default to weight loss
  const [calculatedCalories, setCalculatedCalories] = useState(null);
  const [isLoadingCalories, setIsLoadingCalories] = useState(false);
  const [recommendedNutrition, setRecommendedNutrition] = useState({
    proteins: 0,
    carbs: 0,
    fats: 0,
    fibre: 0,
  });

  // Template state variables
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  // Meal plan generation state variables
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preferences, setPreferences] = useState({
    dietType: "",
    cuisine: "",
    nonVegType: "",
    mealStyle: "",
    avoidFoods: "",
  });

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
    },
    {
      id: "default-3",
      name: "Plain Dosa",
      calories: 170,
      carbs: 30,
      fats: 5,
      proteins: 3,
      fibre: 2,
      serving_qty: 1,
      serving_unit: "medium",
      serving_weight_grams: 120,
    },
    {
      id: "default-4",
      name: "Uttapam",
      calories: 210,
      carbs: 35,
      fats: 6,
      proteins: 5,
      fibre: 3,
      serving_qty: 1,
      serving_unit: "medium",
      serving_weight_grams: 130,
    },
    {
      id: "default-5",
      name: "Medu Vada",
      calories: 180,
      carbs: 20,
      fats: 10,
      proteins: 5,
      fibre: 3,
      serving_qty: 1,
      serving_unit: "piece",
      serving_weight_grams: 40,
    },
  ];

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

  // Function to save diet plan to the database
  const saveDietPlan = async () => {
    try {
      let config = {};
      let endpoint = `${API_URL}/api/diet-plans`;

      // If coming from face recognition, use public endpoint
      if (fromFaceRecognition) {
        endpoint = `${API_URL}/api/diet-plans/public`;
      } else {
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

      await axios.post(
        endpoint,
        {
          memberId,
          date: selectedDate,
          breakfast: dietPlan.breakfast,
          lunch: dietPlan.lunch,
          dinner: dietPlan.dinner,
          nutritionTotals,
        },
        config
      );
    } catch (error) {
      console.error("Error saving diet plan:", error);
      // We don't show an error to the user here to avoid disrupting the UX
      // The plan will be saved on the next change
    }
  };

  // Function to fetch meal templates
  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
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

      const response = await axios.get(`${API_URL}/api/meal-templates`, config);
      if (response.data && response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error("Error fetching meal templates:", error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Function to apply a template to the current diet plan
  const applyTemplate = (template) => {
    // Update the diet plan with template meals
    setDietPlan({
      breakfast: [...template.breakfast],
      lunch: [...template.lunch],
      dinner: [...template.dinner],
    });

    // Update nutrition totals
    setNutritionTotals(template.nutritionTotals);

    // Close the template modal
    setShowTemplateModal(false);
  };

  // Function to save the current diet plan as a template
  const saveAsTemplate = async () => {
    if (!templateName) return;

    try {
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

      const response = await axios.post(
        `${API_URL}/api/meal-templates`,
        {
          name: templateName,
          description: templateDescription,
          breakfast: dietPlan.breakfast,
          lunch: dietPlan.lunch,
          dinner: dietPlan.dinner,
          nutritionTotals,
        },
        config
      );

      if (response.data && response.data.success) {
        setStatusMessage({
          text: "Meal template saved successfully!",
          type: "success",
        });
        setShowSaveTemplateModal(false);
        setTemplateName("");
        setTemplateDescription("");
      }
    } catch (error) {
      console.error("Error saving meal template:", error);
      setStatusMessage({
        text: "Failed to save meal template. Please try again.",
        type: "error",
      });
    }
  };

  // Function to fetch calculated calories
  const fetchCalculatedCalories = async () => {
    if (!memberId) return;

    setIsLoadingCalories(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/calculate-calories/${memberId}?goal=${calorieGoal}`
      );

      if (response.data && response.data.success) {
        setCalculatedCalories(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching calculated calories:", error);
      // Don't show error to user to avoid disrupting UX
    } finally {
      setIsLoadingCalories(false);
    }
  };

  useEffect(() => {
    const fetchMemberDetailsAndDietPlan = async () => {
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

        // Determine diet plan endpoint based on source
        const dietPlanEndpoint = fromFaceRecognition
          ? `${API_URL}/api/diet-plans/${memberId}/${selectedDate}/public`
          : `${API_URL}/api/diet-plans/${memberId}/${selectedDate}`;

        // Fetch existing diet plan for this date
        const dietPlanResponse = await axios.get(dietPlanEndpoint, config);

        if (dietPlanResponse.data && dietPlanResponse.data.dietPlan) {
          const existingPlan = dietPlanResponse.data.dietPlan;
          setDietPlan({
            breakfast: existingPlan.breakfast || [],
            lunch: existingPlan.lunch || [],
            dinner: existingPlan.dinner || [],
          });

          if (existingPlan.nutritionTotals) {
            setNutritionTotals(existingPlan.nutritionTotals);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (memberId && selectedDate) {
      fetchMemberDetailsAndDietPlan();
    }
  }, [memberId, selectedDate, fromFaceRecognition]);

  // Calculate recommended nutrition values based on calories
  const calculateRecommendedNutrition = (calories) => {
    // Standard macronutrient distribution
    // Protein: 20-30% of calories (4 calories per gram)
    // Carbs: 45-65% of calories (4 calories per gram)
    // Fats: 20-35% of calories (9 calories per gram)
    // Fiber: 14g per 1000 calories

    const proteins = Math.round((calories * 0.25) / 4); // 25% of calories from protein
    const carbs = Math.round((calories * 0.5) / 4); // 50% of calories from carbs
    const fats = Math.round((calories * 0.25) / 9); // 25% of calories from fats
    const fibre = Math.round((calories / 1000) * 14); // 14g per 1000 calories

    return { proteins, carbs, fats, fibre };
  };

  // Call this when component loads and when goal changes
  useEffect(() => {
    if (member && member.height && member.weight) {
      fetchCalculatedCalories();
    }
  }, [member, calorieGoal]);

  // Update recommended nutrition values when calories change
  useEffect(() => {
    if (calculatedCalories && calculatedCalories.dailyCalories) {
      const nutrition = calculateRecommendedNutrition(
        calculatedCalories.dailyCalories
      );
      setRecommendedNutrition(nutrition);
    }
  }, [calculatedCalories]);

  // Save diet plan whenever it changes
  useEffect(() => {
    // Don't save during initial load
    if (loading) return;

    // Debounce saving to avoid too many API calls
    const saveTimeout = setTimeout(() => {
      if (memberId && selectedDate) {
        saveDietPlan();
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [dietPlan, nutritionTotals]);

  const openFoodSelector = (mealType) => {
    setCurrentMealType(mealType);
    setShowFoodSelector(true);
  };

  const closeFoodSelector = () => {
    setShowFoodSelector(false);
    setCurrentMealType(null);
    setSearchQuery("");
  };

  const addFoodToMeal = (food) => {
    console.log("Adding food:", food, "to meal:", currentMealType);
    if (!currentMealType) return;

    // Add the food to the selected meal with quantity
    const foodWithQuantity = {
      ...food,
      quantity: 1,
      totalCalories: food.calories,
      totalCarbs: food.carbs,
      totalFats: food.fats,
      totalProteins: food.proteins,
      totalFibre: food.fibre,
    };

    setDietPlan((prevPlan) => ({
      ...prevPlan,
      [currentMealType]: [...prevPlan[currentMealType], foodWithQuantity],
    }));

    // Update nutrition totals
    setNutritionTotals((prev) => ({
      calories: prev.calories + food.calories,
      carbs: prev.carbs + food.carbs,
      fats: prev.fats + food.fats,
      proteins: prev.proteins + food.proteins,
      fibre: prev.fibre + food.fibre,
      serving_qty: prev.serving_qty + food.serving_qty,
      serving_unit: prev.serving_unit + food.serving_unit,
    }));

    // Close the food selector
    closeFoodSelector();
  };

  const updateFoodQuantity = (mealType, foodId, newQuantity) => {
    if (newQuantity < 1) return; // Don't allow quantity less than 1

    setDietPlan((prevPlan) => {
      const updatedMeal = prevPlan[mealType].map((food) => {
        if (food.id === foodId) {
          // Calculate the difference in nutritional values
          const quantityDiff = newQuantity - food.quantity;
          const caloriesDiff = food.calories * quantityDiff;
          const carbsDiff = food.carbs * quantityDiff;
          const fatsDiff = food.fats * quantityDiff;
          const proteinsDiff = food.proteins * quantityDiff;
          const fibreDiff = food.fibre * quantityDiff;

          // Update nutrition totals
          setNutritionTotals((prev) => ({
            calories: prev.calories + caloriesDiff,
            carbs: prev.carbs + carbsDiff,
            fats: prev.fats + fatsDiff,
            proteins: prev.proteins + proteinsDiff,
            fibre: prev.fibre + fibreDiff,
            serving_qty: prev.serving_qty + food.serving_qty * quantityDiff,
            serving_unit: prev.serving_unit + food.serving_unit * quantityDiff,
          }));

          // Return updated food item with new quantity and totals
          return {
            ...food,
            quantity: newQuantity,
            totalCalories: food.calories * newQuantity,
            totalCarbs: food.carbs * newQuantity,
            totalFats: food.fats * newQuantity,
            totalProteins: food.proteins * newQuantity,
            totalFibre: food.fibre * newQuantity,
          };
        }
        return food;
      });

      return {
        ...prevPlan,
        [mealType]: updatedMeal,
      };
    });
  };

  // Function to handle meal plan generation
  const handleGenerateMealPlan = async () => {
    setShowPreferencesModal(false);
    setIsGenerating(true);

    try {
      let endpoint = `${API_URL}/api/generate-meal-plan`;
      let config = {};

      // If coming from face recognition, use public endpoint
      if (fromFaceRecognition) {
        endpoint = `${API_URL}/api/generate-meal-plan/public`;
      } else {
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

      const response = await axios.post(
        endpoint,
        {
          memberId,
          date: selectedDate,
          calorieGoal: calculatedCalories?.dailyCalories,
          macroTargets: recommendedNutrition,
          preferences,
        },
        config
      );

      if (response.data && response.data.success) {
        // Update the diet plan with the generated meals
        const { breakfast, lunch, dinner } = response.data.mealPlan;

        // Calculate total nutrition values
        let totalCalories = 0;
        let totalCarbs = 0;
        let totalFats = 0;
        let totalProteins = 0;
        let totalFibre = 0;

        // Sum up nutrition from all meals
        [...breakfast, ...lunch, ...dinner].forEach((food) => {
          totalCalories += food.calories;
          totalCarbs += food.carbs;
          totalFats += food.fats;
          totalProteins += food.proteins;
          totalFibre += food.fibre || 0;
        });

        // Update diet plan
        setDietPlan({
          breakfast,
          lunch,
          dinner,
        });

        // Update nutrition totals
        setNutritionTotals({
          calories: totalCalories,
          carbs: totalCarbs,
          fats: totalFats,
          proteins: totalProteins,
          fibre: totalFibre,
          serving_qty: 0,
          serving_unit: "",
        });

        setStatusMessage({
          text: "Meal plan generated successfully!",
          type: "success",
        });
      }
    } catch (error) {
      console.error("Error generating meal plan:", error);
      setStatusMessage({
        text: "Failed to generate meal plan. Please try again.",
        type: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const removeFood = (mealType, foodId) => {
    const foodToRemove = dietPlan[mealType].find((food) => food.id === foodId);

    if (foodToRemove) {
      // Remove the food from the meal
      setDietPlan((prevPlan) => {
        const updatedPlan = {
          ...prevPlan,
          [mealType]: prevPlan[mealType].filter((food) => food.id !== foodId),
        };

        // Check if this was the last food item and reset totals if needed
        const willBeEmpty =
          updatedPlan.breakfast.length === 0 &&
          updatedPlan.lunch.length === 0 &&
          updatedPlan.dinner.length === 0;

        if (willBeEmpty) {
          // If all meals will be empty, reset nutrition totals immediately
          setNutritionTotals({
            calories: 0,
            carbs: 0,
            fats: 0,
            proteins: 0,
            fibre: 0,
            serving_qty: 0,
            serving_unit: "",
          });
        } else {
          // Otherwise, update nutrition totals based on quantity
          setNutritionTotals((prev) => ({
            calories:
              prev.calories - foodToRemove.calories * foodToRemove.quantity,
            carbs: prev.carbs - foodToRemove.carbs * foodToRemove.quantity,
            fats: prev.fats - foodToRemove.fats * foodToRemove.quantity,
            proteins:
              prev.proteins - foodToRemove.proteins * foodToRemove.quantity,
            fibre: prev.fibre - foodToRemove.fibre * foodToRemove.quantity,
            serving_qty:
              prev.serving_qty -
              foodToRemove.serving_qty * foodToRemove.quantity,
            serving_unit:
              prev.serving_unit -
              foodToRemove.serving_unit * foodToRemove.quantity,
          }));
        }

        return updatedPlan;
      });
    }
  };

  // Get foods to display - either search results or popular foods
  const foodsToDisplay =
    searchQuery && searchResults.length > 0
      ? searchResults
      : popularSouthIndianFoods;

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
    <div
      className={`${
        hideHeader
          ? "gap-6"
          : "min-h-screen bg-[#0a1f2e] text-white flex flex-col px-4 py-8"
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

      {/* Template and Generate Meal Plan Buttons - Only shown for admin users */}
      {!fromFaceRecognition && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            className="bg-[#4d3a1f] py-3 px-4 rounded-lg flex-1 flex items-center justify-center"
            onClick={() => {
              fetchTemplates();
              setShowTemplateModal(true);
            }}
          >
            <FaList className="mr-2 text-[#e6a84b]" />
            <span className="text-[#e6a84b]">Load Template</span>
          </button>
          <button
            className="bg-[#2a7d4f] py-3 px-4 rounded-lg flex-1 flex items-center justify-center"
            onClick={() => setShowSaveTemplateModal(true)}
            disabled={
              !dietPlan.breakfast.length &&
              !dietPlan.lunch.length &&
              !dietPlan.dinner.length
            }
          >
            <FaSave className="mr-2 text-[#e8e8e8]" />
            <span className="text-[#e8e8e8]">Save Template</span>
          </button>
          <button
            className="bg-[#024a72] py-3 px-4 rounded-lg flex-1 flex items-center justify-center"
            onClick={() => setShowPreferencesModal(true)}
            disabled={!calculatedCalories?.dailyCalories}
          >
            <FaMagic className="mr-2 text-[#e8e8e8]" />
            <span className="text-[#e8e8e8]">Generate Meal</span>
          </button>
        </div>
      )}

      <div className="bg-[#1C2937] rounded-lg p-4 mb-2">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <div>
              <div className="flex items-start text-gray-400">
                <FaFire className="text-orange-500 mr-2 mt-1" />{" "}
                <div>
                  <div>Daily Calories</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xl text-white font-bold">
                      {calculatedCalories?.dailyCalories} kcal
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <select
              className="bg-[#0a1f2e] text-white p-2 rounded"
              value={calorieGoal}
              onChange={(e) => setCalorieGoal(e.target.value)}
            >
              <option value="loss">Weight Loss</option>
              <option value="maintenance">Maintenance</option>
              <option value="gain">Weight Gain</option>
            </select>
          </div>
        </div>

        {isLoadingCalories ? (
          <div className="flex justify-center py-2">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : calculatedCalories ? (
          <div>
            <div className="px-3 bg-[#0a1f2e] rounded-lg overflow-hidden">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block text-white-200">
                      {Math.min(
                        100,
                        Math.round(
                          (nutritionTotals.calories /
                            calculatedCalories.dailyCalories) *
                            100
                        )
                      )}
                      %
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-white">
                      {nutritionTotals.calories} /{" "}
                      {calculatedCalories.dailyCalories} kcal
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-[#324158]">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (nutritionTotals.calories /
                            calculatedCalories.dailyCalories) *
                            100
                        )
                      )}%`,
                      transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)", // Bouncy animation effect
                    }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#036BA2] progress-bar-fill"
                  >
                    {/* Animated gradient overlay */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)",
                        animation: "shimmer 2s infinite",
                        backgroundSize: "200% 100%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-2 text-gray-400">
            {member && (!member.height || !member.weight)
              ? "Height and weight data required for calorie calculation"
              : "Unable to calculate calories"}
          </div>
        )}
      </div>

      {/* Meal sections */}
      <div className="flex flex-col gap-6 mb-8">
        {/* Breakfast section */}
        <div>
          <h3 className="text-2xl mb-2">BREAKFAST</h3>
          <div className="bg-[#1C2937] rounded-lg p-4 h-auto min-h-32">
            {dietPlan.breakfast.length > 0 ? (
              <div className="flex flex-col gap-4">
                {dietPlan.breakfast.map((food) => (
                  <div
                    key={food.id}
                    className="flex flex-col bg-[#123347] p-4 rounded-lg"
                  >
                    <div className="relative">
                      {/* Delete icon - Only shown for admin users */}
                      {!fromFaceRecognition && (
                        <div
                          className="absolute -top-8 -left-6 text-red-500 bg-[#024a72] rounded-full p-[10px]"
                          onClick={() => removeFood("breakfast", food.id)}
                        >
                          <FaTrash size={12} />
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div className="pt-1">
                          <p className="text-white text-left">
                            {capitalizeFirstLetter(food.name)}
                          </p>
                          <p className="text-gray-400 text-sm text-left">
                            {food.totalCalories} kcal | {food.quantity}{" "}
                            {food.serving_unit}{" "}
                            {food.serving_weight_grams
                              ? `(${food.serving_weight_grams}g)`
                              : ""}
                          </p>
                          <p className="text-gray-400 text-xs text-left">
                            {food.totalCarbs}g Carbs | {food.totalFats}g Fats{" "}
                          </p>
                          <p className="text-gray-400 text-xs text-left">
                            {food.totalProteins}g Proteins | {food.totalFibre}g
                            Fibre
                          </p>
                        </div>
                        <div className="quantity-control h-7">
                          <button
                            onClick={() =>
                              updateFoodQuantity(
                                "breakfast",
                                food.id,
                                food.quantity - 1
                              )
                            }
                          >
                            -
                          </button>
                          <span>{food.quantity}</span>
                          <button
                            onClick={() =>
                              updateFoodQuantity(
                                "breakfast",
                                food.id,
                                food.quantity + 1
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Add More button - Only shown for admin users */}
                {!fromFaceRecognition && (
                  <button
                    className="bg-[#024a72] text-white py-2 px-4 rounded mt-2"
                    onClick={() => openFoodSelector("breakfast")}
                  >
                    Add More
                  </button>
                )}
              </div>
            ) : (
              <div
                className="h-32 flex items-center justify-center cursor-pointer"
                onClick={() => openFoodSelector("breakfast")}
              >
                <p className="text-gray-500 text-xl">Click to select foods</p>
              </div>
            )}
          </div>
        </div>

        {/* Lunch section */}
        <div>
          <h3 className="text-2xl mb-2">LUNCH</h3>
          <div className="bg-[#1C2937] rounded-lg p-4 h-auto min-h-32">
            {dietPlan.lunch.length > 0 ? (
              <div className="flex flex-col gap-4">
                {dietPlan.lunch.map((food) => (
                  <div
                    key={food.id}
                    className="flex flex-col bg-[#123347] p-4 rounded-lg"
                  >
                    <div className="relative">
                      {/* Delete icon - Only shown for admin users */}
                      {!fromFaceRecognition && (
                        <div
                          className="absolute -top-8 -left-6 text-red-500 bg-[#024a72] rounded-full p-[10px]"
                          onClick={() => removeFood("lunch", food.id)}
                        >
                          <FaTrash size={12} />
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div className="pt-1">
                          <p className="text-white text-left">
                            {capitalizeFirstLetter(food.name)}
                          </p>
                          <p className="text-gray-400 text-sm text-left">
                            {food.totalCalories} kcal | {food.quantity}{" "}
                            {food.serving_unit}{" "}
                            {food.serving_weight_grams
                              ? `(${food.serving_weight_grams}g)`
                              : ""}
                          </p>
                          <p className="text-gray-400 text-xs text-left">
                            {food.totalCarbs}g Carbs | {food.totalFats}g Fats{" "}
                          </p>
                          <p className="text-gray-400 text-xs text-left">
                            {food.totalProteins}g Proteins | {food.totalFibre}g
                            Fibre
                          </p>
                        </div>
                        <div className="quantity-control h-7">
                          <button
                            onClick={() =>
                              updateFoodQuantity(
                                "lunch",
                                food.id,
                                food.quantity - 1
                              )
                            }
                          >
                            -
                          </button>
                          <span>{food.quantity}</span>
                          <button
                            onClick={() =>
                              updateFoodQuantity(
                                "lunch",
                                food.id,
                                food.quantity + 1
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Add More button - Only shown for admin users */}
                {!fromFaceRecognition && (
                  <button
                    className="bg-[#024a72] text-white py-2 px-4 rounded mt-2"
                    onClick={() => openFoodSelector("lunch")}
                  >
                    Add More
                  </button>
                )}
              </div>
            ) : (
              <div
                className="h-32 flex items-center justify-center cursor-pointer"
                onClick={() => openFoodSelector("lunch")}
              >
                <p className="text-gray-500 text-xl">Click to select foods</p>
              </div>
            )}
          </div>
        </div>

        {/* Dinner section */}
        <div>
          <h3 className="text-2xl mb-2">DINNER</h3>
          <div className="bg-[#1C2937] rounded-lg p-4 h-auto min-h-32">
            {dietPlan.dinner.length > 0 ? (
              <div className="flex flex-col gap-4">
                {dietPlan.dinner.map((food) => (
                  <div
                    key={food.id}
                    className="flex flex-col bg-[#123347] p-4 rounded-lg"
                  >
                    <div className="relative">
                      {/* Delete icon - Only shown for admin users */}
                      {!fromFaceRecognition && (
                        <div
                          className="absolute -top-8 -left-6 text-red-500 bg-[#024a72] rounded-full p-[10px]"
                          onClick={() => removeFood("dinner", food.id)}
                        >
                          <FaTrash size={12} />
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div className="pt-1">
                          <p className="text-white text-left">
                            {capitalizeFirstLetter(food.name)}
                          </p>
                          <p className="text-gray-400 text-sm text-left">
                            {food.totalCalories} kcal | {food.quantity}{" "}
                            {food.serving_unit}{" "}
                            {food.serving_weight_grams
                              ? `(${food.serving_weight_grams}g)`
                              : ""}
                          </p>
                          <p className="text-gray-400 text-xs text-left">
                            {food.totalCarbs}g Carbs | {food.totalFats}g Fats{" "}
                          </p>
                          <p className="text-gray-400 text-xs text-left">
                            {food.totalProteins}g Proteins | {food.totalFibre}g
                            Fibre
                          </p>
                        </div>
                        <div className="quantity-control h-7">
                          <button
                            onClick={() =>
                              updateFoodQuantity(
                                "dinner",
                                food.id,
                                food.quantity - 1
                              )
                            }
                          >
                            -
                          </button>
                          <span>{food.quantity}</span>
                          <button
                            onClick={() =>
                              updateFoodQuantity(
                                "dinner",
                                food.id,
                                food.quantity + 1
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Add More button - Only shown for admin users */}
                {!fromFaceRecognition && (
                  <button
                    className="bg-[#024a72] text-white py-2 px-4 rounded mt-2"
                    onClick={() => openFoodSelector("dinner")}
                  >
                    Add More
                  </button>
                )}
              </div>
            ) : (
              <div
                className="h-32 flex items-center justify-center cursor-pointer"
                onClick={() => openFoodSelector("dinner")}
              >
                <p className="text-gray-500 text-xl">Click to select foods</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nutrition information */}
      <div className="flex flex-col gap-4 mb-8">
        <h3 className="text-xl font-bold">Nutrition Summary</h3>

        {/* Calories */}
        <div className="bg-[#1C2937] rounded-lg p-4">
          <div className="flex justify-between items-center mb-1">
            <p className="text-lg">Calories</p>
            <p className="text-lg">
              {nutritionTotals.calories} /{" "}
              {calculatedCalories?.dailyCalories || 0} kcal
            </p>
          </div>
          <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-[#324158]">
            <div
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (nutritionTotals.calories /
                      (calculatedCalories?.dailyCalories || 1)) *
                      100
                  )
                )}%`,
              }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#036BA2]"
            ></div>
          </div>
        </div>

        {/* Proteins */}
        <div className="bg-[#1C2937] rounded-lg p-4">
          <div className="flex justify-between items-center mb-1">
            <p className="text-lg">Proteins</p>
            <p className="text-lg">
              {nutritionTotals.proteins} / {recommendedNutrition.proteins} g
            </p>
          </div>
          <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-[#324158]">
            <div
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (nutritionTotals.proteins /
                      (recommendedNutrition.proteins || 1)) *
                      100
                  )
                )}%`,
              }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#4CAF50]"
            ></div>
          </div>
        </div>

        {/* Carbs */}
        <div className="bg-[#1C2937] rounded-lg p-4">
          <div className="flex justify-between items-center mb-1">
            <p className="text-lg">Carbs</p>
            <p className="text-lg">
              {nutritionTotals.carbs} / {recommendedNutrition.carbs} g
            </p>
          </div>
          <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-[#324158]">
            <div
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (nutritionTotals.carbs /
                      (recommendedNutrition.carbs || 1)) *
                      100
                  )
                )}%`,
              }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#FF9800]"
            ></div>
          </div>
        </div>

        {/* Fats */}
        <div className="bg-[#1C2937] rounded-lg p-4">
          <div className="flex justify-between items-center mb-1">
            <p className="text-lg">Fats</p>
            <p className="text-lg">
              {nutritionTotals.fats} / {recommendedNutrition.fats} g
            </p>
          </div>
          <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-[#324158]">
            <div
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (nutritionTotals.fats / (recommendedNutrition.fats || 1)) *
                      100
                  )
                )}%`,
              }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#FFC107]"
            ></div>
          </div>
        </div>

        {/* Fibre */}
        <div className="bg-[#1C2937] rounded-lg p-4">
          <div className="flex justify-between items-center mb-1">
            <p className="text-lg">Fibre</p>
            <p className="text-lg">
              {nutritionTotals.fibre} / {recommendedNutrition.fibre} g
            </p>
          </div>
          <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-[#324158]">
            <div
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (nutritionTotals.fibre /
                      (recommendedNutrition.fibre || 1)) *
                      100
                  )
                )}%`,
              }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#9C27B0]"
            ></div>
          </div>
        </div>
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

      {/* Loading indicator for meal plan generation */}
      {isGenerating && (
        <div className="fixed inset-0 bg-[#0a1f2e] bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-[#1C2937] p-6 rounded-lg w-full max-w-md text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-md font-bold mb-2">Generating Meal Plan</h2>
            <p className="text-gray-400">
              Our AI is creating a personalized meal plan based on your
              nutritional needs...
            </p>
          </div>
        </div>
      )}

      {/* Send button */}
      {/* {!fromFaceRecognition && (
        <button
          className="bg-white text-black py-4 rounded-lg text-xl font-bold"
          onClick={handleSendDietPlan}
        >
          Send Diet Plan
        </button>
      )} */}

      {/* Meal Preferences Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 bg-[#0a1f2e] bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-[#1C2937] p-6 rounded-lg w-full max-w-md">
            <h2 className="text-3xl font-bold mb-6 text-center">
              Meal Preferences
            </h2>

            <div className="mb-4">
              <label className="block text-gray-400 mb-2 text-left">
                Diet Type
              </label>
              <select
                className="bg-[#0a1f2e] text-white p-3 rounded-lg w-full"
                value={preferences.dietType}
                onChange={(e) =>
                  setPreferences({ ...preferences, dietType: e.target.value })
                }
              >
                <option value="">No Restriction</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="keto">Keto</option>
                <option value="paleo">Paleo</option>
                <option value="low-carb">Low Carb</option>
                <option value="high-protein">High Protein</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-400 mb-2 text-left">
                South Indian Regional Cuisine
              </label>
              <select
                className="bg-[#0a1f2e] text-white p-3 rounded-lg w-full"
                value={preferences.cuisine}
                onChange={(e) =>
                  setPreferences({ ...preferences, cuisine: e.target.value })
                }
              >
                <option value="">No Specific Region</option>
                <option value="tamil-nadu">Tamil Nadu</option>
                <option value="kerala">Kerala</option>
                <option value="karnataka">Karnataka</option>
                <option value="andhra">Andhra</option>
                <option value="telangana">Telangana</option>
                <option value="chettinad">Chettinad</option>
                <option value="udupi">Udupi</option>
                <option value="mangalorean">Mangalorean</option>
                <option value="hyderabadi">Hyderabadi</option>
                <option value="north-indian">North Indian</option>
                <option value="mediterranean">Mediterranean</option>
                <option value="asian">Asian</option>
                <option value="mexican">Mexican</option>
                <option value="italian">Italian</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-400 mb-2 text-left">
                Non-Vegetarian Preference
              </label>
              <select
                className="bg-[#0a1f2e] text-white p-3 rounded-lg w-full"
                value={preferences.nonVegType}
                onChange={(e) =>
                  setPreferences({ ...preferences, nonVegType: e.target.value })
                }
              >
                <option value="">No Preference</option>
                <option value="chicken">Chicken (Kozhi/Koli)</option>
                <option value="mutton">Mutton/Lamb (Aatukari)</option>
                <option value="fish">Fish (Meen)</option>
                <option value="seafood">Seafood (Prawns, Crab)</option>
                <option value="egg">Egg dishes</option>
                <option value="mixed">Mixed non-veg</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-400 mb-2 text-left">
                Meal Style
              </label>
              <select
                className="bg-[#0a1f2e] text-white p-3 rounded-lg w-full"
                value={preferences.mealStyle}
                onChange={(e) =>
                  setPreferences({ ...preferences, mealStyle: e.target.value })
                }
              >
                <option value="">No Specific Style</option>
                <option value="breakfast">
                  Traditional South Indian breakfast
                </option>
                <option value="tiffin">South Indian tiffin items</option>
                <option value="thali">South Indian thali/meals</option>
                <option value="street-food">South Indian street food</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 mb-2 text-left">
                Foods to Avoid (comma separated)
              </label>
              <input
                type="text"
                className="bg-[#0a1f2e] text-white p-3 rounded-lg w-full"
                placeholder="e.g., nuts, dairy, shellfish"
                value={preferences.avoidFoods}
                onChange={(e) =>
                  setPreferences({ ...preferences, avoidFoods: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2 mt-6">
              <button
                className="bg-[#0a1f2e] text-white py-3 rounded-lg text-lg font-bold flex-1"
                onClick={() => setShowPreferencesModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-[#024a72] text-white py-3 rounded-lg text-lg font-bold flex-1"
                onClick={handleGenerateMealPlan}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-[#0a1f2e] bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-[#1C2937] p-6 rounded-lg w-full max-w-md">
            <h2 className="text-3xl font-bold mb-6 text-center">
              Select Meal Template
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
                    onClick={() => applyTemplate(template)}
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-xl font-bold">{template.name}</p>
                      <p className="text-lg">
                        {template.nutritionTotals.calories} kcal
                      </p>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-400 mt-1 text-left">
                        {template.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2 text-xs text-gray-400">
                      <span>{template.breakfast.length} breakfast items</span>
                      <span>•</span>
                      <span>{template.lunch.length} lunch items</span>
                      <span>•</span>
                      <span>{template.dinner.length} dinner items</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                No meal templates found. Create one by saving a meal plan.
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                className="bg-[#3e4652] text-white py-3 rounded-lg text-lg font-bold flex-1"
                onClick={() => setShowTemplateModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-[#0a1f2e] bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-[#1C2937] p-6 rounded-lg w-full max-w-md">
            <h2 className="text-3xl font-bold mb-6 text-center">
              Save Template
            </h2>

            <div className="mb-4">
              <label className="block text-gray-400 mb-2 text-left">
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="bg-gray-800 text-white p-3 rounded-lg w-full"
                placeholder="Enter template name"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 mb-2 text-left">
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

      {/* Food Selection Modal */}
      {showFoodSelector && (
        <div className="fixed inset-0 bg-[#0a1f2e] bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-[#1C2937] p-6 rounded-lg w-full max-w-md">
            <h2 className="text-3xl font-bold mb-6 text-center">Select Food</h2>

            {/* Search input */}
            <div className="relative mb-6">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search foods"
                className="bg-[#3e4652] text-white p-3 pl-10 rounded-lg w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Food list with scroll */}
            <div className="mb-6">
              <h3 className="text-xl mb-3">
                {searchQuery && searchResults.length > 0
                  ? "Search Results"
                  : "Popular South Indian Foods"}
              </h3>

              {isSearching && (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}

              {!isSearching && (
                <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-2">
                  {foodsToDisplay.map((food) => (
                    <div
                      key={food.id}
                      className="cursor-pointer hover:bg-gray-800 p-2 rounded"
                      onClick={() => addFoodToMeal(food)}
                    >
                      <div className="flex justify-between items-center">
                        <p className="text-xl text-left">
                          {capitalizeFirstLetter(food.name)} -{" "}
                          {food.serving_qty} {food.serving_unit}
                          {food.serving_weight_grams
                            ? ` (${food.serving_weight_grams}g)`
                            : ""}
                        </p>
                        <p className="text-xl">{food.calories} kcal</p>
                      </div>
                      <p className="text-sm text-gray-400 text-left">
                        {food.calories} kcal • {food.carbs} g Carbs •{" "}
                        {food.fats} g Fats • {food.proteins} g Protein
                      </p>
                    </div>
                  ))}

                  {searchQuery &&
                    searchResults.length === 0 &&
                    !isSearching && (
                      <div className="text-center py-4 text-gray-400">
                        No foods found. Try a different search term.
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Cancel button */}
            <button
              className="bg-[#3e4652] text-white py-4 rounded-lg text-xl font-bold w-full"
              onClick={closeFoodSelector}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DietPlan;
