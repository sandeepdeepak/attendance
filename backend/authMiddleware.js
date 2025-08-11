const jwt = require("jsonwebtoken");

// JWT Secret Key - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

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

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN format

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);

    // Check if the user is an admin
    const {
      DynamoDBDocumentClient,
      GetCommand,
    } = require("@aws-sdk/lib-dynamodb");
    const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

    // Initialize DynamoDB client
    const region = "us-east-1";
    const dynamoClient = new DynamoDBClient({ region });
    const docClient = DynamoDBDocumentClient.from(dynamoClient);

    const GYM_OWNERS_TABLE = "gym_owners";

    const params = {
      TableName: GYM_OWNERS_TABLE,
      Key: {
        email: verified.email,
      },
    };

    const result = await docClient.send(new GetCommand(params));

    if (!result.Item || !result.Item.isAdmin) {
      return res
        .status(403)
        .json({ error: "Access denied. Admin privileges required." });
    }

    req.user = verified;
    next();
  } catch (error) {
    console.error("Admin authentication error:", error);
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  JWT_SECRET,
};
