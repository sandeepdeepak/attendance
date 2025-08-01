// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

// Load environment variables from .env file
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const envLines = envContent.split("\n");

    envLines.forEach((line) => {
      // Skip comments and empty lines
      if (line.startsWith("#") || !line.trim()) return;

      // Parse key=value pairs
      const [key, ...valueParts] = line.split("=");
      const value = valueParts.join("=").trim();

      if (key && value) {
        process.env[key.trim()] = value;
      }
    });

    console.log("Environment variables loaded from .env file");
  }
} catch (error) {
  console.error("Error loading .env file:", error);
}
const {
  RekognitionClient,
  CompareFacesCommand,
  SearchFacesByImageCommand,
  CreateCollectionCommand,
  IndexFacesCommand,
} = require("@aws-sdk/client-rekognition");
const {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
} = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const app = express();
const port = 7777;
const region = "us-east-1";
const rekClient = new RekognitionClient({ region });
const dynamoClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const upload = multer({ storage: multer.memoryStorage() });

const MEMBERS_TABLE = "members";
const ATTENDANCE_TABLE = "attendance";
const MEMBERSHIPS_TABLE = "memberships";
const DIET_PLANS_TABLE = "diet_plans";
const MEAL_TEMPLATES_TABLE = "meal_templates";
const WORKOUT_PLANS_TABLE = "workout_plans";
const WORKOUT_TEMPLATES_TABLE = "workout_templates";
const GYM_OWNERS_TABLE = "gym_owners";

// JWT Secret Key - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const JWT_EXPIRES_IN = "24h"; // Token expiration time

// Configure CORS with specific options
app.use(
  cors({
    origin: "*", // Allow all origins, or specify with: ['http://localhost:3000', 'https://yourdomain.com']
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true, // Allow cookies to be sent with requests
    maxAge: 86400, // Cache preflight request results for 24 hours (in seconds)
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS headers to all responses as a backup
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", true);
  next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN format

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Initialize DynamoDB tables if they don't exist
async function initializeDynamoDB() {
  try {
    // Check if tables exist
    const listTablesResponse = await dynamoClient.send(
      new ListTablesCommand({})
    );
    const memberTableExists =
      listTablesResponse.TableNames.includes(MEMBERS_TABLE);
    const attendanceTableExists =
      listTablesResponse.TableNames.includes(ATTENDANCE_TABLE);
    const membershipsTableExists =
      listTablesResponse.TableNames.includes(MEMBERSHIPS_TABLE);
    const dietPlansTableExists =
      listTablesResponse.TableNames.includes(DIET_PLANS_TABLE);
    const mealTemplatesTableExists =
      listTablesResponse.TableNames.includes(MEAL_TEMPLATES_TABLE);
    const workoutPlansTableExists =
      listTablesResponse.TableNames.includes(WORKOUT_PLANS_TABLE);
    const workoutTemplatesTableExists = listTablesResponse.TableNames.includes(
      WORKOUT_TEMPLATES_TABLE
    );
    const gymOwnersTableExists =
      listTablesResponse.TableNames.includes(GYM_OWNERS_TABLE);

    // Create members table if it doesn't exist
    if (!memberTableExists) {
      const createMemberTableParams = {
        TableName: MEMBERS_TABLE,
        KeySchema: [
          { AttributeName: "id", KeyType: "HASH" }, // Partition key
          { AttributeName: "phoneNumber", KeyType: "RANGE" }, // Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: "id", AttributeType: "S" },
          { AttributeName: "phoneNumber", AttributeType: "S" },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      };

      await dynamoClient.send(new CreateTableCommand(createMemberTableParams));
      console.log(`Created table: ${MEMBERS_TABLE}`);
    } else {
      console.log(`Table ${MEMBERS_TABLE} already exists`);
    }

    // Create attendance table if it doesn't exist
    if (!attendanceTableExists) {
      const createAttendanceTableParams = {
        TableName: ATTENDANCE_TABLE,
        KeySchema: [
          { AttributeName: "memberId", KeyType: "HASH" }, // Partition key
          { AttributeName: "timestamp", KeyType: "RANGE" }, // Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: "memberId", AttributeType: "S" },
          { AttributeName: "timestamp", AttributeType: "S" },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      };

      await dynamoClient.send(
        new CreateTableCommand(createAttendanceTableParams)
      );
      console.log(`Created table: ${ATTENDANCE_TABLE}`);
    } else {
      console.log(`Table ${ATTENDANCE_TABLE} already exists`);
    }

    // Create memberships table if it doesn't exist
    if (!membershipsTableExists) {
      const createMembershipsTableParams = {
        TableName: MEMBERSHIPS_TABLE,
        KeySchema: [
          { AttributeName: "id", KeyType: "HASH" }, // Partition key
          { AttributeName: "memberId", KeyType: "RANGE" }, // Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: "id", AttributeType: "S" },
          { AttributeName: "memberId", AttributeType: "S" },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      };

      await dynamoClient.send(
        new CreateTableCommand(createMembershipsTableParams)
      );
      console.log(`Created table: ${MEMBERSHIPS_TABLE}`);
    } else {
      console.log(`Table ${MEMBERSHIPS_TABLE} already exists`);
    }

    // Create diet plans table if it doesn't exist
    if (!dietPlansTableExists) {
      const createDietPlansTableParams = {
        TableName: DIET_PLANS_TABLE,
        KeySchema: [
          { AttributeName: "memberId", KeyType: "HASH" }, // Partition key
          { AttributeName: "date", KeyType: "RANGE" }, // Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: "memberId", AttributeType: "S" },
          { AttributeName: "date", AttributeType: "S" },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      };

      await dynamoClient.send(
        new CreateTableCommand(createDietPlansTableParams)
      );
      console.log(`Created table: ${DIET_PLANS_TABLE}`);
    } else {
      console.log(`Table ${DIET_PLANS_TABLE} already exists`);
    }

    // Create meal templates table if it doesn't exist
    if (!mealTemplatesTableExists) {
      const createMealTemplatesTableParams = {
        TableName: MEAL_TEMPLATES_TABLE,
        KeySchema: [
          { AttributeName: "id", KeyType: "HASH" }, // Partition key
        ],
        AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      };

      await dynamoClient.send(
        new CreateTableCommand(createMealTemplatesTableParams)
      );
      console.log(`Created table: ${MEAL_TEMPLATES_TABLE}`);
    } else {
      console.log(`Table ${MEAL_TEMPLATES_TABLE} already exists`);
    }

    // Create workout plans table if it doesn't exist
    if (!workoutPlansTableExists) {
      const createWorkoutPlansTableParams = {
        TableName: WORKOUT_PLANS_TABLE,
        KeySchema: [
          { AttributeName: "memberId", KeyType: "HASH" }, // Partition key
          { AttributeName: "date", KeyType: "RANGE" }, // Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: "memberId", AttributeType: "S" },
          { AttributeName: "date", AttributeType: "S" },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      };

      await dynamoClient.send(
        new CreateTableCommand(createWorkoutPlansTableParams)
      );
      console.log(`Created table: ${WORKOUT_PLANS_TABLE}`);
    } else {
      console.log(`Table ${WORKOUT_PLANS_TABLE} already exists`);
    }

    // Create workout templates table if it doesn't exist
    if (!workoutTemplatesTableExists) {
      const createWorkoutTemplatesTableParams = {
        TableName: WORKOUT_TEMPLATES_TABLE,
        KeySchema: [
          { AttributeName: "id", KeyType: "HASH" }, // Partition key
        ],
        AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      };

      await dynamoClient.send(
        new CreateTableCommand(createWorkoutTemplatesTableParams)
      );
      console.log(`Created table: ${WORKOUT_TEMPLATES_TABLE}`);
    } else {
      console.log(`Table ${WORKOUT_TEMPLATES_TABLE} already exists`);
    }

    // Create gym owners table if it doesn't exist
    if (!gymOwnersTableExists) {
      const createGymOwnersTableParams = {
        TableName: GYM_OWNERS_TABLE,
        KeySchema: [
          { AttributeName: "email", KeyType: "HASH" }, // Partition key
        ],
        AttributeDefinitions: [{ AttributeName: "email", AttributeType: "S" }],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      };

      await dynamoClient.send(
        new CreateTableCommand(createGymOwnersTableParams)
      );
      console.log(`Created table: ${GYM_OWNERS_TABLE}`);
    } else {
      console.log(`Table ${GYM_OWNERS_TABLE} already exists`);
    }
  } catch (error) {
    console.error("Error initializing DynamoDB:", error);
  }
}

// Initialize DynamoDB on server start
initializeDynamoDB().catch(console.error);

app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// CompareFaces route
app.post(
  "/api/compare",
  upload.fields([{ name: "source" }, { name: "target" }]),
  async (req, res) => {
    const [sourceImg, targetImg] = [
      req.files["source"][0].buffer,
      req.files["target"][0].buffer,
    ];
    const cmd = new CompareFacesCommand({
      SourceImage: { Bytes: sourceImg },
      TargetImage: { Bytes: targetImg },
      SimilarityThreshold: 90,
    });

    try {
      const { FaceMatches } = await rekClient.send(cmd);
      if (FaceMatches.length) {
        res.json({ match: true, similarity: FaceMatches[0].Similarity });
      } else {
        res.json({ match: false });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "CompareFaces failed" });
    }
  }
);

// Helper function to get today's date in YYYY-MM-DD format
function getTodayDateString() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

// Helper function to check if membership has expired
function checkMembershipExpired(startDate, membershipPlan) {
  if (!startDate || !membershipPlan) return false;

  const start = new Date(startDate);
  const today = new Date();

  // Calculate end date based on membership plan
  const planMonths = {
    "1 Month": 1,
    "3 Months": 3,
    "6 Months": 6,
    "12 Months": 12,
  };

  const months = planMonths[membershipPlan] || 1;
  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + months);

  // Compare end date with today
  return today > endDate;
}

// SearchFacesByImage route (requires a pre-created collection)
app.post("/api/search", upload.single("image"), async (req, res) => {
  const img = req.file.buffer;
  const cmd = new SearchFacesByImageCommand({
    CollectionId: "my-face-collection",
    Image: { Bytes: img },
    FaceMatchThreshold: 90,
    MaxFaces: 1,
  });

  try {
    const data = await rekClient.send(cmd);
    if (data.FaceMatches.length) {
      const memberId = data.FaceMatches[0].Face.ExternalImageId;
      const similarity = data.FaceMatches[0].Similarity;
      const currentTimestamp = new Date().toISOString();

      // Fetch member details from DynamoDB
      try {
        // Scan the table to find the member with the matching ID
        // We use scan here because we don't know the phoneNumber (which is part of the composite key)
        const scanParams = {
          TableName: MEMBERS_TABLE,
          FilterExpression: "id = :id",
          ExpressionAttributeValues: {
            ":id": memberId,
          },
        };

        const scanResult = await docClient.send(new ScanCommand(scanParams));

        if (scanResult.Items && scanResult.Items.length > 0) {
          const memberDetails = scanResult.Items[0];

          // Get active membership details
          const membershipScanParams = {
            TableName: MEMBERSHIPS_TABLE,
            FilterExpression: "memberId = :memberId AND isActive = :isActive",
            ExpressionAttributeValues: {
              ":memberId": memberId,
              ":isActive": true,
            },
          };

          const membershipResult = await docClient.send(
            new ScanCommand(membershipScanParams)
          );

          // Check if there's an active membership
          let activeMembership = null;
          let isMembershipExpired = true;

          if (membershipResult.Items && membershipResult.Items.length > 0) {
            // Sort by createdAt in descending order (newest first)
            const sortedMemberships = membershipResult.Items.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );

            activeMembership = sortedMemberships[0];

            // Check if the membership is expired
            const today = new Date();
            const endDate = new Date(activeMembership.endDate);
            isMembershipExpired = today > endDate;
          }

          if (isMembershipExpired) {
            // Return member details but with expired status and no attendance recording
            return res.json({
              match: true,
              similarity: similarity,
              id: memberId,
              member: {
                fullName: memberDetails.fullName,
                phoneNumber: memberDetails.phoneNumber,
                dateOfBirth: memberDetails.dateOfBirth,
                gender: memberDetails.gender,
                createdAt: memberDetails.createdAt,
              },
              membership: activeMembership,
              membershipExpired: true,
              message: "Membership has expired. Please renew to continue.",
            });
          }

          // Check if the member has already checked in today
          const todayDate = getTodayDateString();

          // Query attendance records for today
          const attendanceQueryParams = {
            TableName: ATTENDANCE_TABLE,
            KeyConditionExpression: "memberId = :memberId",
            FilterExpression: "begins_with(timestamp, :today)",
            ExpressionAttributeValues: {
              ":memberId": memberId,
              ":today": todayDate,
            },
          };

          const attendanceResult = await docClient.send(
            new ScanCommand({
              TableName: ATTENDANCE_TABLE,
              FilterExpression:
                "memberId = :memberId AND begins_with(#ts, :today)",
              ExpressionAttributeValues: {
                ":memberId": memberId,
                ":today": todayDate,
              },
              ExpressionAttributeNames: {
                "#ts": "timestamp",
              },
            })
          );

          let attendanceType = "ENTRY";
          let attendanceMessage = "Entry recorded successfully";

          // If there's already an entry for today but no exit, this is an exit
          if (
            attendanceResult.Items &&
            attendanceResult.Items.length === 1 &&
            attendanceResult.Items[0].type === "ENTRY"
          ) {
            attendanceType = "EXIT";
            attendanceMessage = "Exit recorded successfully";
          }
          // If there are already both entry and exit records for today, this is a new entry
          else if (
            attendanceResult.Items &&
            attendanceResult.Items.length >= 2
          ) {
            attendanceType = "ENTRY";
            attendanceMessage = "New entry recorded";
          }

          // Record the attendance
          const attendanceItem = {
            memberId: memberId,
            timestamp: currentTimestamp,
            type: attendanceType,
            date: todayDate,
          };

          const putAttendanceParams = {
            TableName: ATTENDANCE_TABLE,
            Item: attendanceItem,
          };

          await docClient.send(new PutCommand(putAttendanceParams));

          // Return member details along with match and attendance information
          res.json({
            match: true,
            similarity: similarity,
            id: memberId,
            member: {
              fullName: memberDetails.fullName,
              phoneNumber: memberDetails.phoneNumber,
              dateOfBirth: memberDetails.dateOfBirth,
              gender: memberDetails.gender,
              createdAt: memberDetails.createdAt,
            },
            membership: activeMembership,
            attendance: {
              type: attendanceType,
              timestamp: currentTimestamp,
              message: attendanceMessage,
            },
          });
        } else {
          // Member ID found in Rekognition but not in DynamoDB
          res.json({
            match: true,
            similarity: similarity,
            id: memberId,
            error: "Member details not found in database",
          });
        }
      } catch (dbError) {
        console.error("Error fetching member details:", dbError);
        res.json({
          match: true,
          similarity: similarity,
          id: memberId,
          error: "Failed to fetch member details",
        });
      }
    } else {
      res.json({ match: false });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "SearchFacesByImage failed" });
  }
});

// Get attendance records for a specific member
app.get("/api/attendance/:memberId", async (req, res) => {
  try {
    const { memberId } = req.params;
    const { date } = req.query; // Optional date filter in YYYY-MM-DD format

    let scanParams = {
      TableName: ATTENDANCE_TABLE,
      FilterExpression: "memberId = :memberId",
      ExpressionAttributeValues: {
        ":memberId": memberId,
      },
    };

    // Add date filter if provided
    if (date) {
      scanParams.FilterExpression += " AND begins_with(#ts, :date)";
      scanParams.ExpressionAttributeValues[":date"] = date;
      scanParams.ExpressionAttributeNames = {
        "#ts": "timestamp",
      };
    }

    const result = await docClient.send(new ScanCommand(scanParams));

    // Sort by timestamp
    const sortedRecords = result.Items
      ? result.Items.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        )
      : [];

    res.json({
      memberId,
      records: sortedRecords,
    });
  } catch (error) {
    console.error("Error getting attendance records:", error);
    res.status(500).json({ error: "Failed to get attendance records" });
  }
});

// Get dashboard statistics
app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    // Get gymId from the authenticated user
    const { gymId } = req.user;
    if (!gymId) {
      return res.status(400).json({
        error: "Missing gym ID",
        message: "Your account doesn't have a gym ID. Please contact support.",
      });
    }

    const todayDate = getTodayDateString();

    // Get all members for this gym
    const allMembersResult = await docClient.send(
      new ScanCommand({
        TableName: MEMBERS_TABLE,
        FilterExpression: "gymId = :gymId",
        ExpressionAttributeValues: {
          ":gymId": gymId,
        },
      })
    );

    const allMembers = allMembersResult.Items || [];

    // 1. Get today's attendance count (unique members who checked in today)
    // First get all attendance records for today
    const todayAttendanceParams = {
      TableName: ATTENDANCE_TABLE,
      FilterExpression: "begins_with(#ts, :today)",
      ExpressionAttributeValues: {
        ":today": todayDate,
      },
      ExpressionAttributeNames: {
        "#ts": "timestamp",
      },
    };

    const todayAttendanceResult = await docClient.send(
      new ScanCommand(todayAttendanceParams)
    );

    // Filter attendance records for members of this gym
    const gymMemberIds = new Set(allMembers.map((member) => member.id));
    const filteredAttendanceItems = todayAttendanceResult.Items
      ? todayAttendanceResult.Items.filter((item) =>
          gymMemberIds.has(item.memberId)
        )
      : [];

    // Count unique members who attended today
    const uniqueAttendees = new Set();
    filteredAttendanceItems.forEach((item) => {
      uniqueAttendees.add(item.memberId);
    });
    const todaysAttendance = uniqueAttendees.size;

    // 2. Get members currently inside (entered but not exited)
    const membersInside = new Set();
    const membersInsideDetails = [];

    // For each member, check their attendance records for today
    for (const member of allMembers) {
      const memberAttendanceParams = {
        TableName: ATTENDANCE_TABLE,
        FilterExpression: "memberId = :memberId AND begins_with(#ts, :today)",
        ExpressionAttributeValues: {
          ":memberId": member.id,
          ":today": todayDate,
        },
        ExpressionAttributeNames: {
          "#ts": "timestamp",
        },
      };

      const memberAttendanceResult = await docClient.send(
        new ScanCommand(memberAttendanceParams)
      );

      if (
        memberAttendanceResult.Items &&
        memberAttendanceResult.Items.length > 0
      ) {
        // Sort by timestamp to get the latest record
        const sortedRecords = memberAttendanceResult.Items.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        // If the latest record is an ENTRY, the member is inside
        if (sortedRecords[0].type === "ENTRY") {
          membersInside.add(member.id);
          membersInsideDetails.push(member);
        }
      }
    }

    // 3. Get missed check-ins (members who didn't check in today)
    const missedCheckIns = allMembers.length - uniqueAttendees.size;
    const absentMembersDetails = [];

    // Identify members who didn't check in today
    for (const member of allMembers) {
      if (!uniqueAttendees.has(member.id)) {
        absentMembersDetails.push(member);
      }
    }

    // 4. Get new members (joined in the last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();

    let newJoineesCount = 0;
    const newJoineesDetails = [];

    for (const member of allMembers) {
      if (member.createdAt && member.createdAt > oneWeekAgoStr) {
        newJoineesCount++;
        newJoineesDetails.push(member);
      }
    }

    res.json({
      todaysAttendance,
      membersInside: membersInside.size,
      missedCheckIns,
      newJoinees: newJoineesCount,
      membersInsideDetails: membersInsideDetails,
      absentMembersDetails: absentMembersDetails,
      newJoineesDetails: newJoineesDetails,
    });
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    res.status(500).json({ error: "Failed to get dashboard statistics" });
  }
});

// Get members currently inside the gym
app.get("/api/members-inside", authenticateToken, async (req, res) => {
  try {
    // Get gymId from the authenticated user
    const { gymId } = req.user;
    if (!gymId) {
      return res.status(400).json({
        error: "Missing gym ID",
        message: "Your account doesn't have a gym ID. Please contact support.",
      });
    }

    const todayDate = getTodayDateString();
    const membersInsideIds = new Set();
    const membersInsideDetails = [];

    // Get all members for this gym
    const allMembersResult = await docClient.send(
      new ScanCommand({
        TableName: MEMBERS_TABLE,
        FilterExpression: "gymId = :gymId",
        ExpressionAttributeValues: {
          ":gymId": gymId,
        },
      })
    );

    const allMembers = allMembersResult.Items || [];
    const memberMap = {};

    // Create a map of members by ID for quick lookup
    allMembers.forEach((member) => {
      memberMap[member.id] = member;
    });

    // For each member, check their attendance records for today
    for (const member of allMembers) {
      const memberAttendanceParams = {
        TableName: ATTENDANCE_TABLE,
        FilterExpression: "memberId = :memberId AND begins_with(#ts, :today)",
        ExpressionAttributeValues: {
          ":memberId": member.id,
          ":today": todayDate,
        },
        ExpressionAttributeNames: {
          "#ts": "timestamp",
        },
      };

      const memberAttendanceResult = await docClient.send(
        new ScanCommand(memberAttendanceParams)
      );

      if (
        memberAttendanceResult.Items &&
        memberAttendanceResult.Items.length > 0
      ) {
        // Sort by timestamp to get the latest record
        const sortedRecords = memberAttendanceResult.Items.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        // If the latest record is an ENTRY, the member is inside
        if (sortedRecords[0].type === "ENTRY") {
          membersInsideIds.add(member.id);
          membersInsideDetails.push(member);
        }
      }
    }

    res.json({
      count: membersInsideDetails.length,
      members: membersInsideDetails,
    });
  } catch (error) {
    console.error("Error getting members inside:", error);
    res.status(500).json({ error: "Failed to get members inside" });
  }
});

app.post("/api/create-collection", async (req, res) => {
  console.log(req.body);
  const collectionId = req.body.collectionId; // e.g. 'my-face-collection'
  try {
    const data = await rekClient.send(
      new CreateCollectionCommand({ CollectionId: collectionId })
    );
    res.json({ status: data.StatusCode === 200 ? "CREATED" : data.StatusCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "CreateCollection failed" });
  }
});

app.post("/api/index-face", upload.single("image"), async (req, res) => {
  const { collectionId, externalId } = req.body;
  const img = req.file.buffer;

  const params = {
    CollectionId: collectionId,
    Image: { Bytes: img },
    ExternalImageId: externalId,
    DetectionAttributes: [],
    MaxFaces: 1,
    QualityFilter: "AUTO",
  };

  try {
    const result = await rekClient.send(new IndexFacesCommand(params));
    if (result.FaceRecords.length > 0) {
      const face = result.FaceRecords[0].Face;
      res.json({ faceId: face.FaceId, imageId: face.ImageId });
    } else {
      res.status(400).json({ error: "No face detected or indexed" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "IndexFaces failed" });
  }
});

// Add a new member to DynamoDB and index their face
app.post(
  "/api/members",
  authenticateToken,
  upload.single("faceImage"),
  async (req, res) => {
    try {
      const {
        fullName,
        phoneNumber,
        startDate,
        dateOfBirth,
        gender,
        membershipPlan,
      } = req.body;
      const faceImage = req.file?.buffer;

      if (
        !fullName ||
        !phoneNumber ||
        !startDate ||
        !dateOfBirth ||
        !gender ||
        !membershipPlan ||
        !faceImage
      ) {
        return res.status(400).json({
          error: "Missing required fields",
          required:
            "fullName, phoneNumber, startDate, dateOfBirth, gender, membershipPlan, faceImage",
        });
      }

      // Get gymId from the authenticated user
      const { gymId } = req.user;
      if (!gymId) {
        return res.status(400).json({
          error: "Missing gym ID",
          message:
            "Your account doesn't have a gym ID. Please contact support.",
        });
      }

      // Generate a unique ID for the member
      const memberId = `member_${Date.now()}`;

      // First, index the face in the Rekognition collection
      const indexParams = {
        CollectionId: "my-face-collection",
        Image: { Bytes: faceImage },
        ExternalImageId: memberId,
        DetectionAttributes: [],
        MaxFaces: 1,
        QualityFilter: "AUTO",
      };

      const indexResult = await rekClient.send(
        new IndexFacesCommand(indexParams)
      );

      if (indexResult.FaceRecords.length === 0) {
        return res.status(400).json({ error: "No face detected in the image" });
      }

      const faceId = indexResult.FaceRecords[0].Face.FaceId;

      // Then, save the member data to DynamoDB (without membership details)
      const memberItem = {
        id: memberId,
        fullName,
        phoneNumber,
        dateOfBirth,
        gender,
        height: req.body.height || null,
        weight: req.body.weight || null,
        faceId,
        gymId, // Associate member with the gym owner
        createdAt: new Date().toISOString(),
        active: true,
      };

      const putParams = {
        TableName: MEMBERS_TABLE,
        Item: memberItem,
      };

      await docClient.send(new PutCommand(putParams));

      // Create initial membership record
      const membershipId = `membership_${Date.now()}`;

      // Calculate end date based on plan type
      const start = new Date(startDate);
      const planMonths = {
        "1 Month": 1,
        "3 Months": 3,
        "6 Months": 6,
        "12 Months": 12,
      };
      const months = planMonths[membershipPlan] || 1;

      const endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + months);

      const membershipItem = {
        id: membershipId,
        memberId,
        gymId, // Associate membership with the gym owner
        startDate,
        endDate: endDate.toISOString().split("T")[0],
        planType: membershipPlan,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      const putMembershipParams = {
        TableName: MEMBERSHIPS_TABLE,
        Item: membershipItem,
      };

      await docClient.send(new PutCommand(putMembershipParams));

      res.status(201).json({
        message: "Member added successfully",
        member: memberItem,
        membership: membershipItem,
      });
    } catch (error) {
      console.error("Error adding member:", error);
      res.status(500).json({ error: "Failed to add member" });
    }
  }
);

// Get all members
app.get("/api/members", authenticateToken, async (req, res) => {
  try {
    // Get gymId from the authenticated user
    const { gymId } = req.user;
    if (!gymId) {
      return res.status(400).json({
        error: "Missing gym ID",
        message: "Your account doesn't have a gym ID. Please contact support.",
      });
    }

    const params = {
      TableName: MEMBERS_TABLE,
      FilterExpression: "gymId = :gymId",
      ExpressionAttributeValues: {
        ":gymId": gymId,
      },
    };

    const result = await docClient.send(new ScanCommand(params));

    res.json({
      members: result.Items || [],
    });
  } catch (error) {
    console.error("Error getting members:", error);
    res.status(500).json({ error: "Failed to get members" });
  }
});

// Get a specific member by ID
app.get("/api/members/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { gymId } = req.user;

    if (!gymId) {
      return res.status(400).json({
        error: "Missing gym ID",
        message: "Your account doesn't have a gym ID. Please contact support.",
      });
    }

    // First try to find the member with both id and gymId
    const scanParams = {
      TableName: MEMBERS_TABLE,
      FilterExpression: "id = :id AND gymId = :gymId",
      ExpressionAttributeValues: {
        ":id": id,
        ":gymId": gymId,
      },
    };

    const result = await docClient.send(new ScanCommand(scanParams));

    // If member is found with gymId, return it
    if (result.Items && result.Items.length > 0) {
      return res.json({
        member: result.Items[0],
      });
    }

    // If not found with gymId, try to find by just id (for backward compatibility)
    // This is for members created before the gymId field was added
    const fallbackScanParams = {
      TableName: MEMBERS_TABLE,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id,
      },
    };

    const fallbackResult = await docClient.send(
      new ScanCommand(fallbackScanParams)
    );

    if (!fallbackResult.Items || fallbackResult.Items.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Found a member without gymId, update it with the current gymId
    const memberToUpdate = fallbackResult.Items[0];
    memberToUpdate.gymId = gymId; // Add gymId to the member

    // Update the member in the database
    const updateParams = {
      TableName: MEMBERS_TABLE,
      Item: memberToUpdate,
    };

    await docClient.send(new PutCommand(updateParams));

    // Return the updated member
    res.json({
      member: memberToUpdate,
    });
  } catch (error) {
    console.error("Error getting member:", error);
    res.status(500).json({ error: "Failed to get member" });
  }
});

// Update a member by ID
app.put("/api/members/:id", upload.single("faceImage"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      phoneNumber,
      dateOfBirth,
      gender,
      startDate,
      membershipPlan,
      height,
      weight,
    } = req.body;
    const faceImage = req.file?.buffer;

    if (!fullName || !phoneNumber || !dateOfBirth || !gender) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "fullName, phoneNumber, dateOfBirth, gender",
      });
    }

    // First, find the member to get the current data
    const scanParams = {
      TableName: MEMBERS_TABLE,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id,
      },
    };

    const scanResult = await docClient.send(new ScanCommand(scanParams));

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    const existingMember = scanResult.Items[0];

    // Create updated member item
    const updatedMember = {
      ...existingMember,
      fullName,
      phoneNumber,
      dateOfBirth,
      gender,
      height: height || existingMember.height,
      weight: weight || existingMember.weight,
      updatedAt: new Date().toISOString(),
    };

    // If a new face image was provided, update the face in Rekognition
    if (faceImage) {
      try {
        // Delete the old face from the collection if it exists
        if (existingMember.faceId) {
          const { DeleteFacesCommand } = require("@aws-sdk/client-rekognition");
          const deleteFacesParams = {
            CollectionId: "my-face-collection",
            FaceIds: [existingMember.faceId],
          };
          await rekClient.send(new DeleteFacesCommand(deleteFacesParams));
        }

        // Index the new face
        const indexParams = {
          CollectionId: "my-face-collection",
          Image: { Bytes: faceImage },
          ExternalImageId: id,
          DetectionAttributes: [],
          MaxFaces: 1,
          QualityFilter: "AUTO",
        };

        const indexResult = await rekClient.send(
          new IndexFacesCommand(indexParams)
        );

        if (indexResult.FaceRecords.length > 0) {
          const faceId = indexResult.FaceRecords[0].Face.FaceId;
          updatedMember.faceId = faceId;
        }
      } catch (faceError) {
        console.error("Error updating face:", faceError);
        // Continue with member update even if face update fails
      }
    }

    // Update the member in DynamoDB
    const putParams = {
      TableName: MEMBERS_TABLE,
      Item: updatedMember,
    };

    await docClient.send(new PutCommand(putParams));

    // If membership plan and start date are provided, update the membership
    if (startDate && membershipPlan) {
      try {
        // Calculate end date based on plan type
        const start = new Date(startDate);
        const planMonths = {
          "1 Month": 1,
          "3 Months": 3,
          "6 Months": 6,
          "12 Months": 12,
        };
        const months = planMonths[membershipPlan] || 1;

        const endDate = new Date(start);
        endDate.setMonth(endDate.getMonth() + months);

        // Generate a unique ID for the membership
        const membershipId = `membership_${Date.now()}`;

        // Create the new membership record
        const membershipItem = {
          id: membershipId,
          memberId: id,
          startDate,
          endDate: endDate.toISOString().split("T")[0],
          planType: membershipPlan,
          createdAt: new Date().toISOString(),
          isActive: true,
        };

        const putMembershipParams = {
          TableName: MEMBERSHIPS_TABLE,
          Item: membershipItem,
        };

        await docClient.send(new PutCommand(putMembershipParams));

        // Mark previous memberships as inactive
        const previousMembershipsParams = {
          TableName: MEMBERSHIPS_TABLE,
          FilterExpression: "memberId = :memberId AND id <> :id",
          ExpressionAttributeValues: {
            ":memberId": id,
            ":id": membershipId,
          },
        };

        const previousMemberships = await docClient.send(
          new ScanCommand(previousMembershipsParams)
        );

        if (previousMemberships.Items && previousMemberships.Items.length > 0) {
          for (const prevMembership of previousMemberships.Items) {
            const updatePrevMembershipParams = {
              TableName: MEMBERSHIPS_TABLE,
              Key: {
                id: prevMembership.id,
                memberId: prevMembership.memberId,
              },
              Item: {
                ...prevMembership,
                isActive: false,
              },
            };

            await docClient.send(new PutCommand(updatePrevMembershipParams));
          }
        }
      } catch (membershipError) {
        console.error("Error updating membership:", membershipError);
        // Continue with member update even if membership update fails
      }
    }

    res.json({
      message: "Member updated successfully",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({ error: "Failed to update member" });
  }
});

// Delete a member by ID
app.delete("/api/members/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // First, find the member to get the phoneNumber and faceId
    const scanParams = {
      TableName: MEMBERS_TABLE,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id,
      },
    };

    const scanResult = await docClient.send(new ScanCommand(scanParams));

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    const member = scanResult.Items[0];
    const { phoneNumber, faceId } = member;

    // Delete the member from DynamoDB
    const deleteParams = {
      TableName: MEMBERS_TABLE,
      Key: {
        id,
        phoneNumber,
      },
    };

    await docClient.send(new DeleteCommand(deleteParams));

    // Delete the face from Rekognition collection
    if (faceId) {
      const { DeleteFacesCommand } = require("@aws-sdk/client-rekognition");

      const deleteFacesParams = {
        CollectionId: "my-face-collection",
        FaceIds: [faceId],
      };

      await rekClient.send(new DeleteFacesCommand(deleteFacesParams));
    }

    // Delete all attendance records for this member
    const attendanceScanParams = {
      TableName: ATTENDANCE_TABLE,
      FilterExpression: "memberId = :memberId",
      ExpressionAttributeValues: {
        ":memberId": id,
      },
    };

    const attendanceResult = await docClient.send(
      new ScanCommand(attendanceScanParams)
    );

    if (attendanceResult.Items && attendanceResult.Items.length > 0) {
      // Delete each attendance record
      for (const record of attendanceResult.Items) {
        const deleteAttendanceParams = {
          TableName: ATTENDANCE_TABLE,
          Key: {
            memberId: record.memberId,
            timestamp: record.timestamp,
          },
        };

        await docClient.send(new DeleteCommand(deleteAttendanceParams));
      }
    }

    // Delete all membership records for this member
    const membershipScanParams = {
      TableName: MEMBERSHIPS_TABLE,
      FilterExpression: "memberId = :memberId",
      ExpressionAttributeValues: {
        ":memberId": id,
      },
    };

    const membershipResult = await docClient.send(
      new ScanCommand(membershipScanParams)
    );

    if (membershipResult.Items && membershipResult.Items.length > 0) {
      // Delete each membership record
      for (const record of membershipResult.Items) {
        const deleteMembershipParams = {
          TableName: MEMBERSHIPS_TABLE,
          Key: {
            id: record.id,
            memberId: record.memberId,
          },
        };

        await docClient.send(new DeleteCommand(deleteMembershipParams));
      }
    }

    res.json({
      message: "Member deleted successfully",
      deletedMember: member,
    });
  } catch (error) {
    console.error("Error deleting member:", error);
    res.status(500).json({ error: "Failed to delete member" });
  }
});

// Delete all faces from a collection
app.delete("/api/faces", async (req, res) => {
  try {
    const { collectionId = "my-face-collection" } = req.query;

    // Import the DeleteFacesCommand
    const {
      ListFacesCommand,
      DeleteFacesCommand,
    } = require("@aws-sdk/client-rekognition");

    // First, list all faces in the collection
    const listFacesParams = {
      CollectionId: collectionId,
      MaxResults: 4096, // Maximum allowed by the API
    };

    const listFacesResult = await rekClient.send(
      new ListFacesCommand(listFacesParams)
    );

    if (listFacesResult.Faces && listFacesResult.Faces.length > 0) {
      // Extract face IDs
      const faceIds = listFacesResult.Faces.map((face) => face.FaceId);

      // Delete the faces
      const deleteFacesParams = {
        CollectionId: collectionId,
        FaceIds: faceIds,
      };

      const deleteFacesResult = await rekClient.send(
        new DeleteFacesCommand(deleteFacesParams)
      );

      // Also delete the corresponding entries from DynamoDB
      // Note: This is a simple implementation that deletes all members
      // In a production environment, you might want to be more selective
      const scanParams = {
        TableName: MEMBERS_TABLE,
      };

      const scanResult = await docClient.send(new ScanCommand(scanParams));

      if (scanResult.Items && scanResult.Items.length > 0) {
        // Delete each member
        for (const member of scanResult.Items) {
          const deleteParams = {
            TableName: MEMBERS_TABLE,
            Key: {
              id: member.id,
              phoneNumber: member.phoneNumber,
            },
          };

          await docClient.send(new DeleteCommand(deleteParams));
        }
      }

      res.json({
        message: "All faces deleted successfully",
        deletedFaces: deleteFacesResult.DeletedFaces.length,
        deletedMembers: scanResult.Items ? scanResult.Items.length : 0,
      });
    } else {
      res.json({ message: "No faces found in the collection" });
    }
  } catch (error) {
    console.error("Error deleting faces:", error);
    res.status(500).json({ error: "Failed to delete faces" });
  }
});

// Create a new membership record
app.post("/api/memberships", async (req, res) => {
  try {
    const { memberId, startDate, planType } = req.body;

    if (!memberId || !startDate || !planType) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "memberId, startDate, planType",
      });
    }

    // Calculate end date based on plan type
    const start = new Date(startDate);
    const planMonths = {
      "1 Month": 1,
      "3 Months": 3,
      "6 Months": 6,
      "12 Months": 12,
    };
    const months = planMonths[planType] || 1;

    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);

    // Generate a unique ID for the membership
    const membershipId = `membership_${Date.now()}`;

    // Create the membership record
    const membershipItem = {
      id: membershipId,
      memberId,
      startDate,
      endDate: endDate.toISOString().split("T")[0],
      planType,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const putParams = {
      TableName: MEMBERSHIPS_TABLE,
      Item: membershipItem,
    };

    await docClient.send(new PutCommand(putParams));

    // Check if the member exists
    const scanParams = {
      TableName: MEMBERS_TABLE,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": memberId,
      },
    };

    const scanResult = await docClient.send(new ScanCommand(scanParams));

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Mark previous memberships as inactive
    const previousMembershipsParams = {
      TableName: MEMBERSHIPS_TABLE,
      FilterExpression: "memberId = :memberId AND id <> :id",
      ExpressionAttributeValues: {
        ":memberId": memberId,
        ":id": membershipId,
      },
    };

    const previousMemberships = await docClient.send(
      new ScanCommand(previousMembershipsParams)
    );

    if (previousMemberships.Items && previousMemberships.Items.length > 0) {
      for (const prevMembership of previousMemberships.Items) {
        const updatePrevMembershipParams = {
          TableName: MEMBERSHIPS_TABLE,
          Key: {
            id: prevMembership.id,
            memberId: prevMembership.memberId,
          },
          Item: {
            ...prevMembership,
            isActive: false,
          },
        };

        await docClient.send(new PutCommand(updatePrevMembershipParams));
      }
    }

    res.status(201).json({
      message: "Membership created successfully",
      membership: membershipItem,
    });
  } catch (error) {
    console.error("Error creating membership:", error);
    res.status(500).json({ error: "Failed to create membership" });
  }
});

// Get all membership records for a member
app.get("/api/memberships/:memberId", async (req, res) => {
  try {
    const { memberId } = req.params;

    // Scan the memberships table for records with this memberId
    const scanParams = {
      TableName: MEMBERSHIPS_TABLE,
      FilterExpression: "memberId = :memberId",
      ExpressionAttributeValues: {
        ":memberId": memberId,
      },
    };

    const result = await docClient.send(new ScanCommand(scanParams));

    // Sort by createdAt in descending order (newest first)
    const sortedMemberships = result.Items
      ? result.Items.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      : [];

    res.json({
      memberId,
      memberships: sortedMemberships,
    });
  } catch (error) {
    console.error("Error getting memberships:", error);
    res.status(500).json({ error: "Failed to get memberships" });
  }
});

// Extend a member's membership
app.post("/api/memberships/:memberId/extend", async (req, res) => {
  try {
    const { memberId } = req.params;
    const { startDate, planType } = req.body;

    if (!startDate || !planType) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "startDate, planType",
      });
    }

    // First, check if the member exists
    const memberScanParams = {
      TableName: MEMBERS_TABLE,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": memberId,
      },
    };

    const memberScanResult = await docClient.send(
      new ScanCommand(memberScanParams)
    );

    if (!memberScanResult.Items || memberScanResult.Items.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Calculate end date based on plan type
    const start = new Date(startDate);
    const planMonths = {
      "1 Month": 1,
      "3 Months": 3,
      "6 Months": 6,
      "12 Months": 12,
    };
    const months = planMonths[planType] || 1;

    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);

    // Generate a unique ID for the membership
    const membershipId = `membership_${Date.now()}`;

    // Create the new membership record
    const membershipItem = {
      id: membershipId,
      memberId,
      startDate,
      endDate: endDate.toISOString().split("T")[0],
      planType,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const putMembershipParams = {
      TableName: MEMBERSHIPS_TABLE,
      Item: membershipItem,
    };

    await docClient.send(new PutCommand(putMembershipParams));

    // Mark previous memberships as inactive
    const previousMembershipsParams = {
      TableName: MEMBERSHIPS_TABLE,
      FilterExpression: "memberId = :memberId AND id <> :id",
      ExpressionAttributeValues: {
        ":memberId": memberId,
        ":id": membershipId,
      },
    };

    const previousMemberships = await docClient.send(
      new ScanCommand(previousMembershipsParams)
    );

    if (previousMemberships.Items && previousMemberships.Items.length > 0) {
      for (const prevMembership of previousMemberships.Items) {
        const updatePrevMembershipParams = {
          TableName: MEMBERSHIPS_TABLE,
          Key: {
            id: prevMembership.id,
            memberId: prevMembership.memberId,
          },
          Item: {
            ...prevMembership,
            isActive: false,
          },
        };

        await docClient.send(new PutCommand(updatePrevMembershipParams));
      }
    }

    res.json({
      message: "Membership extended successfully",
      membership: membershipItem,
    });
  } catch (error) {
    console.error("Error extending membership:", error);
    res.status(500).json({ error: "Failed to extend membership" });
  }
});

// Get members with expiring memberships
app.get("/api/members-expiring", async (req, res) => {
  try {
    const { days = 1 } = req.query; // Default to 1 day if not specified
    const daysNum = parseInt(days, 10);

    // Get today's date
    const today = new Date();

    // Calculate the target date (today + days)
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysNum);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    // Get all active memberships
    const membershipScanParams = {
      TableName: MEMBERSHIPS_TABLE,
      FilterExpression: "isActive = :isActive",
      ExpressionAttributeValues: {
        ":isActive": true,
      },
    };

    const membershipResult = await docClient.send(
      new ScanCommand(membershipScanParams)
    );

    // Filter memberships that expire on the target date
    const expiringMemberships = membershipResult.Items
      ? membershipResult.Items.filter((membership) => {
          const endDate = membership.endDate.split("T")[0];
          return endDate === targetDateStr;
        })
      : [];

    // Get member details for each expiring membership
    const expiringMembers = [];

    for (const membership of expiringMemberships) {
      const memberScanParams = {
        TableName: MEMBERS_TABLE,
        FilterExpression: "id = :id",
        ExpressionAttributeValues: {
          ":id": membership.memberId,
        },
      };

      const memberResult = await docClient.send(
        new ScanCommand(memberScanParams)
      );

      if (memberResult.Items && memberResult.Items.length > 0) {
        expiringMembers.push({
          member: memberResult.Items[0],
          membership,
        });
      }
    }

    res.json({
      expiringMembers,
      count: expiringMembers.length,
    });
  } catch (error) {
    console.error("Error getting expiring memberships:", error);
    res.status(500).json({ error: "Failed to get expiring memberships" });
  }
});

// Get today's attendance with member details
app.get("/api/attendance-today", async (req, res) => {
  try {
    const todayDate = getTodayDateString();
    console.log("Today's date:", todayDate);

    // Get all attendance records for today
    const todayAttendanceParams = {
      TableName: ATTENDANCE_TABLE,
      FilterExpression: "#dt = :today",
      ExpressionAttributeValues: {
        ":today": todayDate,
      },
      ExpressionAttributeNames: {
        "#dt": "date",
      },
    };

    const todayAttendanceResult = await docClient.send(
      new ScanCommand(todayAttendanceParams)
    );

    console.log("Today's attendance records:", todayAttendanceResult.Items);

    // Group attendance records by memberId
    const attendanceByMember = {};

    if (todayAttendanceResult.Items) {
      for (const record of todayAttendanceResult.Items) {
        const { memberId, timestamp, type } = record;
        console.log(
          `Processing record: memberId=${memberId}, type=${type}, timestamp=${timestamp}`
        );

        if (!attendanceByMember[memberId]) {
          attendanceByMember[memberId] = {
            entry: null,
            exit: null,
          };
        }

        if (type === "ENTRY") {
          // If multiple entries, keep the earliest one
          if (
            !attendanceByMember[memberId].entry ||
            timestamp < attendanceByMember[memberId].entry
          ) {
            attendanceByMember[memberId].entry = timestamp;
          }
        } else if (type === "EXIT") {
          // If multiple exits, keep the latest one
          if (
            !attendanceByMember[memberId].exit ||
            timestamp > attendanceByMember[memberId].exit
          ) {
            attendanceByMember[memberId].exit = timestamp;
          }
        }
      }
    }

    console.log("Grouped attendance by member:", attendanceByMember);

    // Get member details for each attendance record
    const attendanceWithMemberDetails = [];

    for (const memberId in attendanceByMember) {
      // Get member details
      const memberScanParams = {
        TableName: MEMBERS_TABLE,
        FilterExpression: "id = :id",
        ExpressionAttributeValues: {
          ":id": memberId,
        },
      };

      const memberResult = await docClient.send(
        new ScanCommand(memberScanParams)
      );

      if (memberResult.Items && memberResult.Items.length > 0) {
        const member = memberResult.Items[0];

        attendanceWithMemberDetails.push({
          memberId,
          fullName: member.fullName,
          phoneNumber: member.phoneNumber,
          entry: attendanceByMember[memberId].entry,
          exit: attendanceByMember[memberId].exit,
        });
      }
    }

    // Sort by entry time (earliest first)
    attendanceWithMemberDetails.sort((a, b) => {
      if (!a.entry) return 1;
      if (!b.entry) return -1;
      return new Date(a.entry) - new Date(b.entry);
    });

    console.log(
      "Final attendance with member details:",
      attendanceWithMemberDetails
    );

    res.json({
      date: todayDate,
      attendance: attendanceWithMemberDetails,
      count: attendanceWithMemberDetails.length,
    });
  } catch (error) {
    console.error("Error getting today's attendance:", error);
    res.status(500).json({ error: "Failed to get today's attendance" });
  }
});

// Diet plan endpoints
// Get diet plan for a specific member and date
app.get("/api/diet-plans/:memberId/:date", async (req, res) => {
  try {
    const { memberId, date } = req.params;

    const params = {
      TableName: DIET_PLANS_TABLE,
      Key: {
        memberId,
        date,
      },
    };

    const result = await docClient.send(new GetCommand(params));

    if (result.Item) {
      res.json({
        success: true,
        dietPlan: result.Item,
      });
    } else {
      res.json({
        success: true,
        dietPlan: {
          memberId,
          date,
          breakfast: [],
          lunch: [],
          dinner: [],
          nutritionTotals: {
            calories: 0,
            carbs: 0,
            fats: 0,
            proteins: 0,
            fibre: 0,
          },
        },
      });
    }
  } catch (error) {
    console.error("Error getting diet plan:", error);
    res.status(500).json({ error: "Failed to get diet plan" });
  }
});

// Save or update diet plan
app.post("/api/diet-plans", async (req, res) => {
  try {
    const { memberId, date, breakfast, lunch, dinner, nutritionTotals } =
      req.body;

    if (!memberId || !date) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "memberId, date",
      });
    }

    const dietPlanItem = {
      memberId,
      date,
      breakfast: breakfast || [],
      lunch: lunch || [],
      dinner: dinner || [],
      nutritionTotals: nutritionTotals || {
        calories: 0,
        carbs: 0,
        fats: 0,
        proteins: 0,
        fibre: 0,
      },
      updatedAt: new Date().toISOString(),
    };

    const putParams = {
      TableName: DIET_PLANS_TABLE,
      Item: dietPlanItem,
    };

    await docClient.send(new PutCommand(putParams));

    res.status(200).json({
      success: true,
      message: "Diet plan saved successfully",
      dietPlan: dietPlanItem,
    });
  } catch (error) {
    console.error("Error saving diet plan:", error);
    res.status(500).json({ error: "Failed to save diet plan" });
  }
});

// Send diet plan to WhatsApp
app.post("/api/send-diet-plan-whatsapp", async (req, res) => {
  try {
    const { memberId, date, phoneNumber } = req.body;

    if (!memberId || !date || !phoneNumber) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "memberId, date, phoneNumber",
      });
    }

    // Get diet plan from database
    const params = {
      TableName: DIET_PLANS_TABLE,
      Key: {
        memberId,
        date,
      },
    };

    const result = await docClient.send(new GetCommand(params));

    if (!result.Item) {
      return res.status(404).json({ error: "Diet plan not found" });
    }

    const dietPlan = result.Item;

    // Format the date for the message template
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Format the time (current time)
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    // Format phone number (ensure it has country code)
    const formattedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+91${phoneNumber}`; // Assuming Indian numbers

    // Format food lists for each meal
    const formatFoodList = (foods) => {
      if (!foods || foods.length === 0) return "No items added";

      return foods
        .map(
          (food) =>
            `• ${food.quantity}x ${food.name} (${
              food.totalCalories || food.calories
            } kcal)`
        )
        .join("\n");
    };

    const breakfastText = formatFoodList(dietPlan.breakfast);
    const lunchText = formatFoodList(dietPlan.lunch);
    const dinnerText = formatFoodList(dietPlan.dinner);

    // Get gym contact number from environment variable or use a default
    const gymContactNumber =
      process.env.GYM_CONTACT_NUMBER || "+91 98765 43210";

    // Get member details
    const memberScanParams = {
      TableName: MEMBERS_TABLE,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": memberId,
      },
    };

    const memberResult = await docClient.send(
      new ScanCommand(memberScanParams)
    );
    const memberName =
      memberResult.Items && memberResult.Items.length > 0
        ? memberResult.Items[0].fullName
        : "Member";

    // Use child_process to execute the curl command
    const { exec } = require("child_process");

    // Get auth token from environment variable or use a default for development
    const authToken = process.env.TWILIO_AUTH_TOKEN || "your_auth_token_here";
    const twilioAccountId =
      process.env.TWILIO_ACCOUNT_SID || "your_account_sid_here";

    // Create the message body with full diet plan details
    const messageBody = `FITNESS ZONE - YOUR PERSONALIZED DIET PLAN
    
📅 Date: ${formattedDate}

Dear ${memberName},

Here your customized diet plan to help you achieve your fitness goals:

BREAKFAST 🍳
${breakfastText}

LUNCH 🥗
${lunchText}

DINNER 🍽️
${dinnerText}

DAILY NUTRITION SUMMARY
• Calories: ${dietPlan.nutritionTotals.calories} kcal
• Protein: ${dietPlan.nutritionTotals.proteins} g
• Carbs: ${dietPlan.nutritionTotals.carbs} g
• Fats: ${dietPlan.nutritionTotals.fats} g
• Fiber: ${dietPlan.nutritionTotals.fibre} g

Stay consistent with your diet plan and workout routine!

For any questions, contact your trainer at ${gymContactNumber}.

FITNESS ZONE - Building Better Bodies`;

    // Create a simple message body without special characters
    const simpleMessageBody = `Your diet plan for ${formattedDate} is ready! Check your app for details.`;

    console.log(messageBody);

    console.log("twilioAccountId", twilioAccountId, authToken);

    // Create the curl command with a simple message body
    const curlCommand = `curl 'https://api.twilio.com/2010-04-01/Accounts/${twilioAccountId}/Messages.json' -X POST --data-urlencode 'To=${formattedPhone}' --data-urlencode 'From=+12526594159' --data-urlencode 'Body=${messageBody}' -u ${twilioAccountId}:${authToken}`;

    // Execute the curl command
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing curl command: ${error}`);
        return res
          .status(500)
          .json({ error: "Failed to send WhatsApp message" });
      }

      console.log(`WhatsApp message sent successfully: ${stdout}`);
      res.json({ success: true, message: "Diet plan sent to WhatsApp" });
    });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    res.status(500).json({ error: "Failed to send WhatsApp message" });
  }
});

// Sync member data to Google Sheets
app.get("/api/sync-to-excel", async (req, res) => {
  try {
    // Import the sheetsService module
    const { updateMembers } = require("./sheetsService");

    // Get all members from DynamoDB
    const params = {
      TableName: MEMBERS_TABLE,
    };

    const result = await docClient.send(new ScanCommand(params));
    const members = result.Items || [];

    if (members.length === 0) {
      return res.status(404).json({ error: "No members found" });
    }

    // Format member data for Google Sheets with headers
    // Add headers as the first row
    const headers = [
      "Full Name",
      "Phone Number",
      "Date of Birth",
      "Gender",
      "Height (cm)",
      "Weight (kg)",
    ];

    // Format member data rows
    const memberRows = members.map((member) => [
      member.fullName || "",
      member.phoneNumber || "",
      member.dateOfBirth || "",
      member.gender || "",
      member.height || "",
      member.weight || "",
    ]);

    // Combine headers and data
    const memberData = [headers, ...memberRows];

    // Update Google Sheets with member data
    await updateMembers(memberData);

    res.json({
      success: true,
      message: "Member data synced to Google Sheets successfully",
      count: members.length,
    });
  } catch (error) {
    console.error("Error syncing to Excel:", error);
    res.status(500).json({ error: "Failed to sync data to Excel" });
  }
});

// Sync member data from Google Sheets to DynamoDB
app.get("/api/sync-from-excel", async (req, res) => {
  try {
    // Import the sheetsService module
    const { readMembers } = require("./sheetsService");

    // Read member data from Google Sheets
    const sheetMembers = await readMembers();

    if (!sheetMembers || sheetMembers.length === 0) {
      return res
        .status(404)
        .json({ error: "No member data found in Google Sheets" });
    }

    // Get all existing members from DynamoDB
    const scanParams = {
      TableName: MEMBERS_TABLE,
    };

    const scanResult = await docClient.send(new ScanCommand(scanParams));
    const existingMembers = scanResult.Items || [];

    // Create a map of existing members by phone number for quick lookup
    const existingMemberMap = {};
    existingMembers.forEach((member) => {
      existingMemberMap[member.phoneNumber] = member;
    });

    // Track operations for summary
    const summary = {
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: 0,
    };

    // Process each member from the sheet (skip header row)
    const processedMembers = [];

    // Skip the first row which contains headers
    const dataRows = sheetMembers.slice(1);

    for (const sheetMember of dataRows) {
      // Ensure we have at least the required fields
      if (sheetMember.length < 3) {
        console.warn("Skipping row with insufficient data:", sheetMember);
        continue;
      }

      const [fullName, phoneNumber, dateOfBirth, gender, height, weight] =
        sheetMember;

      // Skip rows with missing essential data
      if (!fullName || !phoneNumber) {
        console.warn("Skipping row with missing name or phone:", sheetMember);
        continue;
      }

      // Skip if the row looks like a header (contains "Full Name" or "Phone Number")
      if (
        fullName.toLowerCase().includes("name") ||
        phoneNumber.toLowerCase().includes("phone") ||
        fullName === "Full Name" ||
        phoneNumber === "Phone Number"
      ) {
        console.warn("Skipping header-like row:", sheetMember);
        continue;
      }

      processedMembers.push(phoneNumber);

      try {
        // Check if member already exists
        if (existingMemberMap[phoneNumber]) {
          const existingMember = existingMemberMap[phoneNumber];

          // Check if any data has changed
          if (
            existingMember.fullName !== fullName ||
            existingMember.dateOfBirth !== dateOfBirth ||
            existingMember.gender !== gender ||
            existingMember.height !== height ||
            existingMember.weight !== weight
          ) {
            // Update the existing member
            const updatedMember = {
              ...existingMember,
              fullName,
              dateOfBirth: dateOfBirth || existingMember.dateOfBirth,
              gender: gender || existingMember.gender,
              height: height || existingMember.height,
              weight: weight || existingMember.weight,
              updatedAt: new Date().toISOString(),
            };

            const putParams = {
              TableName: MEMBERS_TABLE,
              Item: updatedMember,
            };

            await docClient.send(new PutCommand(putParams));
            summary.updated++;
          } else {
            // Member exists but no changes needed
            summary.unchanged++;
          }
        } else {
          // This is a new member, create it
          // Generate a unique ID for the member
          const memberId = `member_${Date.now()}_${Math.floor(
            Math.random() * 1000
          )}`;

          const newMember = {
            id: memberId,
            fullName,
            phoneNumber,
            dateOfBirth: dateOfBirth || "",
            gender: gender || "male",
            height: height || null,
            weight: weight || null,
            createdAt: new Date().toISOString(),
            active: true,
          };

          const putParams = {
            TableName: MEMBERS_TABLE,
            Item: newMember,
          };

          await docClient.send(new PutCommand(putParams));
          summary.added++;
        }
      } catch (error) {
        console.error(`Error processing member ${fullName}:`, error);
        summary.errors++;
      }
    }

    // Optional: Delete members that are in DynamoDB but not in the sheet
    // Uncomment if you want this functionality
    /*
    for (const member of existingMembers) {
      if (!processedMembers.includes(member.phoneNumber)) {
        try {
          const deleteParams = {
            TableName: MEMBERS_TABLE,
            Key: {
              id: member.id,
              phoneNumber: member.phoneNumber
            }
          };
          
          await docClient.send(new DeleteCommand(deleteParams));
          summary.deleted++;
        } catch (error) {
          console.error(`Error deleting member ${member.fullName}:`, error);
          summary.errors++;
        }
      }
    }
    */

    res.json({
      success: true,
      message: "Member data synced from Google Sheets successfully",
      summary,
    });
  } catch (error) {
    console.error("Error syncing from Excel:", error);
    res.status(500).json({ error: "Failed to sync data from Excel" });
  }
});

// Calculate daily calories based on member data
app.get("/api/calculate-calories/:memberId", async (req, res) => {
  try {
    const { memberId } = req.params;
    const { goal = "loss" } = req.query; // Default to weight loss

    // Get member details
    const scanParams = {
      TableName: MEMBERS_TABLE,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": memberId,
      },
    };

    const result = await docClient.send(new ScanCommand(scanParams));

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    const member = result.Items[0];
    const { height, weight, dateOfBirth, gender } = member;

    if (!height || !weight || !dateOfBirth || !gender) {
      return res.status(400).json({
        error: "Missing required data",
        message:
          "Height, weight, date of birth, and gender are required for calorie calculation",
      });
    }

    // Calculate age from date of birth
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (gender.toLowerCase() === "male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Apply activity factor (sedentary = 1.2)
    const activityFactor = 1.2;
    const tdee = bmr * activityFactor;

    // Apply goal adjustment
    let goalAdjustment = 0;
    switch (goal) {
      case "loss":
        goalAdjustment = -500;
        break;
      case "gain":
        goalAdjustment = 500;
        break;
      default: // maintenance
        goalAdjustment = 0;
    }

    const dailyCalories = Math.round(tdee + goalAdjustment);

    res.json({
      success: true,
      data: {
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        dailyCalories,
        goal,
      },
    });
  } catch (error) {
    console.error("Error calculating calories:", error);
    res.status(500).json({ error: "Failed to calculate calories" });
  }
});

// Workout plan endpoints
// Get workout plan for a specific member and date
app.get("/api/workout-plans/:memberId/:date", async (req, res) => {
  try {
    const { memberId, date } = req.params;

    const params = {
      TableName: "workout_plans",
      Key: {
        memberId,
        date,
      },
    };

    const result = await docClient.send(new GetCommand(params));

    if (result.Item) {
      res.json({
        success: true,
        workoutPlan: result.Item,
      });
    } else {
      res.json({
        success: true,
        workoutPlan: {
          memberId,
          date,
          exercises: [],
        },
      });
    }
  } catch (error) {
    console.error("Error getting workout plan:", error);
    res.status(500).json({ error: "Failed to get workout plan" });
  }
});

// Save or update workout plan
app.post("/api/workout-plans", async (req, res) => {
  try {
    const { memberId, date, exercises } = req.body;

    if (!memberId || !date) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "memberId, date",
      });
    }

    const workoutPlanItem = {
      memberId,
      date,
      exercises: exercises || [],
      updatedAt: new Date().toISOString(),
    };

    const putParams = {
      TableName: "workout_plans",
      Item: workoutPlanItem,
    };

    await docClient.send(new PutCommand(putParams));

    res.status(200).json({
      success: true,
      message: "Workout plan saved successfully",
      workoutPlan: workoutPlanItem,
    });
  } catch (error) {
    console.error("Error saving workout plan:", error);
    res.status(500).json({ error: "Failed to save workout plan" });
  }
});

// Send workout plan to WhatsApp
app.post("/api/send-workout-plan-whatsapp", async (req, res) => {
  try {
    const { memberId, date, phoneNumber } = req.body;

    if (!memberId || !date || !phoneNumber) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "memberId, date, phoneNumber",
      });
    }

    // Get workout plan from database
    const params = {
      TableName: "workout_plans",
      Key: {
        memberId,
        date,
      },
    };

    const result = await docClient.send(new GetCommand(params));

    if (!result.Item) {
      return res.status(404).json({ error: "Workout plan not found" });
    }

    const workoutPlan = result.Item;

    // Format the date for the message template
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Format phone number (ensure it has country code)
    const formattedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+91${phoneNumber}`; // Assuming Indian numbers

    // Format exercise list
    const formatExerciseList = (exercises) => {
      if (!exercises || exercises.length === 0) return "No exercises added";

      return exercises
        .map(
          (exercise) =>
            `• ${exercise.name}: ${exercise.sets} sets x ${exercise.reps} reps${
              exercise.weight > 0 ? ` @ ${exercise.weight}kg` : ""
            }${exercise.notes ? `\n  Note: ${exercise.notes}` : ""}`
        )
        .join("\n");
    };

    const exerciseText = formatExerciseList(workoutPlan.exercises);

    // Get gym contact number from environment variable or use a default
    const gymContactNumber =
      process.env.GYM_CONTACT_NUMBER || "+91 98765 43210";

    // Get member details
    const memberScanParams = {
      TableName: MEMBERS_TABLE,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": memberId,
      },
    };

    const memberResult = await docClient.send(
      new ScanCommand(memberScanParams)
    );
    const memberName =
      memberResult.Items && memberResult.Items.length > 0
        ? memberResult.Items[0].fullName
        : "Member";

    // Use child_process to execute the curl command
    const { exec } = require("child_process");

    // Get auth token from environment variable or use a default for development
    const authToken = process.env.TWILIO_AUTH_TOKEN || "your_auth_token_here";
    const twilioAccountId =
      process.env.TWILIO_ACCOUNT_SID || "your_account_sid_here";

    // Create the message body with full workout plan details
    const messageBody = `FITNESS ZONE - YOUR WORKOUT PLAN
    
📅 Date: ${formattedDate}

Dear ${memberName},

Here is your personalized workout plan:

${exerciseText}

Remember to warm up properly before starting your workout and cool down afterward.

For any questions, contact your trainer at ${gymContactNumber}.

FITNESS ZONE - Building Better Bodies`;

    console.log(messageBody);

    // Create the curl command
    const curlCommand = `curl 'https://api.twilio.com/2010-04-01/Accounts/${twilioAccountId}/Messages.json' -X POST --data-urlencode 'To=${formattedPhone}' --data-urlencode 'From=+12526594159' --data-urlencode 'Body=${messageBody}' -u ${twilioAccountId}:${authToken}`;

    // Execute the curl command
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing curl command: ${error}`);
        return res
          .status(500)
          .json({ error: "Failed to send WhatsApp message" });
      }

      console.log(`WhatsApp message sent successfully: ${stdout}`);
      res.json({ success: true, message: "Workout plan sent to WhatsApp" });
    });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    res.status(500).json({ error: "Failed to send WhatsApp message" });
  }
});

// Workout template endpoints
// Create/Save workout template
app.post("/api/workout-templates", async (req, res) => {
  try {
    const { name, description, exercises } = req.body;

    if (!name || !exercises || !exercises.length) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "name and exercises",
      });
    }

    const templateId = `workout_template_${Date.now()}`;

    const templateItem = {
      id: templateId,
      name,
      description: description || "",
      exercises: exercises || [],
      createdAt: new Date().toISOString(),
    };

    const putParams = {
      TableName: "workout_templates",
      Item: templateItem,
    };

    await docClient.send(new PutCommand(putParams));

    res.status(201).json({
      success: true,
      message: "Workout template saved successfully",
      template: templateItem,
    });
  } catch (error) {
    console.error("Error saving workout template:", error);
    res.status(500).json({ error: "Failed to save workout template" });
  }
});

// Get all workout templates
app.get("/api/workout-templates", async (req, res) => {
  try {
    const params = {
      TableName: "workout_templates",
    };

    const result = await docClient.send(new ScanCommand(params));

    // Sort by createdAt in descending order (newest first)
    const sortedTemplates = result.Items
      ? result.Items.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      : [];

    res.json({
      success: true,
      templates: sortedTemplates,
    });
  } catch (error) {
    console.error("Error getting workout templates:", error);
    res.status(500).json({ error: "Failed to get workout templates" });
  }
});

// Get workout template by ID
app.get("/api/workout-templates/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const params = {
      TableName: "workout_templates",
      Key: {
        id,
      },
    };

    const result = await docClient.send(new GetCommand(params));

    if (!result.Item) {
      return res.status(404).json({ error: "Workout template not found" });
    }

    res.json({
      success: true,
      template: result.Item,
    });
  } catch (error) {
    console.error("Error getting workout template:", error);
    res.status(500).json({ error: "Failed to get workout template" });
  }
});

// Delete workout template
app.delete("/api/workout-templates/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const params = {
      TableName: "workout_templates",
      Key: {
        id,
      },
    };

    await docClient.send(new DeleteCommand(params));

    res.json({
      success: true,
      message: "Workout template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting workout template:", error);
    res.status(500).json({ error: "Failed to delete workout template" });
  }
});

// Meal template endpoints
// Create/Save meal template
app.post("/api/meal-templates", async (req, res) => {
  try {
    const { name, description, breakfast, lunch, dinner, nutritionTotals } =
      req.body;

    if (!name || (!breakfast && !lunch && !dinner)) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "name and at least one meal (breakfast, lunch, or dinner)",
      });
    }

    const templateId = `template_${Date.now()}`;

    const templateItem = {
      id: templateId,
      name,
      description: description || "",
      breakfast: breakfast || [],
      lunch: lunch || [],
      dinner: dinner || [],
      nutritionTotals: nutritionTotals || {
        calories: 0,
        carbs: 0,
        fats: 0,
        proteins: 0,
        fibre: 0,
      },
      createdAt: new Date().toISOString(),
    };

    const putParams = {
      TableName: MEAL_TEMPLATES_TABLE,
      Item: templateItem,
    };

    await docClient.send(new PutCommand(putParams));

    res.status(201).json({
      success: true,
      message: "Meal template saved successfully",
      template: templateItem,
    });
  } catch (error) {
    console.error("Error saving meal template:", error);
    res.status(500).json({ error: "Failed to save meal template" });
  }
});

// Get all meal templates
app.get("/api/meal-templates", async (req, res) => {
  try {
    const params = {
      TableName: MEAL_TEMPLATES_TABLE,
    };

    const result = await docClient.send(new ScanCommand(params));

    // Sort by createdAt in descending order (newest first)
    const sortedTemplates = result.Items
      ? result.Items.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      : [];

    res.json({
      success: true,
      templates: sortedTemplates,
    });
  } catch (error) {
    console.error("Error getting meal templates:", error);
    res.status(500).json({ error: "Failed to get meal templates" });
  }
});

// Get meal template by ID
app.get("/api/meal-templates/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const params = {
      TableName: MEAL_TEMPLATES_TABLE,
      Key: {
        id,
      },
    };

    const result = await docClient.send(new GetCommand(params));

    if (!result.Item) {
      return res.status(404).json({ error: "Meal template not found" });
    }

    res.json({
      success: true,
      template: result.Item,
    });
  } catch (error) {
    console.error("Error getting meal template:", error);
    res.status(500).json({ error: "Failed to get meal template" });
  }
});

// Delete meal template
app.delete("/api/meal-templates/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const params = {
      TableName: MEAL_TEMPLATES_TABLE,
      Key: {
        id,
      },
    };

    await docClient.send(new DeleteCommand(params));

    res.json({
      success: true,
      message: "Meal template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting meal template:", error);
    res.status(500).json({ error: "Failed to delete meal template" });
  }
});

// Register a new gym owner
app.post("/api/auth/register", async (req, res) => {
  try {
    const { gymName, email, password } = req.body;

    if (!gymName || !email || !password) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "gymName, email, password",
      });
    }

    // Check if email already exists
    const scanParams = {
      TableName: GYM_OWNERS_TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
    };

    const scanResult = await docClient.send(new ScanCommand(scanParams));

    if (scanResult.Items && scanResult.Items.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Generate a unique gymId using UUID
    const gymId = `gym_${uuidv4()}`;

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create gym owner record
    const gymOwnerItem = {
      email,
      gymName,
      gymId,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    const putParams = {
      TableName: GYM_OWNERS_TABLE,
      Item: gymOwnerItem,
    };

    await docClient.send(new PutCommand(putParams));

    // Create and sign JWT token
    const token = jwt.sign(
      { email: email, gymName: gymName, gymId: gymId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: "Gym owner registered successfully",
      token,
      gymOwner: {
        email,
        gymName,
        gymId,
      },
    });
  } catch (error) {
    console.error("Error registering gym owner:", error);
    res.status(500).json({ error: "Failed to register gym owner" });
  }
});

// Login gym owner
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "email, password",
      });
    }

    // Get gym owner by email
    const params = {
      TableName: GYM_OWNERS_TABLE,
      Key: {
        email,
      },
    };

    const result = await docClient.send(new GetCommand(params));

    if (!result.Item) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const gymOwner = result.Item;

    // Validate password
    const validPassword = await bcrypt.compare(password, gymOwner.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if gymId exists, if not, generate one (for backward compatibility with existing accounts)
    if (!gymOwner.gymId) {
      gymOwner.gymId = `gym_${uuidv4()}`;

      // Update the gym owner record with the new gymId
      const updateParams = {
        TableName: GYM_OWNERS_TABLE,
        Item: gymOwner,
      };

      await docClient.send(new PutCommand(updateParams));
    }

    // Create and sign JWT token
    const token = jwt.sign(
      {
        email: gymOwner.email,
        gymName: gymOwner.gymName,
        gymId: gymOwner.gymId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      gymOwner: {
        email: gymOwner.email,
        gymName: gymOwner.gymName,
        gymId: gymOwner.gymId,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

// Verify authentication token
app.get("/api/auth/verify", authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// Simple hello endpoint
app.get("/api/hello", (req, res) => {
  res.json({ message: "hello" });
});

app.listen(port, () =>
  console.log(`Backend running on http://localhost:${port}`)
);
