import React, { useState } from "react";
import axios from "axios";
import WebcamCapture from "./WebcamCapture";

function App() {
  const [mode, setMode] = useState("compare"); // includes "webcam"
  const [image, setImage] = useState(null);
  const [source, setSource] = useState(null);
  const [target, setTarget] = useState(null);
  const [collection, setCollection] = useState("my-face-collection");
  const [externalId, setExternalId] = useState("");
  const [result, setResult] = useState(null);

  const handleCapture = (img) => {
    if (mode === "webcam" || mode === "search") {
      setImage(img);
    }
  };

  const handleSubmit = async () => {
    const form = new FormData();
    let res;
    switch (mode) {
      case "compare":
        form.append("source", source);
        form.append("target", target);
        res = await axios.post("http://localhost:7777/api/compare", form);
        break;
      case "search":
        const searchImgBlob = await (await fetch(image)).blob(); // image is a base64 data URL
        const searchImgFile = new File([searchImgBlob], "capture.jpg", {
          type: "image/jpeg",
        });
        form.append("image", searchImgFile);
        form.append("collectionId", collection);
        res = await axios.post("http://localhost:7777/api/search", form);
        break;
      case "index":
        form.append("image", image || target);
        form.append("collectionId", collection);
        form.append("externalId", externalId);
        res = await axios.post("http://localhost:7777/api/index-face", form);
        break;
      case "webcam":
        const blob = await (await fetch(image)).blob(); // image is a base64 data URL
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        form.append("image", file);
        form.append("collectionId", collection);
        form.append("externalId", externalId);
        res = await axios.post("http://localhost:7777/api/index-face", form);
        break;
      default:
        return;
    }
    setResult(res.data);
  };

  return (
    <div>
      <h2>Face Registry App</h2>
      <div>
        {["compare", "search", "index", "webcam"].map((m) => (
          <label key={m} style={{ marginRight: 10 }}>
            <input
              type="radio"
              value={m}
              checked={mode === m}
              onChange={(e) => {
                setMode(e.target.value);
                setResult(null);
                setImage(null);
              }}
            />
            {m}
          </label>
        ))}
      </div>

      {(mode === "webcam" || mode === "search") && (
        <>
          <p>Capture face with webcam:</p>
          <WebcamCapture onCapture={handleCapture} />
        </>
      )}

      {mode === "compare" && (
        <>
          <input type="file" onChange={(e) => setSource(e.target.files[0])} />
          <input type="file" onChange={(e) => setTarget(e.target.files[0])} />
        </>
      )}

      {(mode === "search" || mode === "index" || mode === "webcam") && (
        <>
          <input
            placeholder="Collection ID"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
          />
        </>
      )}

      {(mode === "index" || mode === "webcam") && (
        <input
          placeholder="External ID"
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={
          (mode === "compare" && (!source || !target)) ||
          ((mode === "search" || mode === "index" || mode === "webcam") &&
            (!collection || (!image && !target))) ||
          ((mode === "index" || mode === "webcam") && !externalId)
        }
      >
        Submit
      </button>

      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default App;
