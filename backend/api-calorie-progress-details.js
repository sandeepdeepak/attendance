// API endpoint to get workout and meal details for each day
const express = require("express");
const router = express.Router();
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

// Initialize DynamoDB client
const region = "us-east-1";
const dynamoClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Constants for table names
const DIET_PLANS_TABLE = "diet_plans";
const WORKOUT_PLANS_TABLE = "workout_plans";

/**
 * @route GET /api/calorie-progress/:memberId/:yearMonth/details
 * @description Get workout and meal details for each day of the month
 * @param {string} memberId - The ID of the member
 * @param {string} yearMonth - The year and month in YYYY-MM format
 * @returns {Object} Daily workout and meal details
 */
router.get("/:memberId/:yearMonth/details", async (req, res) => {
  try {
    const { memberId, yearMonth } = req.params;

    // Validate yearMonth format (YYYY-MM)
    if (!yearMonth.match(/^\d{4}-\d{2}$/)) {
      return res.status(400).json({
        error: "Invalid yearMonth format. Expected format: YYYY-MM",
      });
    }

    // Get the number of days in the month
    const [year, month] = yearMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // 1. Get all diet plans for the specified member and month
    const dietPlansParams = {
      TableName: DIET_PLANS_TABLE,
      FilterExpression:
        "memberId = :memberId AND begins_with(#date, :yearMonth)",
      ExpressionAttributeValues: {
        ":memberId": memberId,
        ":yearMonth": yearMonth,
      },
      ExpressionAttributeNames: {
        "#date": "date",
      },
    };

    const dietPlansResult = await docClient.send(
      new ScanCommand(dietPlansParams)
    );
    const dietPlans = dietPlansResult.Items || [];

    // 2. Get all workout plans for the specified member and month
    const workoutPlansParams = {
      TableName: WORKOUT_PLANS_TABLE,
      FilterExpression:
        "memberId = :memberId AND begins_with(#date, :yearMonth)",
      ExpressionAttributeValues: {
        ":memberId": memberId,
        ":yearMonth": yearMonth,
      },
      ExpressionAttributeNames: {
        "#date": "date",
      },
    };

    const workoutPlansResult = await docClient.send(
      new ScanCommand(workoutPlansParams)
    );
    const workoutPlans = workoutPlansResult.Items || [];

    // 3. Combine diet and workout plans into daily details
    const dailyDetails = {};

    // Initialize daily details for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const date = `${yearMonth}-${dayStr}`;

      dailyDetails[date] = {
        date,
        meals: {
          breakfast: [],
          lunch: [],
          dinner: [],
          nutritionTotals: {
            calories: 0,
            carbs: 0,
            proteins: 0,
            fats: 0,
            fibre: 0,
          },
        },
        workout: {
          exercises: [],
        },
      };
    }

    // Add diet plans to daily details
    dietPlans.forEach((plan) => {
      if (plan.date && dailyDetails[plan.date]) {
        dailyDetails[plan.date].meals = {
          breakfast: plan.breakfast || [],
          lunch: plan.lunch || [],
          dinner: plan.dinner || [],
          nutritionTotals: plan.nutritionTotals || {
            calories: 0,
            carbs: 0,
            proteins: 0,
            fats: 0,
            fibre: 0,
          },
        };
      }
    });

    // Add workout plans to daily details
    workoutPlans.forEach((plan) => {
      if (plan.date && dailyDetails[plan.date]) {
        dailyDetails[plan.date].workout = {
          exercises: plan.exercises || [],
        };
      }
    });

    // Convert the dailyDetails object to an array
    const dailyDetailsArray = Object.values(dailyDetails);

    res.json({
      success: true,
      memberId,
      yearMonth,
      dailyDetails: dailyDetailsArray,
    });
  } catch (error) {
    console.error("Error getting calorie progress details:", error);
    res.status(500).json({ error: "Failed to get calorie progress details" });
  }
});

module.exports = router;
