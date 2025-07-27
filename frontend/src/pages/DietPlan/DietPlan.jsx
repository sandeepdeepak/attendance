import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import axios from "axios";
import "./DietPlan.css";
import { API_URL } from "../../config";

const DietPlan = ({ memberId, selectedDate, onBackClick }) => {
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
  });
  const [showFoodSelector, setShowFoodSelector] = useState(false);
  const [currentMealType, setCurrentMealType] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

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
    },
    {
      id: "default-2",
      name: "Masala Dosa",
      calories: 250,
      carbs: 40,
      fats: 8,
      proteins: 5,
      fibre: 3,
    },
    {
      id: "default-3",
      name: "Plain Dosa",
      calories: 170,
      carbs: 30,
      fats: 5,
      proteins: 3,
      fibre: 2,
    },
    {
      id: "default-4",
      name: "Uttapam",
      calories: 210,
      carbs: 35,
      fats: 6,
      proteins: 5,
      fibre: 3,
    },
    {
      id: "default-5",
      name: "Medu Vada",
      calories: 180,
      carbs: 20,
      fats: 10,
      proteins: 5,
      fibre: 3,
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
          name: food.food_name,
          calories: Math.round(food.nf_calories),
          carbs: Math.round(food.nf_total_carbohydrate),
          fats: Math.round(food.nf_total_fat),
          proteins: Math.round(food.nf_protein),
          fibre: Math.round(food.nf_dietary_fiber || 0),
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
      await axios.post(`${API_URL}/api/diet-plans`, {
        memberId,
        date: selectedDate,
        breakfast: dietPlan.breakfast,
        lunch: dietPlan.lunch,
        dinner: dietPlan.dinner,
        nutritionTotals,
      });
    } catch (error) {
      console.error("Error saving diet plan:", error);
      // We don't show an error to the user here to avoid disrupting the UX
      // The plan will be saved on the next change
    }
  };

  useEffect(() => {
    const fetchMemberDetailsAndDietPlan = async () => {
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

        // Fetch existing diet plan for this date
        const dietPlanResponse = await axios.get(
          `${API_URL}/api/diet-plans/${memberId}/${selectedDate}`
        );

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
  }, [memberId, selectedDate]);

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

  const removeFood = (mealType, foodId) => {
    const foodToRemove = dietPlan[mealType].find((food) => food.id === foodId);

    if (foodToRemove) {
      // Remove the food from the meal
      setDietPlan((prevPlan) => ({
        ...prevPlan,
        [mealType]: prevPlan[mealType].filter((food) => food.id !== foodId),
      }));

      // Update nutrition totals based on quantity
      setNutritionTotals((prev) => ({
        calories: prev.calories - foodToRemove.calories * foodToRemove.quantity,
        carbs: prev.carbs - foodToRemove.carbs * foodToRemove.quantity,
        fats: prev.fats - foodToRemove.fats * foodToRemove.quantity,
        proteins: prev.proteins - foodToRemove.proteins * foodToRemove.quantity,
        fibre: prev.fibre - foodToRemove.fibre * foodToRemove.quantity,
      }));
    }
  };

  // Get foods to display - either search results or popular foods
  const foodsToDisplay =
    searchQuery && searchResults.length > 0
      ? searchResults
      : popularSouthIndianFoods;

  const handleSendDietPlan = async () => {
    try {
      // Save the current diet plan
      await saveDietPlan();
      alert("Diet plan sent successfully!");
      onBackClick();
    } catch (error) {
      console.error("Error sending diet plan:", error);
      alert("Failed to send diet plan. Please try again.");
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
    <div className="min-h-screen bg-black text-white flex flex-col px-4 py-8">
      {/* Header with back button and member name */}
      <div className="w-full flex items-center mb-2">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={24} />
        </button>
        <h1 className="text-4xl font-bold text-center flex-grow">
          {member.fullName}
        </h1>
      </div>

      {/* Selected date */}
      <div className="text-center mb-8">
        <h2 className="text-2xl text-gray-400">{formatDate(selectedDate)}</h2>
      </div>

      {/* Meal sections */}
      <div className="flex flex-col gap-6 mb-8">
        {/* Breakfast section */}
        <div>
          <h3 className="text-2xl mb-2">BREAKFAST</h3>
          <div className="bg-gray-900 rounded-lg p-4 h-auto min-h-32">
            {dietPlan.breakfast.length > 0 ? (
              <div className="flex flex-col gap-2">
                {dietPlan.breakfast.map((food) => (
                  <div
                    key={food.id}
                    className="flex flex-col bg-gray-800 p-2 rounded"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white">{food.name}</p>
                        <p className="text-gray-400 text-sm text-left">
                          {food.totalCalories} kcal
                        </p>
                      </div>
                      <button
                        className="text-red-500 text-sm"
                        onClick={() => removeFood("breakfast", food.id)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center mt-2">
                      <span className="text-gray-400 mr-2">Quantity:</span>
                      <button
                        className="bg-gray-700 text-white w-8 h-8 rounded-l flex items-center justify-center mr-1"
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
                      <span className="bg-gray-600 text-white px-3 py-1 mr-1">
                        {food.quantity}
                      </span>
                      <button
                        className="bg-gray-700 text-white w-8 h-8 rounded-r flex items-center justify-center"
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
                ))}
                <button
                  className="bg-blue-600 text-white py-2 px-4 rounded mt-2"
                  onClick={() => openFoodSelector("breakfast")}
                >
                  Add More
                </button>
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
          <div className="bg-gray-900 rounded-lg p-4 h-auto min-h-32">
            {dietPlan.lunch.length > 0 ? (
              <div className="flex flex-col gap-2">
                {dietPlan.lunch.map((food) => (
                  <div
                    key={food.id}
                    className="flex flex-col bg-gray-800 p-2 rounded"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white">{food.name}</p>
                        <p className="text-gray-400 text-sm text-left">
                          {food.totalCalories} kcal
                        </p>
                      </div>
                      <button
                        className="text-red-500 text-sm"
                        onClick={() => removeFood("lunch", food.id)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center mt-2">
                      <span className="text-gray-400 mr-2">Quantity:</span>
                      <button
                        className="bg-gray-700 text-white w-8 h-8 rounded-l flex items-center justify-center mr-1"
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
                      <span className="bg-gray-600 text-white px-3 py-1 mr-1">
                        {food.quantity}
                      </span>
                      <button
                        className="bg-gray-700 text-white w-8 h-8 rounded-r flex items-center justify-center"
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
                ))}
                <button
                  className="bg-blue-600 text-white py-2 px-4 rounded mt-2"
                  onClick={() => openFoodSelector("lunch")}
                >
                  Add More
                </button>
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
          <div className="bg-gray-900 rounded-lg p-4 h-auto min-h-32">
            {dietPlan.dinner.length > 0 ? (
              <div className="flex flex-col gap-2">
                {dietPlan.dinner.map((food) => (
                  <div
                    key={food.id}
                    className="flex flex-col bg-gray-800 p-2 rounded"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white">{food.name}</p>
                        <p className="text-gray-400 text-sm text-left">
                          {food.totalCalories} kcal
                        </p>
                      </div>
                      <button
                        className="text-red-500 text-sm"
                        onClick={() => removeFood("dinner", food.id)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center mt-2">
                      <span className="text-gray-400 mr-2">Quantity:</span>
                      <button
                        className="bg-gray-700 text-white w-8 h-8 rounded-l flex items-center justify-center mr-1"
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
                      <span className="bg-gray-600 text-white px-3 py-1 mr-1">
                        {food.quantity}
                      </span>
                      <button
                        className="bg-gray-700 text-white w-8 h-8 rounded-r flex items-center justify-center"
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
                ))}
                <button
                  className="bg-blue-600 text-white py-2 px-4 rounded mt-2"
                  onClick={() => openFoodSelector("dinner")}
                >
                  Add More
                </button>
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
      <div className="grid grid-cols-5 gap-2 mb-8 text-center">
        <div>
          <p className="text-xl">Calories</p>
          <p className="text-2xl">{nutritionTotals.calories}</p>
        </div>
        <div>
          <p className="text-xl">Carbs</p>
          <p className="text-2xl">{nutritionTotals.carbs}</p>
        </div>
        <div>
          <p className="text-xl">Fats</p>
          <p className="text-2xl">{nutritionTotals.fats}</p>
        </div>
        <div>
          <p className="text-xl">Proteins</p>
          <p className="text-2xl">{nutritionTotals.proteins}</p>
        </div>
        <div>
          <p className="text-xl">Fibre</p>
          <p className="text-2xl">{nutritionTotals.fibre}</p>
        </div>
      </div>

      {/* Send button */}
      <button
        className="bg-white text-black py-4 rounded-lg text-xl font-bold"
        onClick={handleSendDietPlan}
      >
        Send Diet Plan
      </button>

      {/* Food Selection Modal */}
      {showFoodSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-3xl font-bold mb-6 text-center">Select Food</h2>

            {/* Search input */}
            <div className="relative mb-6">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search foods"
                className="bg-gray-800 text-white p-3 pl-10 rounded-lg w-full"
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
                        <p className="text-xl">{food.name}</p>
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
              className="bg-gray-800 text-white py-4 rounded-lg text-xl font-bold w-full"
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
