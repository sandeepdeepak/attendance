// API endpoint to get daily workout and meal details for a member's calorie progress
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("./middleware/auth");

// Sample data structure for daily details
const sampleDailyDetails = [
  {
    date: "2025-05-01",
    meals: {
      breakfast: [
        {
          name: "Oatmeal with fruits",
          quantity: 1,
          calories: 350,
          totalCalories: 350,
        },
        {
          name: "Greek Yogurt",
          quantity: 1,
          calories: 150,
          totalCalories: 150,
        },
      ],
      lunch: [
        {
          name: "Grilled Chicken Salad",
          quantity: 1,
          calories: 450,
          totalCalories: 450,
        },
        {
          name: "Whole Grain Bread",
          quantity: 2,
          calories: 80,
          totalCalories: 160,
        },
      ],
      dinner: [
        {
          name: "Salmon with Vegetables",
          quantity: 1,
          calories: 550,
          totalCalories: 550,
        },
        { name: "Brown Rice", quantity: 1, calories: 200, totalCalories: 200 },
      ],
      nutritionTotals: {
        calories: 1860,
        carbs: 180,
        proteins: 120,
        fats: 60,
        fibre: 25,
      },
    },
    workout: {
      exercises: [
        {
          name: "Bench Press",
          setCount: 4,
          repsCount: 10,
          weight: 80,
          notes: "Increased weight by 5kg",
        },
        { name: "Squats", setCount: 3, repsCount: 12, weight: 100, notes: "" },
        {
          name: "Pull-ups",
          setCount: 3,
          repsCount: 8,
          weight: 0,
          notes: "Body weight only",
        },
      ],
      caloriesBurned: 450,
      duration: 60, // minutes
    },
  },
  {
    date: "2025-05-02",
    meals: {
      breakfast: [
        {
          name: "Protein Smoothie",
          quantity: 1,
          calories: 300,
          totalCalories: 300,
        },
      ],
      lunch: [
        { name: "Turkey Wrap", quantity: 1, calories: 400, totalCalories: 400 },
        { name: "Apple", quantity: 1, calories: 80, totalCalories: 80 },
      ],
      dinner: [
        {
          name: "Vegetable Stir Fry",
          quantity: 1,
          calories: 350,
          totalCalories: 350,
        },
        { name: "Tofu", quantity: 1, calories: 150, totalCalories: 150 },
      ],
      nutritionTotals: {
        calories: 1280,
        carbs: 140,
        proteins: 90,
        fats: 40,
        fibre: 20,
      },
    },
    workout: {
      exercises: [
        {
          name: "Deadlift",
          setCount: 3,
          repsCount: 8,
          weight: 120,
          notes: "Focus on form",
        },
        {
          name: "Shoulder Press",
          setCount: 4,
          repsCount: 10,
          weight: 40,
          notes: "",
        },
      ],
      caloriesBurned: 380,
      duration: 45, // minutes
    },
  },
];

// GET /api/calorie-progress/:memberId/:yearMonth/details - Get daily details for a member's calorie progress
router.get(
  "/calorie-progress/:memberId/:yearMonth/details",
  authenticateToken,
  async (req, res) => {
    try {
      const { memberId, yearMonth } = req.params;

      // In a real implementation, you would fetch this data from a database
      // For now, we'll return sample data

      // Adjust dates to match the requested month
      const [year, month] = yearMonth.split("-");
      const dailyDetails = sampleDailyDetails.map((detail) => {
        // Create a copy of the detail object
        const newDetail = JSON.parse(JSON.stringify(detail));

        // Extract the day from the original date
        const day = detail.date.split("-")[2];

        // Create a new date with the requested year and month
        newDetail.date = `${year}-${month}-${day}`;

        return newDetail;
      });

      res.json({
        success: true,
        dailyDetails,
      });
    } catch (error) {
      console.error("Error fetching calorie progress details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch calorie progress details",
      });
    }
  }
);

// GET /api/calorie-progress/:memberId/:yearMonth/details/public - Public endpoint for daily details
router.get(
  "/calorie-progress/:memberId/:yearMonth/details/public",
  async (req, res) => {
    try {
      const { memberId, yearMonth } = req.params;

      // Same implementation as the authenticated endpoint
      // In a real app, you might want to limit the data returned for public access

      // Adjust dates to match the requested month
      const [year, month] = yearMonth.split("-");
      const dailyDetails = sampleDailyDetails.map((detail) => {
        // Create a copy of the detail object
        const newDetail = JSON.parse(JSON.stringify(detail));

        // Extract the day from the original date
        const day = detail.date.split("-")[2];

        // Create a new date with the requested year and month
        newDetail.date = `${year}-${month}-${day}`;

        return newDetail;
      });

      res.json({
        success: true,
        dailyDetails,
      });
    } catch (error) {
      console.error("Error fetching public calorie progress details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch calorie progress details",
      });
    }
  }
);

module.exports = router;
