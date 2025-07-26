import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaCalendarCheck,
  FaUsers,
  FaTimesCircle,
  FaUserPlus,
  FaPlus,
  FaRegUser,
} from "react-icons/fa";
import "./GymDashboard.css";
import { API_URL } from "../../config";

const GymDashboard = ({
  onFaceRecognitionClick,
  onAddMemberClick,
  onAllMembersClick,
}) => {
  const [dashboardStats, setDashboardStats] = useState({
    todaysAttendance: 0,
    membersInside: 0,
    missedCheckIns: 0,
    newJoinees: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dashboard statistics when component mounts
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_URL}/api/dashboard/stats`);
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
    const intervalId = setInterval(fetchDashboardStats, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Create stats array using real data
  const stats = [
    {
      icon: <FaCalendarCheck size={30} />,
      label: "Today's Attendance",
      value: dashboardStats.todaysAttendance,
    },
    {
      icon: <FaUsers size={30} />,
      label: "Members Inside",
      value: dashboardStats.membersInside,
    },
    {
      icon: <FaTimesCircle size={30} />,
      label: "Missed Check-ins",
      value: dashboardStats.missedCheckIns,
    },
    {
      icon: <FaUserPlus size={30} />,
      label: "New Joinees",
      value: dashboardStats.newJoinees,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-8 gap-2">
      <div>
        <h1 className="text-4xl font-bold mb-2"> Attendance</h1>
        <p className="text-gray-400 mb-6 text-lg">using face scan</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {isLoading ? (
          <div className="col-span-2 text-center py-8">
            <p className="text-xl">Loading statistics...</p>
          </div>
        ) : (
          stats.map((stat, index) => (
            <div
              key={index}
              className="bg-[#1A1A1A] rounded-2xl p-6 flex flex-col items-center justify-center w-40 h-40"
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
          className="flex items-center justify-center gap-2 bg-[#f9f9f9] px-6 py-3 rounded-2xl text-black w-60"
          onClick={onAddMemberClick}
        >
          <FaPlus /> Add Member
        </button>
        <button
          className="flex items-center justify-center gap-2 bg-[#f9f9f9] px-6 py-3 rounded-2xl text-black w-60"
          onClick={onAllMembersClick}
        >
          <FaUsers /> All Members
        </button>
        <button
          className="flex items-center justify-center gap-2 bg-[#f9f9f9] px-6 py-3 rounded-2xl text-black w-60"
          onClick={onFaceRecognitionClick}
        >
          <FaRegUser /> Go to face scan
        </button>
      </div>
    </div>
  );
};

export default GymDashboard;
