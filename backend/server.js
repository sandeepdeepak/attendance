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

const app = express();
const port = 7777;
const rekClient = new RekognitionClient({ region: "us-east-1" });
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      res.json({
        match: true,
        similarity: data.FaceMatches[0].Similarity,
        id: data.FaceMatches[0].Face.ExternalImageId,
      });
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

app.listen(port, () =>
  console.log(`Backend running on http://localhost:${port}`)
);
