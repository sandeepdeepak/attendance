import { useState, useEffect } from "react";
import "./App.css";
import GymDashboard from "./pages/GymDashboard/GymDashboard";
import FaceRecognition from "./pages/FaceRecognition/FaceRecognition";
import AddMember from "./pages/AddMember/AddMember";
import AllMembers from "./pages/AllMembers/AllMembers";
import MemberDetails from "./pages/MemberDetails/MemberDetails";
import TodayAttendance from "./pages/TodayAttendance/TodayAttendance";
import MemberPlan from "./pages/MemberPlan/MemberPlan";
import Login from "./pages/Login/Login";
import { API_URL } from "./config";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [faceRecognitionKey, setFaceRecognitionKey] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [previousPage, setPreviousPage] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState(null);
  const [membersData, setMembersData] = useState(null);
  const [membersListTitle, setMembersListTitle] = useState("All members");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gymOwner, setGymOwner] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);

  // Check for existing auth token on load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("authToken");
      const storedGymOwner = localStorage.getItem("gymOwner");

      if (token && storedGymOwner) {
        try {
          // Verify token with backend
          const response = await fetch(`${API_URL}/api/auth/verify`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            setIsAuthenticated(true);
            setGymOwner(JSON.parse(storedGymOwner));
          } else {
            // Token invalid, clear storage
            localStorage.removeItem("authToken");
            localStorage.removeItem("gymOwner");
          }
        } catch (error) {
          console.error("Auth verification error:", error);
        }
      }

      setIsVerifying(false);
    };

    checkAuth();
  }, []);

  // Reset the key when navigating to face recognition to force remount
  useEffect(() => {
    if (currentPage === "faceRecognition") {
      setFaceRecognitionKey((prevKey) => prevKey + 1);
    }
  }, [currentPage]);

  const handleLoginSuccess = (owner) => {
    setIsAuthenticated(true);
    setGymOwner(owner);
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("gymOwner");
    setIsAuthenticated(false);
    setGymOwner(null);
  };

  const handleFaceRecognitionClick = () => {
    setCurrentPage("faceRecognition");
  };

  const handleAddMemberClick = () => {
    setCurrentPage("addMember");
  };

  const handleAllMembersClick = (membersData = null, title = "All members") => {
    setMembersData(membersData);
    setMembersListTitle(title);
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
            onLogout={handleLogout}
            gymOwner={gymOwner}
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
            filteredMembers={membersData}
            title={membersListTitle}
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
            onLogout={handleLogout}
            gymOwner={gymOwner}
          />
        );
    }
  };

  // Show loading state while verifying authentication
  if (isVerifying) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
          color: "#666",
        }}
      >
        Loading...
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main app if authenticated
  return <>{renderCurrentPage()}</>;
}

export default App;
