import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  FaCalendarCheck,
  FaUsers,
  FaTimesCircle,
  FaUserPlus,
  FaPlus,
  FaRegUser,
  FaHeadset,
  FaUser,
  FaBell,
  FaUpload,
  FaDownload,
  FaSignOutAlt,
  FaCalendarAlt,
  FaCog,
} from "react-icons/fa";
import "./GymDashboard.css";
import { API_URL } from "../../config";

const GymDashboard = ({
  onFaceRecognitionClick,
  onAddMemberClick,
  onAllMembersClick,
  onMemberClick,
  onTodayAttendanceClick,
  onAttendanceDetailsClick,
  onAdminClick,
  onLogout,
  gymOwner,
  isAdmin,
}) => {
  const [dashboardStats, setDashboardStats] = useState({
    todaysAttendance: 0,
    membersInside: 0,
    missedCheckIns: 0,
    newJoinees: 0,
  });
  const [membersInsideData, setMembersInsideData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSupportCard, setShowSupportCard] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [expiringMembers, setExpiringMembers] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [syncingToExcel, setSyncingToExcel] = useState(false);
  const [syncingFromExcel, setSyncingFromExcel] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  const supportCardRef = useRef(null);
  const notificationCardRef = useRef(null);

  // Close cards when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        supportCardRef.current &&
        !supportCardRef.current.contains(event.target) &&
        event.target.id !== "support-icon"
      ) {
        setShowSupportCard(false);
      }

      if (
        notificationCardRef.current &&
        !notificationCardRef.current.contains(event.target) &&
        event.target.id !== "notification-icon"
      ) {
        setShowNotifications(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch expiring memberships
  useEffect(() => {
    const fetchExpiringMemberships = async () => {
      try {
        // Get auth token from localStorage
        const authToken = localStorage.getItem("authToken");
        if (!authToken) {
          console.error("Authentication token not found");
          return;
        }

        const response = await axios.get(
          `${API_URL}/api/members-expiring?days=1`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        if (response.data && response.data.expiringMembers) {
          setExpiringMembers(response.data.expiringMembers);
          setNotificationCount(response.data.count);
        }
      } catch (error) {
        console.error("Error fetching expiring memberships:", error);
      }
    };

    fetchExpiringMemberships();

    // Refresh expiring memberships every 5 minutes
    const intervalId = setInterval(fetchExpiringMemberships, 300000);

    return () => clearInterval(intervalId);
  }, []);

  // Fetch dashboard statistics when component mounts
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoading(true);

        // Get auth token from localStorage
        const authToken = localStorage.getItem("authToken");
        if (!authToken) {
          console.error("Authentication token not found");
          return;
        }

        const response = await axios.get(`${API_URL}/api/dashboard/stats`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (response.data) {
          setDashboardStats(response.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();

    // Refresh stats every 30 seconds
    const intervalId = setInterval(fetchDashboardStats, 120 * 1000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Create stats array using real data
  const stats = [
    {
      icon: <FaCalendarCheck size={30} />,
      label: "Today's Attendance",
      value: dashboardStats.todaysAttendance,
      onClick: onTodayAttendanceClick,
    },
    {
      icon: <FaUsers size={30} />,
      label: "Members Inside",
      value: dashboardStats.membersInside,
      onClick: () => {
        onAllMembersClick(
          dashboardStats.membersInsideDetails || [],
          "Members Inside"
        );
      },
    },
    {
      icon: <FaTimesCircle size={30} />,
      label: "Absent Members",
      value: dashboardStats.missedCheckIns,
      onClick: () => {
        onAllMembersClick(
          dashboardStats.absentMembersDetails || [],
          "Absent Members"
        );
      },
    },
    {
      icon: <FaUserPlus size={30} />,
      label: "New Joinees",
      value: dashboardStats.newJoinees,
      onClick: () => {
        onAllMembersClick(
          dashboardStats.newJoineesDetails || [],
          "New Joinees"
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col items-center px-4 py-8 gap-2 relative">
      {/* Gym Owner Name */}
      <div className="absolute top-4 left-4 flex items-center">
        <div className="bg-[#1e293b] rounded-full p-2 mr-2">
          <FaUser size={16} className="text-white" />
        </div>
        <div className="text-white text-sm">
          {gymOwner?.gymName || "Gym Owner"}
        </div>
      </div>

      {/* Notification and Support Icons */}
      <div className="absolute top-4 right-4 flex items-center space-x-3">
        {/* Logout Icon */}
        <div className="relative">
          <div
            id="logout-icon"
            className="text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
            onClick={onLogout}
            title="Logout"
          >
            <FaSignOutAlt size={16} />
          </div>
        </div>
        {/* Support Icon */}
        <div className="relative">
          <div
            id="support-icon"
            className="text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
            onClick={() => setShowSupportCard(!showSupportCard)}
            title="Support"
          >
            <FaHeadset size={16} />
          </div>

          {/* Support Card */}
          {showSupportCard && (
            <div
              ref={supportCardRef}
              className="absolute top-7 right-0 bg-gray-800 rounded-lg shadow-lg p-4 w-64 z-10"
            >
              <div className="flex items-center mb-3">
                <div className="bg-[#1e293b] rounded-full p-2 mr-3">
                  <FaUser size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-left">Sandeep</h3>
                  <div className="flex items-center text-gray-300 text-sm text-left">
                    <span>8056759212</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                Contact for technical support
              </p>
            </div>
          )}
        </div>
        {/* Upload to Excel Icon */}
        <div className="relative">
          <div
            id="upload-icon"
            className={`text-white p-1 rounded-full hover:bg-gray-800 transition-colors ${
              syncingToExcel ? "animate-pulse text-green-400" : ""
            }`}
            onClick={async () => {
              if (syncingToExcel) return;

              try {
                setSyncingToExcel(true);
                setStatusMessage({ text: "", type: "" });

                // Get auth token from localStorage
                const authToken = localStorage.getItem("authToken");
                if (!authToken) {
                  throw new Error("Authentication token not found");
                }

                const response = await axios.get(
                  `${API_URL}/api/sync-to-excel`,
                  {
                    headers: {
                      Authorization: `Bearer ${authToken}`,
                    },
                  }
                );
                if (response.data && response.data.success) {
                  setStatusMessage({
                    text: `Successfully synced ${response.data.count} members to Excel!`,
                    type: "success",
                  });

                  // Clear status message after 5 seconds
                  setTimeout(() => {
                    setStatusMessage({ text: "", type: "" });
                  }, 5000);
                }
              } catch (error) {
                console.error("Error syncing to Excel:", error);
                setStatusMessage({
                  text: "Failed to sync data to Excel. Please try again.",
                  type: "error",
                });

                // Clear status message after 5 seconds
                setTimeout(() => {
                  setStatusMessage({ text: "", type: "" });
                }, 5000);
              } finally {
                setSyncingToExcel(false);
              }
            }}
            title="Sync to Excel"
          >
            <FaUpload size={16} />
          </div>
        </div>

        {/* Download from Excel Icon */}
        <div className="relative">
          <div
            id="download-icon"
            className={`text-white p-1 rounded-full hover:bg-gray-800 transition-colors ${
              syncingFromExcel ? "animate-pulse text-blue-400" : ""
            }`}
            onClick={async () => {
              if (syncingFromExcel) return;

              try {
                setSyncingFromExcel(true);
                setStatusMessage({ text: "", type: "" });

                // Get auth token from localStorage
                const authToken = localStorage.getItem("authToken");
                if (!authToken) {
                  throw new Error("Authentication token not found");
                }

                const response = await axios.get(
                  `${API_URL}/api/sync-from-excel`,
                  {
                    headers: {
                      Authorization: `Bearer ${authToken}`,
                    },
                  }
                );
                if (response.data && response.data.success) {
                  const summary = response.data.summary;
                  setStatusMessage({
                    text: `Excel sync complete! Added: ${summary.added} | Updated: ${summary.updated} | Unchanged: ${summary.unchanged} | Errors: ${summary.errors}`,
                    type: "success",
                  });

                  // Clear status message after 5 seconds
                  setTimeout(() => {
                    setStatusMessage({ text: "", type: "" });
                  }, 5000);
                }
              } catch (error) {
                console.error("Error syncing from Excel:", error);
                setStatusMessage({
                  text: "Failed to sync data from Excel. Please try again.",
                  type: "error",
                });

                // Clear status message after 5 seconds
                setTimeout(() => {
                  setStatusMessage({ text: "", type: "" });
                }, 5000);
              } finally {
                setSyncingFromExcel(false);
              }
            }}
            title="Sync from Excel"
          >
            <FaDownload size={16} />
          </div>
        </div>

        {/* Notification Icon */}
        <div className="relative">
          <div
            id="notification-icon"
            className="text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <FaBell size={16} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </div>

          {/* Notification Card */}
          {showNotifications && (
            <div
              ref={notificationCardRef}
              className="absolute top-7 right-0 bg-gray-800 rounded-lg shadow-lg p-4 w-75 z-10"
            >
              <h3 className="font-bold text-white mb-3 text-left ms-2">
                Expiring Memberships
              </h3>
              {expiringMembers.length > 0 ? (
                <div className="max-h-60 overflow-y-auto">
                  {expiringMembers.map((item) => (
                    <div
                      key={item.member.id}
                      className="border-b border-gray-700 py-2 last:border-0 cursor-pointer hover:bg-[#1e293b] rounded px-2"
                      onClick={() => {
                        if (onMemberClick) {
                          onMemberClick(item.member.id);
                          setShowNotifications(false);
                        }
                      }}
                    >
                      <div className="flex items-center text-left">
                        <div className="bg-[#1e293b] rounded-full p-2 mr-3">
                          <FaUser size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {item.member.fullName}
                          </p>
                          <p className="text-xs text-gray-400">
                            Expires tomorrow ({item.membership.planType})
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  No memberships expiring soon
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status message */}
      {statusMessage.text && (
        <div
          className={`mb-2 mt-4 p-4 rounded-lg text-center w-full max-w-md ${
            statusMessage.type === "success"
              ? "bg-green-800 text-white"
              : "bg-red-800 text-white"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* <div>
        <h1 className="text-4xl font-bold mb-2 mt-4"> SD GYM</h1>
        <p className="text-gray-400 mb-6 text-lg">SD GYM</p>
      </div> */}

      <div className="grid grid-cols-2 gap-4 mb-6 mt-20">
        {isLoading ? (
          <div className="col-span-2 text-center py-8">
            <p className="text-xl">Loading statistics...</p>
          </div>
        ) : (
          stats.map((stat, index) => (
            <div
              key={index}
              className={`bg-[#123347] rounded-2xl p-6 flex flex-col items-center justify-center w-40 h-40 ${
                stat.onClick ? "cursor-pointer hover:bg-[#252525]" : ""
              }`}
              onClick={stat.onClick}
            >
              <div className="text-gray-300 mb-2">{stat.icon}</div>
              <p className="text-center text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-semibold">{stat.value}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col bg items-center gap-4 mt-5">
        <button
          className="flex items-center justify-center gap-2 bg-[#024a72] px-6 py-3 rounded-2xl text-white w-60"
          onClick={onAddMemberClick}
        >
          <FaPlus /> Add Member
        </button>
        <button
          className="flex items-center justify-center gap-2 bg-[#024a72] px-6 py-3 rounded-2xl text-white w-60"
          onClick={() => onAllMembersClick(null)}
        >
          <FaUsers /> All Members
        </button>
        <button
          className="flex items-center justify-center gap-2 bg-[#024a72] px-6 py-3 rounded-2xl text-white w-60"
          onClick={onAttendanceDetailsClick}
        >
          <FaCalendarAlt /> Attendance Details
        </button>
        <button
          className="flex items-center justify-center gap-2 bg-[#024a72] px-6 py-3 rounded-2xl text-white w-60"
          onClick={onFaceRecognitionClick}
        >
          <FaRegUser /> Go to face scan
        </button>
        {isAdmin && (
          <button
            className="flex items-center justify-center gap-2 bg-[#b91c1c] px-6 py-3 rounded-2xl text-white w-60"
            onClick={onAdminClick}
          >
            <FaCog /> Admin Panel
          </button>
        )}
      </div>
    </div>
  );
};

export default GymDashboard;
