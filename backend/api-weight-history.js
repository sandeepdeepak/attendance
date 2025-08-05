// api-weight-history.js
const express = require("express");
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const region = "us-east-1";
const dynamoClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const WEIGHT_HISTORY_TABLE = "weight_history";

// Save weight record
router.post("/weight-history", async (req, res) => {
  try {
    const { memberId, date, weight, notes } = req.body;

    if (!memberId || !date || !weight) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "memberId, date, weight",
      });
    }

    // Create weight history record
    const weightRecord = {
      memberId,
      date,
      weight: parseFloat(weight),
      notes: notes || "",
      createdAt: new Date().toISOString(),
    };

    const putParams = {
      TableName: WEIGHT_HISTORY_TABLE,
      Item: weightRecord,
    };

    await docClient.send(new PutCommand(putParams));

    res.status(201).json({
      success: true,
      message: "Weight record saved successfully",
      weightRecord,
    });
  } catch (error) {
    console.error("Error saving weight record:", error);
    res.status(500).json({ error: "Failed to save weight record" });
  }
});

// Get weight history for a member
router.get("/weight-history/:memberId", async (req, res) => {
  try {
    const { memberId } = req.params;
    const { startDate, endDate } = req.query;

    let filterExpression = "memberId = :memberId";
    let expressionAttributeValues = {
      ":memberId": memberId,
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      filterExpression += " AND #date BETWEEN :startDate AND :endDate";
      expressionAttributeValues[":startDate"] = startDate;
      expressionAttributeValues[":endDate"] = endDate;
    } else if (startDate) {
      filterExpression += " AND #date >= :startDate";
      expressionAttributeValues[":startDate"] = startDate;
    } else if (endDate) {
      filterExpression += " AND #date <= :endDate";
      expressionAttributeValues[":endDate"] = endDate;
    }

    const scanParams = {
      TableName: WEIGHT_HISTORY_TABLE,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    // Add ExpressionAttributeNames if using date filters
    if (startDate || endDate) {
      scanParams.ExpressionAttributeNames = {
        "#date": "date",
      };
    }

    const result = await docClient.send(new ScanCommand(scanParams));

    // Sort by date in ascending order
    const sortedRecords = result.Items
      ? result.Items.sort((a, b) => new Date(a.date) - new Date(b.date))
      : [];

    res.json({
      success: true,
      memberId,
      weightHistory: sortedRecords,
    });
  } catch (error) {
    console.error("Error getting weight history:", error);
    res.status(500).json({ error: "Failed to get weight history" });
  }
});

// Get weight history for a member (public version for face recognition)
router.get("/weight-history/:memberId/public", async (req, res) => {
  try {
    const { memberId } = req.params;
    const { startDate, endDate } = req.query;

    let filterExpression = "memberId = :memberId";
    let expressionAttributeValues = {
      ":memberId": memberId,
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      filterExpression += " AND #date BETWEEN :startDate AND :endDate";
      expressionAttributeValues[":startDate"] = startDate;
      expressionAttributeValues[":endDate"] = endDate;
    } else if (startDate) {
      filterExpression += " AND #date >= :startDate";
      expressionAttributeValues[":startDate"] = startDate;
    } else if (endDate) {
      filterExpression += " AND #date <= :endDate";
      expressionAttributeValues[":endDate"] = endDate;
    }

    const scanParams = {
      TableName: WEIGHT_HISTORY_TABLE,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    // Add ExpressionAttributeNames if using date filters
    if (startDate || endDate) {
      scanParams.ExpressionAttributeNames = {
        "#date": "date",
      };
    }

    const result = await docClient.send(new ScanCommand(scanParams));

    // Sort by date in ascending order
    const sortedRecords = result.Items
      ? result.Items.sort((a, b) => new Date(a.date) - new Date(b.date))
      : [];

    res.json({
      success: true,
      memberId,
      weightHistory: sortedRecords,
    });
  } catch (error) {
    console.error("Error getting weight history:", error);
    res.status(500).json({ error: "Failed to get weight history" });
  }
});

// Delete a weight record
router.delete("/weight-history/:memberId/:date", async (req, res) => {
  try {
    const { memberId, date } = req.params;

    const deleteParams = {
      TableName: WEIGHT_HISTORY_TABLE,
      Key: {
        memberId,
        date,
      },
    };

    await docClient.send(new DeleteCommand(deleteParams));

    res.json({
      success: true,
      message: "Weight record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting weight record:", error);
    res.status(500).json({ error: "Failed to delete weight record" });
  }
});

module.exports = router;
