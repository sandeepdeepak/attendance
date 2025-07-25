// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
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

// DynamoDB table names
const MEMBERS_TABLE = "members";
const ATTENDANCE_TABLE = "attendance";

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
              startDate: memberDetails.startDate,
              createdAt: memberDetails.createdAt,
            },
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
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const todayDate = getTodayDateString();

    // 1. Get today's attendance count (unique members who checked in today)
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

    // Count unique members who attended today
    const uniqueAttendees = new Set();
    if (todayAttendanceResult.Items) {
      todayAttendanceResult.Items.forEach((item) => {
        uniqueAttendees.add(item.memberId);
      });
    }
    const todaysAttendance = uniqueAttendees.size;

    // 2. Get members currently inside (entered but not exited)
    const membersInside = new Set();

    // Get all members
    const allMembersResult = await docClient.send(
      new ScanCommand({
        TableName: MEMBERS_TABLE,
      })
    );

    const allMembers = allMembersResult.Items || [];

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
        }
      }
    }

    // 3. Get missed check-ins (members who didn't check in today)
    const missedCheckIns = allMembers.length - uniqueAttendees.size;

    // 4. Get new members (joined in the last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();

    let newJoineesCount = 0;
    for (const member of allMembers) {
      if (member.createdAt && member.createdAt > oneWeekAgoStr) {
        newJoineesCount++;
      }
    }

    res.json({
      todaysAttendance,
      membersInside: membersInside.size,
      missedCheckIns,
      newJoinees: newJoineesCount,
    });
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    res.status(500).json({ error: "Failed to get dashboard statistics" });
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
app.post("/api/members", upload.single("faceImage"), async (req, res) => {
  try {
    const { fullName, phoneNumber, startDate } = req.body;
    const faceImage = req.file?.buffer;

    if (!fullName || !phoneNumber || !startDate || !faceImage) {
      return res.status(400).json({
        error: "Missing required fields",
        required: "fullName, phoneNumber, startDate, faceImage",
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

    // Then, save the member data to DynamoDB
    const memberItem = {
      id: memberId,
      fullName,
      phoneNumber,
      startDate,
      faceId,
      createdAt: new Date().toISOString(),
      active: true,
    };

    const putParams = {
      TableName: MEMBERS_TABLE,
      Item: memberItem,
    };

    await docClient.send(new PutCommand(putParams));

    res.status(201).json({
      message: "Member added successfully",
      member: memberItem,
    });
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ error: "Failed to add member" });
  }
});

// Get all members
app.get("/api/members", async (req, res) => {
  try {
    const params = {
      TableName: MEMBERS_TABLE,
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
app.get("/api/members/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Use scan with filter expression instead of GetCommand
    // because we need to query by just the id (partition key)
    // but our table has a composite key (id + phoneNumber)
    const scanParams = {
      TableName: MEMBERS_TABLE,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id,
      },
    };

    const result = await docClient.send(new ScanCommand(scanParams));

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.json({
      member: result.Items[0],
    });
  } catch (error) {
    console.error("Error getting member:", error);
    res.status(500).json({ error: "Failed to get member" });
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

// Simple hello endpoint
app.get("/api/hello", (req, res) => {
  res.json({ message: "hello" });
});

app.listen(port, () =>
  console.log(`Backend running on http://localhost:${port}`)
);
