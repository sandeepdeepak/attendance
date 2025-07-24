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
} = require("@aws-sdk/lib-dynamodb");

const app = express();
const port = 7777;
const region = "us-east-1";
const rekClient = new RekognitionClient({ region });
const dynamoClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const upload = multer({ storage: multer.memoryStorage() });

// DynamoDB table name
const MEMBERS_TABLE = "members";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize DynamoDB table if it doesn't exist
async function initializeDynamoDB() {
  try {
    // Check if table exists
    const listTablesResponse = await dynamoClient.send(
      new ListTablesCommand({})
    );
    const tableExists = listTablesResponse.TableNames.includes(MEMBERS_TABLE);

    if (!tableExists) {
      // Create the table if it doesn't exist
      const createTableParams = {
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

      await dynamoClient.send(new CreateTableCommand(createTableParams));
      console.log(`Created table: ${MEMBERS_TABLE}`);
    } else {
      console.log(`Table ${MEMBERS_TABLE} already exists`);
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

          // Return member details along with match information
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

    const params = {
      TableName: MEMBERS_TABLE,
      Key: { id },
    };

    const result = await docClient.send(new GetCommand(params));

    if (!result.Item) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.json({
      member: result.Item,
    });
  } catch (error) {
    console.error("Error getting member:", error);
    res.status(500).json({ error: "Failed to get member" });
  }
});

app.listen(port, () =>
  console.log(`Backend running on http://localhost:${port}`)
);
