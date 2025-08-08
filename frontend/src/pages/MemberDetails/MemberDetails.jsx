import React, { useState, useEffect, useRef } from "react";
import { FaArrowLeft, FaCalendar, FaChartBar } from "react-icons/fa";
import axios from "axios";
import "./MemberDetails.css";
import { API_URL } from "../../config";

const MemberDetails = ({
  memberId,
  onBackClick,
  onMemberPlanClick,
  onMemberProgressClick,
  fromFaceRecognition = false,
}) => {
  const [member, setMember] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendFormData, setExtendFormData] = useState({
    startDate: new Date().toISOString().split("T")[0],
    planType: "1 Month",
  });
  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [membershipHistory, setMembershipHistory] = useState([]);
  const planDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        planDropdownRef.current &&
        !planDropdownRef.current.contains(event.target)
      ) {
        setIsPlanDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchMemberDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        let config = {};

        // If coming from face recognition, don't require authentication
        if (!fromFaceRecognition) {
          // Get auth token from localStorage
          const authToken = localStorage.getItem("authToken");
          if (!authToken) {
            throw new Error(
              "Authentication token not found. Please login again."
            );
          }

          // Create axios config with auth header
          config = {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          };
        }

        // Determine which API endpoint to use based on source
        const memberEndpoint = fromFaceRecognition
          ? `${API_URL}/api/members/${memberId}/public`
          : `${API_URL}/api/members/${memberId}`;

        // Fetch member details
        const memberResponse = await axios.get(memberEndpoint, config);

        if (memberResponse.data && memberResponse.data.member) {
          setMember(memberResponse.data.member);
        }

        // Fetch membership history
        const membershipEndpoint = fromFaceRecognition
          ? `${API_URL}/api/memberships/${memberId}/public`
          : `${API_URL}/api/memberships/${memberId}`;

        const membershipResponse = await axios.get(membershipEndpoint, config);

        if (membershipResponse.data && membershipResponse.data.memberships) {
          setMembershipHistory(membershipResponse.data.memberships);
        }

        // Fetch attendance records
        const attendanceEndpoint = fromFaceRecognition
          ? `${API_URL}/api/attendance/${memberId}/public`
          : `${API_URL}/api/attendance/${memberId}`;

        const attendanceResponse = await axios.get(attendanceEndpoint, config);

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
  }, [memberId, fromFaceRecognition]);

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

  // Get active membership details
  const getActiveMembership = () => {
    if (!membershipHistory || membershipHistory.length === 0) return null;

    // Find active membership
    const activeMembership = membershipHistory.find((m) => m.isActive === true);
    if (activeMembership) return activeMembership;

    // If no active membership found, return the most recent one
    return membershipHistory[0]; // Already sorted by createdAt desc
  };

  // Calculate membership end date
  const calculateMembershipEndDate = () => {
    const activeMembership = getActiveMembership();
    if (!activeMembership) return null;

    return new Date(activeMembership.endDate);
  };

  // Calculate days remaining until membership ends
  const calculateDaysRemaining = () => {
    const endDate = calculateMembershipEndDate();
    if (!endDate) return "N/A";

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part for accurate day calculation

    const diffTime = endDate - today;
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
    const activeMembership = getActiveMembership();
    if (!activeMembership) return false;

    // Get date strings in YYYY-MM-DD format
    const month = date.getMonth() + 1; // Months are 0-indexed in JS
    const dateStr = `${date.getFullYear()}-${String(month).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;

    const startDateStr = activeMembership.startDate;
    const endDateStr = activeMembership.endDate;

    // Compare date strings
    return dateStr >= startDateStr && dateStr <= endDateStr;
  };

  // Check if a date is in the past
  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date <= today;
  };

  // Handle calendar day click
  const handleDayClick = (day) => {
    if (!day) return; // Don't do anything for empty cells

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, day);

    // Format date as YYYY-MM-DD for API
    const formattedDate = `${year}-${String(month + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;

    // Navigate to member plan page
    if (onMemberPlanClick) {
      onMemberPlanClick(memberId, formattedDate);
    }
  };

  // Get the appropriate class for a calendar day
  const getDayClass = (day) => {
    if (!day) return ""; // Empty cell

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, day);

    // If not within membership period, use gray
    if (!isWithinMembershipPeriod(date)) {
      return "bg-[#1e293b] text-gray-400";
    }

    // If date is in the past, check attendance
    if (isDateInPast(date)) {
      // Debug attendance check
      const attended = hasAttendance(day);
      console.log(`Day ${day} attended: ${attended}`);
      return attended
        ? "bg-green-800 cursor-pointer"
        : "bg-red-800 cursor-pointer";
    }

    // Future dates within membership period
    return "bg-[#024a72] cursor-pointer";
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
      <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col items-center justify-center">
        <p className="text-xl">Loading member details...</p>
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

  const handleExtendMembership = async () => {
    if (!member || !extendFormData.startDate || !extendFormData.planType) {
      return;
    }

    setIsExtending(true);

    try {
      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      // Create axios config with auth header
      const config = {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      };

      const response = await axios.post(
        `${API_URL}/api/memberships/${memberId}/extend`,
        extendFormData,
        config
      );

      if (response.data) {
        // Update member data with new membership details
        setMember({
          ...member,
          startDate: extendFormData.startDate,
          membershipPlan: extendFormData.planType,
        });

        // Add new membership to history
        setMembershipHistory([response.data.membership, ...membershipHistory]);

        // Close the modal
        setShowExtendModal(false);
      }
    } catch (error) {
      console.error("Error extending membership:", error);
      alert("Failed to extend membership. Please try again.");
    } finally {
      setIsExtending(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setExtendFormData({
      ...extendFormData,
      [name]: value,
    });
  };

  const handleCustomSelectChange = (name, value) => {
    setExtendFormData({
      ...extendFormData,
      [name]: value,
    });
  };

  if (!member) {
    return (
      <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col items-center justify-center">
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

  // Check if membership is expired
  const membershipEndDate = calculateMembershipEndDate(
    member.startDate,
    member.membershipPlan
  );
  const isExpired = membershipEndDate ? new Date() > membershipEndDate : false;

  return (
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col px-4 pt-20 pb-8">
      {/* Fixed Header with back button, member name, and progress icon */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a1f2e] flex items-center p-4 shadow-md fixed-header">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={24} />
        </button>
        <div className="text-xl font-bold flex-1 ml-2 text-left">
          {member.fullName}
        </div>
        <button
          className="text-white p-1 bg-[#024a72] rounded-full"
          onClick={() =>
            onMemberProgressClick ? onMemberProgressClick(memberId) : null
          }
          title="View Progress"
        >
          <FaChartBar size={18} />
        </button>
      </div>

      {/* Membership Extension Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-[#0a1f2e] bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-[#123347] p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Extend Membership</h2>

            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Start Date</label>
              <div className="relative">
                <input
                  type="date"
                  name="startDate"
                  value={extendFormData.startDate}
                  onChange={handleInputChange}
                  className="bg-[#1e293b] text-white p-3 rounded-lg w-full"
                />
                <FaCalendar
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 mb-2">
                Membership Plan
              </label>
              <div className="custom-select" ref={planDropdownRef}>
                {/* Hidden select element to maintain form state */}
                <select
                  name="planType"
                  value={extendFormData.planType}
                  onChange={handleInputChange}
                  style={{ display: "none" }}
                >
                  <option value="1 Month">1 Month</option>
                  <option value="3 Months">3 Months</option>
                  <option value="6 Months">6 Months</option>
                  <option value="12 Months">12 Months</option>
                </select>

                {/* Custom dropdown UI */}
                <div
                  className={`select-selected bg-[#1e293b] ${
                    isPlanDropdownOpen ? "select-arrow-active" : ""
                  }`}
                  onClick={() => setIsPlanDropdownOpen(!isPlanDropdownOpen)}
                >
                  {extendFormData.planType}
                </div>

                <div
                  className={`select-items bg-[#1e293b] ${
                    isPlanDropdownOpen ? "" : "select-hide"
                  }`}
                >
                  <div
                    onClick={() => {
                      handleCustomSelectChange("planType", "1 Month");
                      setIsPlanDropdownOpen(false);
                    }}
                    className={
                      extendFormData.planType === "1 Month"
                        ? "same-as-selected"
                        : ""
                    }
                  >
                    1 Month
                  </div>
                  <div
                    onClick={() => {
                      handleCustomSelectChange("planType", "3 Months");
                      setIsPlanDropdownOpen(false);
                    }}
                    className={
                      extendFormData.planType === "3 Months"
                        ? "same-as-selected"
                        : ""
                    }
                  >
                    3 Months
                  </div>
                  <div
                    onClick={() => {
                      handleCustomSelectChange("planType", "6 Months");
                      setIsPlanDropdownOpen(false);
                    }}
                    className={
                      extendFormData.planType === "6 Months"
                        ? "same-as-selected"
                        : ""
                    }
                  >
                    6 Months
                  </div>
                  <div
                    onClick={() => {
                      handleCustomSelectChange("planType", "12 Months");
                      setIsPlanDropdownOpen(false);
                    }}
                    className={
                      extendFormData.planType === "12 Months"
                        ? "same-as-selected"
                        : ""
                    }
                  >
                    12 Months
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                className="bg-gray-600 text-white px-4 py-2 rounded-lg"
                onClick={() => setShowExtendModal(false)}
                disabled={isExtending}
              >
                Cancel
              </button>
              <button
                className="bg-[#024a72] text-white px-4 py-2 rounded-lg"
                onClick={handleExtendMembership}
                disabled={isExtending}
              >
                {isExtending ? "Extending..." : "Extend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member details */}
      <div className="grid grid-cols-2 gap-2 mb-6 ms-2">
        <div>
          <p className="text-gray-400 text-left">Age</p>
          <p className="text-left">{calculateAge(member.dateOfBirth)}</p>
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
          <p className="text-gray-400 text-left">Height</p>
          <p className="text-left">
            {member.height ? `${member.height} cm` : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-left">Weight</p>
          <p className="text-left">
            {member.weight ? `${member.weight} kg` : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-left">Membership Start</p>
          <p className="text-left">
            {getActiveMembership()
              ? `${formatDate(getActiveMembership().startDate)} (${
                  getActiveMembership().planType
                })`
              : "No active membership"}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-left">Membership Ends In</p>
          <p className={`text-left ${isExpired ? "text-red-500" : ""}`}>
            {calculateDaysRemaining()}
            {isExpired && (
              <button
                className="ml-2 bg-[#024a72] text-white text-xs px-2 py-1 rounded"
                onClick={() => setShowExtendModal(true)}
              >
                Extend
              </button>
            )}
          </p>
        </div>
      </div>

      {/* Calendar header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="bg-[#123347] hover:bg-[#1e293b] text-white px-4 py-2 rounded-lg"
        >
          &lt; Prev
        </button>
        <h2 className="text-xl font-bold">{getMonthYearString()}</h2>
        <button
          onClick={goToNextMonth}
          className="bg-[#123347] hover:bg-[#1e293b] text-white px-4 py-2 rounded-lg"
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
              onClick={() => handleDayClick(day)}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-between gap-2 mb-8 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-800 rounded mr-1"></div>
          <span>Attended</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-800 rounded mr-1"></div>
          <span>Not Attended</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[#024a72] rounded mr-1"></div>
          <span>Membership</span>
        </div>
      </div>

      {/* Membership History */}
      {membershipHistory.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-3">Membership History</h2>
          <div className="bg-[#123347] rounded-lg p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="text-left py-2">Start Date</th>
                  <th className="text-left py-2">End Date</th>
                  <th className="text-left py-2">Plan</th>
                </tr>
              </thead>
              <tbody>
                {membershipHistory.map((membership) => (
                  <tr
                    key={membership.id}
                    className="border-b border-gray-700 text-left"
                  >
                    <td className="py-2">{formatDate(membership.startDate)}</td>
                    <td className="py-2">{formatDate(membership.endDate)}</td>
                    <td className="py-2">{membership.planType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDetails;
