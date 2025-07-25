import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import axios from "axios";
import "./MemberDetails.css";

const MemberDetails = ({ memberId, onBackClick }) => {
  const [member, setMember] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchMemberDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch member details
        const memberResponse = await axios.get(
          `http://localhost:7777/api/members/${memberId}`
        );

        if (memberResponse.data && memberResponse.data.member) {
          setMember(memberResponse.data.member);
        }

        // Fetch attendance records
        const attendanceResponse = await axios.get(
          `http://localhost:7777/api/attendance/${memberId}`
        );

        if (attendanceResponse.data && attendanceResponse.data.records) {
          setAttendanceRecords(attendanceResponse.data.records);
        }
      } catch (error) {
        console.error("Error fetching member details:", error);
        setError("Failed to load member details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      fetchMemberDetails();
    }
  }, [memberId]);

  // Calculate age from startDate (assuming it's a birth date)
  const calculateAge = (birthDate) => {
    if (!birthDate) return "N/A";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  // Generate calendar days for the current month with proper day of week alignment
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const calendarDays = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(i);
    }

    return calendarDays;
  };

  // Check if a specific day has attendance
  const hasAttendance = (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    return attendanceRecords.some((record) => {
      const recordDate = new Date(record.timestamp);
      // Compare year, month, and day directly without timezone conversion
      return (
        recordDate.getFullYear() === year &&
        recordDate.getMonth() === month &&
        recordDate.getDate() === day
      );
    });
  };

  // Get month name and year
  const getMonthYearString = () => {
    const options = { month: "long", year: "numeric" };
    return currentMonth.toLocaleDateString("en-US", options);
  };

  // Month navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  // Calculate attendance statistics
  const calculateAttendanceStats = () => {
    if (!attendanceRecords.length) return { totalDays: 0, attendedDays: 0 };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Count unique days with attendance in the current month
    const uniqueDaysWithAttendance = new Set();

    attendanceRecords.forEach((record) => {
      const recordDate = new Date(record.timestamp);
      if (
        recordDate.getMonth() === month &&
        recordDate.getFullYear() === year
      ) {
        uniqueDaysWithAttendance.add(recordDate.getDate());
      }
    });

    return {
      totalDays: daysInMonth,
      attendedDays: uniqueDaysWithAttendance.size,
    };
  };

  const stats = calculateAttendanceStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <p className="text-xl">Loading member details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
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

  if (!member) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <p className="text-xl">Member not found</p>
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
    <div className="min-h-screen bg-black text-white flex flex-col px-4 py-8">
      {/* Header with back button and member name */}
      <div className="w-full flex items-center mb-8">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={24} />
        </button>
        <h1 className="text-4xl font-bold">{member.fullName}</h1>
      </div>

      {/* Member details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-gray-400">Age</p>
          <p className="text-xl">{calculateAge(member.startDate)}</p>
        </div>
        <div>
          <p className="text-gray-400">Mobile number</p>
          <p className="text-xl">{member.phoneNumber}</p>
        </div>
        <div>
          <p className="text-gray-400">Plan</p>
          <p className="text-xl">1 Month</p>
        </div>
        <div>
          <p className="text-gray-400">Membership Ends In</p>
          <p className="text-xl">24 days</p>
        </div>
      </div>

      {/* Calendar header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          &lt; Prev
        </button>
        <h2 className="text-xl font-bold">{getMonthYearString()}</h2>
        <button
          onClick={goToNextMonth}
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          Next &gt;
        </button>
      </div>

      {/* Calendar weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
        <div className="text-xl">S</div>
        <div className="text-xl">M</div>
        <div className="text-xl">T</div>
        <div className="text-xl">W</div>
        <div className="text-xl">T</div>
        <div className="text-xl">F</div>
        <div className="text-xl">S</div>
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {generateCalendarDays().map((day, index) => {
          if (day === null) {
            // Empty cell for days before the 1st of the month
            return <div key={index} className="aspect-square"></div>;
          }

          const attended = hasAttendance(day);
          return (
            <div
              key={index}
              className={`aspect-square flex items-center justify-center text-xl rounded-lg ${
                attended ? "bg-green-800" : "bg-red-800"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-8 mb-8">
        <div className="flex items-center">
          <div className="w-6 h-6 bg-green-800 rounded mr-2"></div>
          <span>Attended</span>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-6 bg-red-800 rounded mr-2"></div>
          <span>Not Attended</span>
        </div>
      </div>

      {/* Attendance statistics */}
      <div className="flex justify-between">
        <div>
          <p className="text-gray-400">Total Days</p>
          <p className="text-xl">{stats.totalDays}</p>
        </div>
        <div>
          <p className="text-gray-400">Attended</p>
          <p className="text-xl">{stats.attendedDays}</p>
        </div>
      </div>
    </div>
  );
};

export default MemberDetails;
