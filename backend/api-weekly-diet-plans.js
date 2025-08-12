const express = require("express");
const router = express.Router();
const { authenticateToken } = require("./authMiddleware");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

// Simple UUID generation function
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Initialize DynamoDB client
const region = "us-east-1";
const dynamoClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Constants for table names
const WEEKLY_DIET_PLANS_TABLE = "weekly_diet_plans";

// Helper function to create an empty weekly plan structure
const createEmptyWeeklyPlan = () => {
  return {
    monday: { meals: [] },
    tuesday: { meals: [] },
    wednesday: { meals: [] },
    thursday: { meals: [] },
    friday: { meals: [] },
    saturday: { meals: [] },
    sunday: { meals: [] },
  };
};

// Get all weekly diet plans for the authenticated gym owner
router.get("/weekly-diet-plans", authenticateToken, async (req, res) => {
  try {
    const gymOwnerId = req.user.gymId;

    // Use a scan operation with a filter to find all plans for this gym owner
    const params = {
      TableName: WEEKLY_DIET_PLANS_TABLE,
      FilterExpression: "gymOwnerId = :gymOwnerId",
      ExpressionAttributeValues: {
        ":gymOwnerId": gymOwnerId,
      },
    };

    const result = await docClient.send(new ScanCommand(params));

    if (result.Items && result.Items.length > 0) {
      // Return all plans
      return res.json({
        success: true,
        plans: result.Items,
      });
    } else {
      // For backward compatibility, return a default empty plan
      return res.json({
        success: true,
        plans: [],
        weeklyPlan: createEmptyWeeklyPlan(),
      });
    }
  } catch (error) {
    console.error("Error fetching weekly diet plans:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch weekly diet plans",
      error: error.message,
    });
  }
});

// Get a specific weekly diet plan by ID
router.get(
  "/weekly-diet-plans/:planId",
  authenticateToken,
  async (req, res) => {
    try {
      const gymOwnerId = req.user.gymId;
      const planId = req.params.planId;

      // Use a scan operation with a filter to find the plan
      const params = {
        TableName: WEEKLY_DIET_PLANS_TABLE,
        FilterExpression: "gymOwnerId = :gymOwnerId AND planId = :planId",
        ExpressionAttributeValues: {
          ":gymOwnerId": gymOwnerId,
          ":planId": planId,
        },
      };

      const result = await docClient.send(new ScanCommand(params));

      if (result.Items && result.Items.length > 0) {
        return res.json({
          success: true,
          plan: result.Items[0],
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Weekly diet plan not found",
        });
      }
    } catch (error) {
      console.error("Error fetching weekly diet plan:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch weekly diet plan",
        error: error.message,
      });
    }
  }
);

// Create a new weekly diet plan
router.post("/weekly-diet-plans", authenticateToken, async (req, res) => {
  try {
    const gymOwnerId = req.user.gymId;
    const { weeklyPlan, templateName } = req.body;

    if (!weeklyPlan) {
      return res.status(400).json({
        success: false,
        message: "Weekly plan data is required",
      });
    }

    if (!templateName) {
      return res.status(400).json({
        success: false,
        message: "Template name is required",
      });
    }

    // Validate the weekly plan structure
    const days = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    for (const day of days) {
      if (!weeklyPlan[day] || !Array.isArray(weeklyPlan[day].meals)) {
        return res.status(400).json({
          success: false,
          message: `Invalid weekly plan structure: ${day} meals must be an array`,
        });
      }
    }

    // Generate a unique ID for the plan
    const planId = generateUUID();
    const timestamp = new Date().toISOString();

    // Create a composite primary key using gymOwnerId and planId
    const compositeKey = `${gymOwnerId}#${planId}`;

    // Save the weekly diet plan to DynamoDB with a composite key
    const putParams = {
      TableName: WEEKLY_DIET_PLANS_TABLE,
      Item: {
        id: compositeKey, // Use this as the primary key
        gymOwnerId,
        planId,
        templateName,
        weeklyPlan,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    };

    await docClient.send(new PutCommand(putParams));

    return res.json({
      success: true,
      message: "Weekly diet plan saved successfully",
      planId,
    });
  } catch (error) {
    console.error("Error saving weekly diet plan:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save weekly diet plan",
      error: error.message,
    });
  }
});

// Update an existing weekly diet plan
router.put(
  "/weekly-diet-plans/:planId",
  authenticateToken,
  async (req, res) => {
    try {
      const gymOwnerId = req.user.gymId;
      const planId = req.params.planId;
      const { weeklyPlan, templateName } = req.body;

      if (!weeklyPlan) {
        return res.status(400).json({
          success: false,
          message: "Weekly plan data is required",
        });
      }

      if (!templateName) {
        return res.status(400).json({
          success: false,
          message: "Template name is required",
        });
      }

      // Validate the weekly plan structure
      const days = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      for (const day of days) {
        if (!weeklyPlan[day] || !Array.isArray(weeklyPlan[day].meals)) {
          return res.status(400).json({
            success: false,
            message: `Invalid weekly plan structure: ${day} meals must be an array`,
          });
        }
      }

      // Find the existing plan using scan
      const scanParams = {
        TableName: WEEKLY_DIET_PLANS_TABLE,
        FilterExpression: "gymOwnerId = :gymOwnerId AND planId = :planId",
        ExpressionAttributeValues: {
          ":gymOwnerId": gymOwnerId,
          ":planId": planId,
        },
      };

      const existingPlanResult = await docClient.send(
        new ScanCommand(scanParams)
      );

      if (!existingPlanResult.Items || existingPlanResult.Items.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Weekly diet plan not found",
        });
      }

      const existingPlan = existingPlanResult.Items[0];

      // Create a composite primary key using gymOwnerId and planId
      const compositeKey = `${gymOwnerId}#${planId}`;

      // Update the weekly diet plan
      const putParams = {
        TableName: WEEKLY_DIET_PLANS_TABLE,
        Item: {
          id: compositeKey, // Use this as the primary key
          gymOwnerId,
          planId,
          templateName,
          weeklyPlan,
          createdAt: existingPlan.createdAt,
          updatedAt: new Date().toISOString(),
        },
      };

      await docClient.send(new PutCommand(putParams));

      return res.json({
        success: true,
        message: "Weekly diet plan updated successfully",
      });
    } catch (error) {
      console.error("Error updating weekly diet plan:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update weekly diet plan",
        error: error.message,
      });
    }
  }
);

// Delete a weekly diet plan
router.delete(
  "/weekly-diet-plans/:planId",
  authenticateToken,
  async (req, res) => {
    try {
      const gymOwnerId = req.user.gymId;
      const planId = req.params.planId;

      // First find the plan to get its exact key structure
      const scanParams = {
        TableName: WEEKLY_DIET_PLANS_TABLE,
        FilterExpression: "gymOwnerId = :gymOwnerId AND planId = :planId",
        ExpressionAttributeValues: {
          ":gymOwnerId": gymOwnerId,
          ":planId": planId,
        },
      };

      const existingPlanResult = await docClient.send(
        new ScanCommand(scanParams)
      );

      if (!existingPlanResult.Items || existingPlanResult.Items.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Weekly diet plan not found",
        });
      }

      // Get the first matching plan
      const planToDelete = existingPlanResult.Items[0];

      // Create a composite primary key using gymOwnerId and planId
      const compositeKey = `${gymOwnerId}#${planId}`;

      // Delete the weekly diet plan using the composite key
      const deleteParams = {
        TableName: WEEKLY_DIET_PLANS_TABLE,
        Key: {
          id: planToDelete.id || compositeKey,
        },
      };

      await docClient.send(new DeleteCommand(deleteParams));

      return res.json({
        success: true,
        message: "Weekly diet plan deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting weekly diet plan:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete weekly diet plan",
        error: error.message,
      });
    }
  }
);

// Assign a weekly diet plan to multiple members
router.post(
  "/weekly-diet-plans/:planId/assign",
  authenticateToken,
  async (req, res) => {
    try {
      const gymOwnerId = req.user.gymId;
      const planId = req.params.planId;
      const { memberIds, startDates } = req.body;

      // Validate input
      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Member IDs are required",
        });
      }

      if (
        !startDates ||
        !Array.isArray(startDates) ||
        startDates.length !== memberIds.length
      ) {
        return res.status(400).json({
          success: false,
          message: "Start dates are required for each member",
        });
      }

      // Find the weekly diet plan
      const scanParams = {
        TableName: WEEKLY_DIET_PLANS_TABLE,
        FilterExpression: "gymOwnerId = :gymOwnerId AND planId = :planId",
        ExpressionAttributeValues: {
          ":gymOwnerId": gymOwnerId,
          ":planId": planId,
        },
      };

      const planResult = await docClient.send(new ScanCommand(scanParams));

      if (!planResult.Items || planResult.Items.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Weekly diet plan not found",
        });
      }

      const weeklyPlan = planResult.Items[0].weeklyPlan;
      const results = [];

      // For each member, apply the diet plan starting from their start date
      for (let i = 0; i < memberIds.length; i++) {
        const memberId = memberIds[i];
        const startDate = new Date(startDates[i]);

        // Apply each day's meals to the appropriate date
        const dayNames = [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ];

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const targetDate = new Date(startDate);
          targetDate.setDate(targetDate.getDate() + dayOffset);

          // Get day of week (0 = Sunday, 1 = Monday, etc.)
          const dayOfWeek = targetDate.getDay();
          // Convert JavaScript day of week (0-6, starting with Sunday) to our day names array (0-6, starting with Monday)
          // Sunday (0) should map to index 6, Monday (1) to index 0, Tuesday (2) to index 1, etc.
          const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const dayName = dayNames[dayIndex];

          // Include all days of the week

          // Get meals for this day
          const dayMeals = weeklyPlan[dayName].meals;

          // Skip if no meals for this day
          if (!dayMeals || dayMeals.length === 0) continue;

          // Format date as YYYY-MM-DD
          const formattedDate = targetDate.toISOString().split("T")[0];

          // Save diet plan for this member and date
          await saveDietPlan(memberId, formattedDate, dayMeals);

          results.push({
            memberId,
            date: formattedDate,
            mealsCount: dayMeals.length,
          });
        }
      }

      return res.json({
        success: true,
        message: "Weekly diet plan applied successfully",
        results,
      });
    } catch (error) {
      console.error("Error applying weekly diet plan:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to apply weekly diet plan",
        error: error.message,
      });
    }
  }
);

// Helper function to save a diet plan
async function saveDietPlan(memberId, date, meals) {
  // Categorize meals by mealType
  const breakfast = meals.filter((meal) => meal.mealType === "breakfast");
  const lunch = meals.filter((meal) => meal.mealType === "lunch");
  const dinner = meals.filter((meal) => meal.mealType === "dinner");

  // Calculate nutrition totals
  const nutritionTotals = meals.reduce(
    (totals, meal) => {
      return {
        calories: totals.calories + (meal.totalCalories || meal.calories || 0),
        carbs: totals.carbs + (meal.totalCarbs || meal.carbs || 0),
        proteins: totals.proteins + (meal.totalProteins || meal.proteins || 0),
        fats: totals.fats + (meal.totalFats || meal.fats || 0),
        fibre: totals.fibre + (meal.totalFibre || meal.fibre || 0),
      };
    },
    { calories: 0, carbs: 0, proteins: 0, fats: 0, fibre: 0 }
  );

  // Create diet plan item with the structure expected by the frontend
  const dietPlanItem = {
    memberId,
    date,
    breakfast,
    lunch,
    dinner,
    nutritionTotals,
    updatedAt: new Date().toISOString(),
  };

  const putParams = {
    TableName: "diet_plans",
    Item: dietPlanItem,
  };

  await docClient.send(new PutCommand(putParams));
  return dietPlanItem;
}

module.exports = router;
