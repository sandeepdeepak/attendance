import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import axios from "axios";
import "./MemberDetails.css";
import { API_URL } from "../../config";

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
          `${API_URL}/api/members/${memberId}`
        );

        if (memberResponse.data && memberResponse.data.member) {
          setMember(memberResponse.data.member);
        }

        // Fetch attendance records
        const attendanceResponse = await axios.get(
          `${API_URL}/api/attendance/${memberId}`
        );

        if (attendanceResponse.data && attendanceResponse.data.records) {
          const records = attendanceResponse.data.records;
          console.log("Fetched attendance records:", records);
          setAttendanceRecords(records);
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

  // Calculate age from date of birth
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

  // Format date for display (YYYY-MM-DD to DD/MM/YYYY)
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB"); // DD/MM/YYYY format
  };

  // Calculate membership end date based on start date and plan
  const calculateMembershipEndDate = (startDate, membershipPlan) => {
    if (!startDate) return null;

    const start = new Date(startDate);
    const planMonths = {
      "1 Month": 1,
      "3 Months": 3,
      "6 Months": 6,
      "12 Months": 12,
    };

    // Default to 1 month if plan is not specified or not recognized
    const months =
      membershipPlan && planMonths[membershipPlan]
        ? planMonths[membershipPlan]
        : 1;

    // Create a new date by adding the appropriate number of months
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);

    return endDate;
  };

  // Calculate days remaining until membership ends
  const calculateDaysRemaining = (endDate) => {
    if (!endDate) return "N/A";

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part for accurate day calculation

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return "Expired";
    }

    return `${diffDays} days`;
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
    if (!day) return false;
    if (!attendanceRecords || attendanceRecords.length === 0) {
      console.log("No attendance records available");
      return false;
    }

    // Get today's date to check if we're looking at today
    const today = new Date();
    console.log(`Checking attendance for day: ${day}`, today.getDate());
    const isToday =
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear();

    // Log if we're checking today
    if (isToday) {
      console.log("Checking attendance for today");
    }

    // Create a date string in YYYY-MM-DD format for the day we're checking
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1; // Months are 0-indexed in JS
    const dateToCheckStr = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    console.log(`Checking attendance for day ${day}, date ${dateToCheckStr}`);

    // Check if there's any attendance record with matching date field
    const hasAttendance = attendanceRecords.some((record) => {
      // First try to use the date field if available
      if (record.date) {
        const match = record.date === dateToCheckStr;
        if (match) {
          console.log(`Match found using date field: ${record.date}`);
          return true;
        }
      }

      // Fall back to timestamp if date field is not available
      if (!record.timestamp) {
        return false;
      }

      // Extract date part from timestamp (YYYY-MM-DD)
      const recordDateStr = record.timestamp.split("T")[0];

      console.log(
        `Comparing record date ${recordDateStr} with ${dateToCheckStr}`
      );

      // Compare just the date strings (YYYY-MM-DD)
      const match = recordDateStr === dateToCheckStr;

      if (match) {
        console.log(`Match found for ${dateToCheckStr} using timestamp`);
      }

      return match;
    });

    console.log(`Day ${day} has attendance: ${hasAttendance}`);
    return hasAttendance;
  };

  // Check if a date is within the membership period
  const isWithinMembershipPeriod = (date) => {
    if (!member || !member.startDate) return false;

    // Get date strings in YYYY-MM-DD format
    const month = date.getMonth() + 1; // Months are 0-indexed in JS
    const dateStr = `${date.getFullYear()}-${String(month).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
    const startDateStr = member.startDate.split("T")[0];

    const endDate = calculateMembershipEndDate(
      member.startDate,
      member.membershipPlan
    );
    if (!endDate) return false;

    const endMonth = endDate.getMonth() + 1; // Months are 0-indexed in JS
    const endDateStr = `${endDate.getFullYear()}-${String(endMonth).padStart(
      2,
      "0"
    )}-${String(endDate.getDate()).padStart(2, "0")}`;

    // Compare date strings
    return dateStr >= startDateStr && dateStr <= endDateStr;
  };

  // Check if a date is in the past
  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date <= today;
  };

  // Get the appropriate class for a calendar day
  const getDayClass = (day) => {
    if (!day) return ""; // Empty cell

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, day);

    // If not within membership period, use gray
    if (!isWithinMembershipPeriod(date)) {
      return "bg-gray-700 text-gray-400";
    }

    // If date is in the past, check attendance
    if (isDateInPast(date)) {
      // Debug attendance check
      const attended = hasAttendance(day);
      console.log(`Day ${day} attended: ${attended}`);
      return attended ? "bg-green-800" : "bg-red-800";
    }

    // Future dates within membership period
    return "bg-blue-800";
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
      <div className="grid grid-cols-2 gap-2 mb-6 ms-2">
        <div>
          <p className="text-gray-400 text-left">Age</p>
          <p className="text-left">
            {calculateAge(member.dateOfBirth || member.startDate)}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-left">Date of Birth</p>
          <p className="text-left">{formatDate(member.dateOfBirth)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-left">Gender</p>
          <p className="text-left">
            {member.gender
              ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1)
              : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-left">Mobile number</p>
          <p className="text-left">{member.phoneNumber}</p>
        </div>
        <div>
          <p className="text-gray-400 text-left">Membership Start</p>
          <p className="text-left">
            {formatDate(member.startDate)}{" "}
            {`(${member.membershipPlan})` || "1 Month"}
          </p>
        </div>
        {/* <div>
          <p className="text-gray-400 text-left">Plan</p>
          <p className="text-left">
            {member.membershipPlan || "1 Month"}
          </p>
        </div> */}
        <div>
          <p className="text-gray-400 text-left">Membership Ends In</p>
          <p className="text-left">
            {calculateDaysRemaining(
              calculateMembershipEndDate(
                member.startDate,
                member.membershipPlan
              )
            )}
          </p>
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

          return (
            <div
              key={index}
              className={`aspect-square flex items-center justify-center text-xl rounded-lg ${getDayClass(
                day
              )}`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-start gap-4 mb-8">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-800 rounded mr-1"></div>
          <span>Attended</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-800 rounded mr-1"></div>
          <span>Not Attended</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-800 rounded mr-1"></div>
          <span>Membership</span>
        </div>
      </div>

      {/* Attendance statistics */}
      <div className="flex justify-between">
        <div>
          <p className="text-gray-400 text-left">Total Days</p>
          <p className="text-xl">{stats.totalDays}</p>
        </div>
        <div>
          <p className="text-gray-400 text-left">Attended</p>
          <p className="text-xl">{stats.attendedDays}</p>
        </div>
      </div>
    </div>
  );
};

export default MemberDetails;
