import { useState } from "react";
import "./App.css";
import GymDashboard from "./pages/GymDashboard/GymDashboard";
import FaceRecognition from "./pages/FaceRecognition/FaceRecognition";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  return (
    <>
      {currentPage === "dashboard" ? (
        <GymDashboard
          onFaceRecognitionClick={() => setCurrentPage("faceRecognition")}
        />
      ) : (
        <FaceRecognition onBackClick={() => setCurrentPage("dashboard")} />
      )}
    </>
  );
}

export default App;
