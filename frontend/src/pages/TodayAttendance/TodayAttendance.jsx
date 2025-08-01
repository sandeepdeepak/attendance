import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import axios from "axios";
import "./TodayAttendance.css";
import { API_URL } from "../../config";

const TodayAttendance = ({ onBackClick }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTodayAttendance = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await axios.get(`${API_URL}/api/attendance-today`);
        console.log("API Response:", response.data);

        if (response.data && response.data.attendance) {
          setAttendanceData(response.data.attendance);
          console.log("Attendance Data:", response.data.attendance);
        }
      } catch (error) {
        console.error("Error fetching today's attendance:", error);
        setError("Failed to load attendance data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodayAttendance();
  }, []);

  // Format timestamp for display (YYYY-MM-DDThh:mm:ss.sssZ to hh:mm AM/PM)
  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A";

    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col items-center justify-center">
        <p className="text-xl">Loading attendance data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col items-center justify-center">
        <p className="text-red-500 text-xl">{error}</p>
        <button
          className="mt-4 bg-white text-black px-4 py-2 rounded-lg"
          onClick={onBackClick}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col px-4 py-8">
      {/* Header with back button and title */}
      <div className="w-full flex items-center mb-8">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={24} />
        </button>
        <div className="text-xl font-bold ml-2">Today's Attendance</div>
      </div>

      {/* Attendance table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-2">Member</th>
              <th className="text-left py-3 px-2">Check-In</th>
              <th className="text-left py-3 px-2">Check-Out</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.length > 0 ? (
              attendanceData.map((record) => (
                <tr key={record.memberId} className="border-b border-gray-800">
                  <td className="py-4 px-2 text-left">{record.fullName}</td>
                  <td className="py-4 px-2 text-left">
                    {formatTime(record.entry)}
                  </td>
                  <td className="py-4 px-2 text-left">
                    {formatTime(record.exit)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="py-4 text-center">
                  No attendance records for today
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TodayAttendance;
