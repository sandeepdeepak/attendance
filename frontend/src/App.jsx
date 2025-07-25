import { useState, useEffect } from "react";
import "./App.css";
import GymDashboard from "./pages/GymDashboard/GymDashboard";
import FaceRecognition from "./pages/FaceRecognition/FaceRecognition";
import AddMember from "./pages/AddMember/AddMember";
import AllMembers from "./pages/AllMembers/AllMembers";
import MemberDetails from "./pages/MemberDetails/MemberDetails";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [faceRecognitionKey, setFaceRecognitionKey] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState(null);

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

  const handleAllMembersClick = () => {
    setCurrentPage("allMembers");
  };

  const handleBackClick = () => {
    if (currentPage === "memberDetails") {
      setCurrentPage("allMembers");
    } else {
      setCurrentPage("dashboard");
    }
  };

  const handleMemberClick = (memberId) => {
    setSelectedMemberId(memberId);
    setCurrentPage("memberDetails");
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <GymDashboard
            onFaceRecognitionClick={handleFaceRecognitionClick}
            onAddMemberClick={handleAddMemberClick}
            onAllMembersClick={handleAllMembersClick}
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
      case "allMembers":
        return (
          <AllMembers
            onBackClick={handleBackClick}
            onMemberClick={handleMemberClick}
          />
        );
      case "memberDetails":
        return (
          <MemberDetails
            memberId={selectedMemberId}
            onBackClick={handleBackClick}
          />
        );
      default:
        return (
          <GymDashboard
            onFaceRecognitionClick={handleFaceRecognitionClick}
            onAddMemberClick={handleAddMemberClick}
            onAllMembersClick={handleAllMembersClick}
          />
        );
    }
  };

  return <>{renderCurrentPage()}</>;
}

export default App;
