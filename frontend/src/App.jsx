import { useState, useEffect } from "react";
import "./App.css";
import GymDashboard from "./pages/GymDashboard/GymDashboard";
import FaceRecognition from "./pages/FaceRecognition/FaceRecognition";
import AddMember from "./pages/AddMember/AddMember";
import AllMembers from "./pages/AllMembers/AllMembers";
import MemberDetails from "./pages/MemberDetails/MemberDetails";
import TodayAttendance from "./pages/TodayAttendance/TodayAttendance";
import AttendanceDetails from "./pages/AttendanceDetails/AttendanceDetails";
import MemberPlan from "./pages/MemberPlan/MemberPlan";
import MemberProgress from "./pages/MemberProgress/MemberProgress";
import Login from "./pages/Login/Login";
import HomePage from "./pages/HomePage/HomePage";
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
  const [showLogin, setShowLogin] = useState(false);

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
    } else if (currentPage === "memberProgress") {
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

  const handleAttendanceDetailsClick = () => {
    setPreviousPage(currentPage);
    setCurrentPage("attendanceDetails");
  };

  const handleMemberPlanClick = (memberId, date) => {
    setSelectedMemberId(memberId);
    setSelectedDate(date);
    setCurrentPage("memberPlan");
  };

  const handleMemberProgressClick = (memberId) => {
    setSelectedMemberId(memberId);
    setCurrentPage("memberProgress");
  };

  // Handle navigation from face recognition to today's member plan
  const handleTodayMemberPlanClick = (memberId) => {
    setSelectedMemberId(memberId);
    // Set today's date
    setSelectedDate(new Date().toISOString().split("T")[0]);
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
            onAttendanceDetailsClick={handleAttendanceDetailsClick}
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
            onTodayMemberPlanClick={handleTodayMemberPlanClick}
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
            onMemberProgressClick={handleMemberProgressClick}
          />
        );
      case "todayAttendance":
        return <TodayAttendance onBackClick={handleBackClick} />;

      case "attendanceDetails":
        return <AttendanceDetails onBackClick={handleBackClick} />;

      case "memberPlan":
        return (
          <MemberPlan
            memberId={selectedMemberId}
            selectedDate={selectedDate}
            onBackClick={handleBackClick}
          />
        );

      case "memberProgress":
        return (
          <MemberProgress
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
            onMemberClick={handleMemberClick}
            onTodayAttendanceClick={handleTodayAttendanceClick}
            onAttendanceDetailsClick={handleAttendanceDetailsClick}
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

  // Handle login button click from home page
  const handleLoginClick = () => {
    setShowLogin(true);
  };

  // Handle back to home from login page
  const handleBackToHome = () => {
    setShowLogin(false);
  };

  // Show face recognition, member details, login, or home page if not authenticated
  if (!isAuthenticated) {
    if (currentPage === "faceRecognition") {
      return (
        <FaceRecognition
          key={faceRecognitionKey}
          onBackClick={() => setCurrentPage("home")}
          onMemberClick={handleMemberClick}
          onTodayMemberPlanClick={handleTodayMemberPlanClick}
        />
      );
    } else if (currentPage === "memberDetails") {
      return (
        <MemberDetails
          memberId={selectedMemberId}
          onBackClick={() => setCurrentPage("faceRecognition")}
          onMemberPlanClick={handleMemberPlanClick}
          onMemberProgressClick={handleMemberProgressClick}
          fromFaceRecognition={true}
        />
      );
    } else if (currentPage === "memberPlan") {
      return (
        <MemberPlan
          memberId={selectedMemberId}
          selectedDate={selectedDate}
          onBackClick={() => setCurrentPage("memberDetails")}
          fromFaceRecognition={true}
        />
      );
    } else if (currentPage === "memberProgress") {
      return (
        <MemberProgress
          memberId={selectedMemberId}
          onBackClick={() => setCurrentPage("memberDetails")}
          fromFaceRecognition={true}
        />
      );
    } else if (showLogin) {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onBackClick={handleBackToHome}
        />
      );
    } else {
      return (
        <HomePage
          onFaceRecognitionClick={handleFaceRecognitionClick}
          onLoginClick={handleLoginClick}
        />
      );
    }
  }

  // Show main app if authenticated
  return <>{renderCurrentPage()}</>;
}

export default App;
