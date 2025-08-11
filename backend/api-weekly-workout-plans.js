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
const WEEKLY_WORKOUT_PLANS_TABLE = "weekly_workout_plans";

// Helper function to create an empty weekly plan structure
const createEmptyWeeklyPlan = () => {
  return {
    monday: { exercises: [] },
    tuesday: { exercises: [] },
    wednesday: { exercises: [] },
    thursday: { exercises: [] },
    friday: { exercises: [] },
    saturday: { exercises: [] },
    sunday: { exercises: [] },
  };
};

// Get all weekly workout plans for the authenticated gym owner
router.get("/weekly-workout-plans", authenticateToken, async (req, res) => {
  try {
    const gymOwnerId = req.user.gymId;

    // Use a scan operation with a filter to find all plans for this gym owner
    // This is less efficient but more flexible with different table structures
    const params = {
      TableName: WEEKLY_WORKOUT_PLANS_TABLE,
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
      // This helps with existing implementations
      return res.json({
        success: true,
        plans: [],
        weeklyPlan: createEmptyWeeklyPlan(),
      });
    }
  } catch (error) {
    console.error("Error fetching weekly workout plans:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch weekly workout plans",
      error: error.message,
    });
  }
});

// Get a specific weekly workout plan by ID
router.get(
  "/weekly-workout-plans/:planId",
  authenticateToken,
  async (req, res) => {
    try {
      const gymOwnerId = req.user.gymId;
      const planId = req.params.planId;

      // Use a scan operation with a filter to find the plan
      // This is less efficient but more flexible with different table structures
      const params = {
        TableName: WEEKLY_WORKOUT_PLANS_TABLE,
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
          message: "Weekly workout plan not found",
        });
      }
    } catch (error) {
      console.error("Error fetching weekly workout plan:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch weekly workout plan",
        error: error.message,
      });
    }
  }
);

// Create a new weekly workout plan
router.post("/weekly-workout-plans", authenticateToken, async (req, res) => {
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
      if (!weeklyPlan[day] || !Array.isArray(weeklyPlan[day].exercises)) {
        return res.status(400).json({
          success: false,
          message: `Invalid weekly plan structure: ${day} exercises must be an array`,
        });
      }
    }

    // Generate a unique ID for the plan
    const planId = generateUUID();
    const timestamp = new Date().toISOString();

    // Create a composite primary key using gymOwnerId and planId
    // This ensures each plan is stored as a separate record
    const compositeKey = `${gymOwnerId}#${planId}`;

    // Save the weekly workout plan to DynamoDB with a composite key
    const putParams = {
      TableName: WEEKLY_WORKOUT_PLANS_TABLE,
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
      message: "Weekly workout plan saved successfully",
      planId,
    });
  } catch (error) {
    console.error("Error saving weekly workout plan:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save weekly workout plan",
      error: error.message,
    });
  }
});

// Update an existing weekly workout plan
router.put(
  "/weekly-workout-plans/:planId",
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
        if (!weeklyPlan[day] || !Array.isArray(weeklyPlan[day].exercises)) {
          return res.status(400).json({
            success: false,
            message: `Invalid weekly plan structure: ${day} exercises must be an array`,
          });
        }
      }

      // Find the existing plan using scan
      const scanParams = {
        TableName: WEEKLY_WORKOUT_PLANS_TABLE,
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
          message: "Weekly workout plan not found",
        });
      }

      const existingPlan = existingPlanResult.Items[0];

      // Create a composite primary key using gymOwnerId and planId
      const compositeKey = `${gymOwnerId}#${planId}`;

      // Update the weekly workout plan
      const putParams = {
        TableName: WEEKLY_WORKOUT_PLANS_TABLE,
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
        message: "Weekly workout plan updated successfully",
      });
    } catch (error) {
      console.error("Error updating weekly workout plan:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update weekly workout plan",
        error: error.message,
      });
    }
  }
);

// Delete a weekly workout plan
router.delete(
  "/weekly-workout-plans/:planId",
  authenticateToken,
  async (req, res) => {
    try {
      const gymOwnerId = req.user.gymId;
      const planId = req.params.planId;

      // First find the plan to get its exact key structure
      const scanParams = {
        TableName: WEEKLY_WORKOUT_PLANS_TABLE,
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
          message: "Weekly workout plan not found",
        });
      }

      // Get the first matching plan
      const planToDelete = existingPlanResult.Items[0];

      // Create a composite primary key using gymOwnerId and planId
      const compositeKey = `${gymOwnerId}#${planId}`;

      // Delete the weekly workout plan using the composite key
      const deleteParams = {
        TableName: WEEKLY_WORKOUT_PLANS_TABLE,
        Key: {
          id: planToDelete.id || compositeKey,
        },
      };

      await docClient.send(new DeleteCommand(deleteParams));

      return res.json({
        success: true,
        message: "Weekly workout plan deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting weekly workout plan:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete weekly workout plan",
        error: error.message,
      });
    }
  }
);

module.exports = router;
