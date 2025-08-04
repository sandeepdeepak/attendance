import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaCalendarAlt } from "react-icons/fa";
import axios from "axios";
import "./AttendanceDetails.css";
import { API_URL } from "../../config";

const AttendanceDetails = ({ onBackClick }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  ); // Default to current month (YYYY-MM)

  useEffect(() => {
    const fetchAttendanceDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get auth token from localStorage
        const authToken = localStorage.getItem("authToken");
        if (!authToken) {
          throw new Error("Authentication token not found");
        }

        // Log the selected month for debugging
        console.log("Selected Month:", selectedMonth);

        // Create the API URL
        const apiUrl = `${API_URL}/api/attendance-monthly?month=${selectedMonth}`;
        console.log("API URL:", apiUrl);

        const response = await axios.get(apiUrl, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (response.data && response.data.attendance) {
          setAttendanceData(response.data.attendance);
        }
      } catch (error) {
        console.error("Error fetching attendance details:", error);
        setError("Failed to load attendance data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceDetails();
  }, [selectedMonth]);

  // Format date for display (YYYY-MM-DD to DD MMM YYYY)
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Get available months for the dropdown (last 12 months)
  const getAvailableMonths = () => {
    const months = [];
    const currentDate = new Date();

    console.log("Current date for month calculation:", currentDate);

    for (let i = 0; i < 12; i++) {
      // Create a new date for each month by properly setting the month
      // This ensures correct month wrapping (e.g., January - 1 = December of previous year)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() - i;

      // Create the date with adjusted year if month is negative
      const adjustedYear = year + Math.floor(month / 12);
      const adjustedMonth = ((month % 12) + 12) % 12; // Ensure positive month value

      const date = new Date(adjustedYear, adjustedMonth, 1);

      // Format as YYYY-MM
      const monthStr = (adjustedMonth + 1).toString().padStart(2, "0");
      const yearStr = adjustedYear.toString();
      const monthValue = `${yearStr}-${monthStr}`;

      console.log(
        `Month ${i}: year=${adjustedYear}, month=${adjustedMonth}, value=${monthValue}`
      );

      const monthLabel = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      months.push({ value: monthValue, label: monthLabel });
    }

    return months;
  };

  // Handle month change
  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    console.log("Month changed from", selectedMonth, "to", newMonth);
    setSelectedMonth(newMonth);
  };

  // Calculate attendance status for each day of the month
  const calculateAttendanceStatus = (memberAttendance) => {
    // Get the year and month from selectedMonth (YYYY-MM format)
    const year = parseInt(selectedMonth.slice(0, 4));
    const month = parseInt(selectedMonth.slice(5, 7));

    // Get the number of days in the selected month
    // Note: For getting days in month, we use the next month with day 0
    // which gives us the last day of the current month
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return days.map((day) => {
      const dayStr = day.toString().padStart(2, "0");
      const dateStr = `${selectedMonth}-${dayStr}`;

      // Check if member has attendance for this day
      const hasAttendance = memberAttendance.some(
        (record) => record.date === dateStr
      );

      return {
        day,
        present: hasAttendance,
      };
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
      <div className="w-full flex items-center mb-6">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={24} />
        </button>
        <div className="text-xl font-bold ml-2">Attendance Details</div>
      </div>

      {/* Month selector */}
      <div className="mb-6 flex items-center justify-center">
        <FaCalendarAlt className="mr-2" />
        <select
          value={selectedMonth}
          onChange={handleMonthChange}
          className="bg-[#1e293b] text-white px-4 py-2 rounded-lg"
        >
          {getAvailableMonths().map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>

      {/* Attendance table with fixed first column */}
      <div className="attendance-table">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="sticky-column">Member</th>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <th key={day} className="day-column">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attendanceData.length > 0 ? (
                attendanceData.map((member) => {
                  const attendanceStatus = calculateAttendanceStatus(
                    member.attendance
                  );
                  return (
                    <tr key={member.memberId}>
                      <td className="sticky-column member-name">
                        {member.fullName}
                      </td>
                      {attendanceStatus.map((status, index) => (
                        <td key={index} className="attendance-cell">
                          {status.present ? (
                            <span className="present-mark">✓</span>
                          ) : (
                            <span className="absent-mark">✗</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="32" className="py-4 text-center">
                    No attendance records for this month
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetails;
