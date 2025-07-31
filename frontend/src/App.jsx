import { useState, useEffect } from "react";
import "./App.css";
import GymDashboard from "./pages/GymDashboard/GymDashboard";
import FaceRecognition from "./pages/FaceRecognition/FaceRecognition";
import AddMember from "./pages/AddMember/AddMember";
import AllMembers from "./pages/AllMembers/AllMembers";
import MemberDetails from "./pages/MemberDetails/MemberDetails";
import TodayAttendance from "./pages/TodayAttendance/TodayAttendance";
import MemberPlan from "./pages/MemberPlan/MemberPlan";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [faceRecognitionKey, setFaceRecognitionKey] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [previousPage, setPreviousPage] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState(null);

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
    } else if (currentPage === "todayAttendance") {
      setCurrentPage(previousPage);
    } else if (currentPage === "memberPlan") {
      setCurrentPage("memberDetails");
    } else {
      setCurrentPage("dashboard");
    }
  };

  const handleMemberClick = (memberId) => {
    setSelectedMemberId(memberId);
    setCurrentPage("memberDetails");
  };

  const handleTodayAttendanceClick = () => {
    setPreviousPage(currentPage);
    setCurrentPage("todayAttendance");
  };

  const handleMemberPlanClick = (memberId, date) => {
    setSelectedMemberId(memberId);
    setSelectedDate(date);
    setCurrentPage("memberPlan");
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <GymDashboard
            onFaceRecognitionClick={handleFaceRecognitionClick}
            onAddMemberClick={handleAddMemberClick}
            onAllMembersClick={handleAllMembersClick}
            onMemberClick={handleMemberClick}
            onTodayAttendanceClick={handleTodayAttendanceClick}
          />
        );
      case "faceRecognition":
        return (
          <FaceRecognition
            key={faceRecognitionKey}
            onBackClick={handleBackClick}
            onMemberClick={handleMemberClick}
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
            onMemberPlanClick={handleMemberPlanClick}
          />
        );
      case "todayAttendance":
        return <TodayAttendance onBackClick={handleBackClick} />;

      case "memberPlan":
        return (
          <MemberPlan
            memberId={selectedMemberId}
            selectedDate={selectedDate}
            onBackClick={handleBackClick}
          />
        );

      default:
        return (
          <GymDashboard
            onFaceRecognitionClick={handleFaceRecognitionClick}
            onAddMemberClick={handleAddMemberClick}
            onAllMembersClick={handleAllMembersClick}
            onMemberClick={handleMemberClick}
            onTodayAttendanceClick={handleTodayAttendanceClick}
          />
        );
    }
  };

  return <>{renderCurrentPage()}</>;
}

export default App;
