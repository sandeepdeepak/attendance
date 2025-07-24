import { useState, useEffect } from "react";
import "./App.css";
import GymDashboard from "./pages/GymDashboard/GymDashboard";
import FaceRecognition from "./pages/FaceRecognition/FaceRecognition";
import AddMember from "./pages/AddMember/AddMember";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [faceRecognitionKey, setFaceRecognitionKey] = useState(0);

  // Reset the key when navigating to face recognition to force remount
  useEffect(() => {
    if (currentPage === "faceRecognition") {
      setFaceRecognitionKey((prevKey) => prevKey + 1);
    }
  }, [currentPage]);

  const handleFaceRecognitionClick = () => {
    setCurrentPage("faceRecognition");
  };

  const handleAddMemberClick = () => {
    setCurrentPage("addMember");
  };

  const handleBackClick = () => {
    setCurrentPage("dashboard");
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <GymDashboard
            onFaceRecognitionClick={handleFaceRecognitionClick}
            onAddMemberClick={handleAddMemberClick}
          />
        );
      case "faceRecognition":
        return (
          <FaceRecognition
            key={faceRecognitionKey}
            onBackClick={handleBackClick}
          />
        );
      case "addMember":
        return <AddMember onBackClick={handleBackClick} />;
      default:
        return (
          <GymDashboard onFaceRecognitionClick={handleFaceRecognitionClick} />
        );
    }
  };

  return <>{renderCurrentPage()}</>;
}

export default App;
