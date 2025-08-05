import React, { useState, useEffect } from "react";
import {
  FaArrowLeft,
  FaChartBar,
  FaUtensils,
  FaDumbbell,
} from "react-icons/fa";
import axios from "axios";
import { API_URL } from "../../config";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  Bar,
  ComposedChart,
} from "recharts";
import "./MemberProgress.css";

const MemberProgress = ({
  memberId,
  onBackClick,
  fromFaceRecognition = false,
}) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calorieData, setCalorieData] = useState([]);
  const [weightData, setWeightData] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [recommendedCalories, setRecommendedCalories] = useState(null);
  const [dailyDetails, setDailyDetails] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  // Format date for display (YYYY-MM-DD to DD/MM/YYYY)
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB"); // DD/MM/YYYY format
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

          // Fetch weight history data for the month
          await fetchWeightHistory(memberResponse.data.member);
        }

        // Fetch recommended calories
        await fetchRecommendedCalories(memberResponse.data.member);

        // Fetch calorie data for the current month
        await fetchCalorieData();
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

  // Fetch weight history data for the month
  const fetchWeightHistory = async (memberData) => {
    if (!memberData) return;

    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      const yearMonth = `${year}-${monthStr}`;

      let config = {};

      // If not coming from face recognition, require authentication
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
      const endpoint = fromFaceRecognition
        ? `${API_URL}/api/weight-history/${memberId}/public`
        : `${API_URL}/api/weight-history/${memberId}`;

      // Add date range filter for the current month
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-31`; // This will work for all months

      const response = await axios.get(
        `${endpoint}?startDate=${startDate}&endDate=${endDate}`,
        config
      );

      if (response.data && response.data.success) {
        // Format the weight history data for the chart
        const weightEntries = response.data.weightHistory.map((record) => ({
          date: record.date,
          day: parseInt(record.date.split("-")[2]), // Extract day from date
          weight: parseFloat(record.weight),
        }));

        setWeightData(weightEntries);
      } else {
        console.error("Failed to fetch weight history");
        // If no weight data, use current weight as fallback
        if (memberData.weight) {
          const baseWeight = parseFloat(memberData.weight);
          const today = new Date();
          const day = today.getDate();
          const dayStr = day < 10 ? `0${day}` : `${day}`;
          const date = `${year}-${monthStr}-${dayStr}`;

          setWeightData([
            {
              date,
              day,
              weight: baseWeight,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error fetching weight history:", error);
      // Use current weight as fallback if available
      if (memberData.weight) {
        const baseWeight = parseFloat(memberData.weight);
        const today = new Date();
        const day = today.getDate();
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const date = `${year}-${monthStr}-${dayStr}`;

        setWeightData([
          {
            date,
            day,
            weight: baseWeight,
          },
        ]);
      }
    }
  };

  // Fetch calorie data whenever the month changes
  useEffect(() => {
    if (memberId) {
      fetchCalorieData();

      // Also update weight data when month changes
      if (member) {
        fetchWeightHistory(member);
      }
    }
  }, [currentMonth]);

  // Function to fetch recommended calories
  const fetchRecommendedCalories = async (memberData) => {
    try {
      if (!memberData || !memberData.height || !memberData.weight) {
        console.log("Missing height or weight data for calorie calculation");
        return;
      }

      let config = {};

      // If not coming from face recognition, require authentication
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

      // Call the calculate-calories endpoint
      const response = await axios.get(
        `${API_URL}/api/calculate-calories/${memberId}?goal=loss`,
        config
      );

      if (response.data && response.data.success) {
        console.log("Fetched recommended calories:", response.data.data);
        setRecommendedCalories(response.data.data.dailyCalories);
      }
    } catch (error) {
      console.error("Error fetching recommended calories:", error);
      // Don't set an error state here, just log it
    }
  };

  const fetchCalorieData = async () => {
    try {
      setLoading(true);

      let config = {};

      // If not coming from face recognition, require authentication
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

      // Get the year and month for the API request
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1; // JavaScript months are 0-indexed
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      const yearMonth = `${year}-${monthStr}`;

      // Determine which API endpoint to use based on source
      const endpoint = fromFaceRecognition
        ? `${API_URL}/api/calorie-progress/${memberId}/${yearMonth}/public`
        : `${API_URL}/api/calorie-progress/${memberId}/${yearMonth}`;

      // Fetch calorie data from the API
      const response = await axios.get(endpoint, config);

      if (response.data && response.data.success) {
        console.log("Fetched calorie data:", response.data.calorieData);
        setCalorieData(response.data.calorieData);
      } else {
        throw new Error("Failed to fetch calorie data");
      }

      // Fetch detailed workout and meal data
      const detailsEndpoint = fromFaceRecognition
        ? `${API_URL}/api/calorie-progress/${memberId}/${yearMonth}/details/public`
        : `${API_URL}/api/calorie-progress/${memberId}/${yearMonth}/details`;

      const detailsResponse = await axios.get(detailsEndpoint, config);

      if (detailsResponse.data && detailsResponse.data.success) {
        console.log(
          "Fetched daily details:",
          detailsResponse.data.dailyDetails
        );
        setDailyDetails(detailsResponse.data.dailyDetails);

        // Set the selected day to today if it's in the current month, otherwise to the first day with data
        const today = new Date();
        if (
          today.getMonth() === currentMonth.getMonth() &&
          today.getFullYear() === currentMonth.getFullYear()
        ) {
          const todayStr = today.getDate().toString();
          setSelectedDay(todayStr);
        } else if (detailsResponse.data.dailyDetails.length > 0) {
          const firstDay = new Date(detailsResponse.data.dailyDetails[0].date)
            .getDate()
            .toString();
          setSelectedDay(firstDay);
        }
      } else {
        throw new Error("Failed to fetch daily details");
      }
    } catch (error) {
      console.error("Error fetching calorie data:", error);
      setError("Failed to load calorie data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Find the maximum calorie value for scaling the chart
  const maxCalories = Math.max(
    ...calorieData.map((data) => data.calories),
    2500
  );

  // Find the maximum and minimum weight values for scaling
  const maxWeight =
    weightData.length > 0
      ? Math.max(...weightData.map((data) => data.weight)) + 5
      : member?.weight
      ? parseFloat(member.weight) + 5
      : 100;

  const minWeight =
    weightData.length > 0
      ? Math.min(...weightData.map((data) => data.weight)) - 5
      : member?.weight
      ? parseFloat(member.weight) - 5
      : 50;

  // Prepare combined data for the chart
  const prepareChartData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    // Create an array with all days of the month
    const chartData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const date = `${year}-${month < 10 ? "0" + month : month}-${dayStr}`;

      // Find calorie data for this day
      const existingCalorieData = calorieData.find(
        (item) => new Date(item.date).getDate() === day
      );

      // Find weight data for this day
      const existingWeightData = weightData.find(
        (item) => new Date(item.date).getDate() === day
      );

      return {
        date,
        day,
        calories: existingCalorieData ? existingCalorieData.calories : 0,
        weight: existingWeightData ? existingWeightData.weight : null,
      };
    });

    // Interpolate weight data for days without measurements
    if (weightData.length > 1) {
      // Sort weight data by day
      const sortedWeightData = [...weightData].sort(
        (a, b) => new Date(a.date).getDate() - new Date(b.date).getDate()
      );

      // For each day without weight data, interpolate between the closest measurements
      for (let i = 0; i < chartData.length; i++) {
        if (chartData[i].weight === null) {
          // Find the closest previous weight measurement
          let prevIndex = i - 1;
          while (prevIndex >= 0 && chartData[prevIndex].weight === null) {
            prevIndex--;
          }

          // Find the closest next weight measurement
          let nextIndex = i + 1;
          while (
            nextIndex < chartData.length &&
            chartData[nextIndex].weight === null
          ) {
            nextIndex++;
          }

          // If we have both previous and next measurements, interpolate
          if (prevIndex >= 0 && nextIndex < chartData.length) {
            const prevWeight = chartData[prevIndex].weight;
            const nextWeight = chartData[nextIndex].weight;
            const totalDays = nextIndex - prevIndex;
            const daysFromPrev = i - prevIndex;

            // Linear interpolation
            chartData[i].weight =
              prevWeight +
              (nextWeight - prevWeight) * (daysFromPrev / totalDays);
          }
          // If we only have previous measurements, use the last known weight
          else if (prevIndex >= 0) {
            chartData[i].weight = chartData[prevIndex].weight;
          }
          // If we only have future measurements, use the first known weight
          else if (nextIndex < chartData.length) {
            chartData[i].weight = chartData[nextIndex].weight;
          }
          // If no measurements at all, use member's base weight
          else if (member?.weight) {
            chartData[i].weight = parseFloat(member.weight);
          }
        }
      }
    }

    return chartData;
  };

  // Get the selected day's details
  const getSelectedDayDetails = () => {
    if (!selectedDay || !dailyDetails || dailyDetails.length === 0) return null;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    // Ensure selectedDay is a string before using padStart
    const dayStr = String(selectedDay).padStart(2, "0");
    const dateStr = `${year}-${month < 10 ? "0" + month : month}-${dayStr}`;

    return dailyDetails.find((detail) => detail.date === dateStr);
  };

  const selectedDayDetails = getSelectedDayDetails();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col items-center justify-center">
        <p className="text-xl">Loading member progress...</p>
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

  return (
    <div className="min-h-screen bg-[#0a1f2e] text-white flex flex-col px-4 py-8">
      {/* Header with back button and member name */}
      <div className="w-full flex items-center mb-8">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={24} />
        </button>
        <div className="md:text-3xl lg:text-4xl font-bold truncate">
          {member.fullName}'s Progress
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="bg-[#123347] hover:bg-[#1e293b] text-white px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base rounded-lg"
        >
          &lt; Prev
        </button>
        <h2 className="text-lg sm:text-xl font-bold">{getMonthYearString()}</h2>
        <button
          onClick={goToNextMonth}
          className="bg-[#123347] hover:bg-[#1e293b] text-white px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base rounded-lg"
        >
          Next &gt;
        </button>
      </div>

      {/* Progress chart */}
      <div className="bg-[#123347] rounded-lg p-3 sm:p-4 md:p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <FaChartBar className="mr-2" /> Progress Tracking
        </h2>

        {/* Chart content would go here */}
        <div className="chart-container h-64 flex items-center justify-center">
          {/* Recharts Combined Chart */}
          {calorieData && calorieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={prepareChartData()}
                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                onMouseMove={(e) => {
                  if (
                    e &&
                    e.activeTooltipIndex !== undefined &&
                    e.activeLabel
                  ) {
                    // Update selectedDay when hovering over chart
                    setSelectedDay(e.activeLabel);
                  }
                }}
              >
                <defs>
                  <linearGradient
                    id="colorCalories"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3498db" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3498db" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient
                    id="colorCaloriesGreen"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2ecc71" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient
                    id="colorCaloriesRed"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#e74c3c" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#e74c3c" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient
                    id="colorCaloriesYellow"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#f39c12" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f39c12" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#a0aec0" }}
                  tickLine={{ stroke: "#4a5568" }}
                  axisLine={{ stroke: "#4a5568" }}
                  ticks={Array.from({ length: 31 }, (_, i) => i + 1).filter(
                    (day) => day === 1 || day % 5 === 0 || day === 31
                  )} // Show only days 1, 5, 10, 15, 20, 25, 31 on mobile
                  domain={[1, 31]}
                  interval={0}
                  tickMargin={5}
                  padding={{ left: 5, right: 5 }}
                />
                {/* Left Y-axis for calories */}
                <YAxis
                  yAxisId="left"
                  domain={[
                    0,
                    Math.max(2500, Math.ceil(maxCalories / 500) * 500),
                  ]}
                  tick={{ fill: "#a0aec0" }}
                  tickLine={{ stroke: "#4a5568" }}
                  axisLine={{ stroke: "#4a5568" }}
                  label={{
                    value: "Calories",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#a0aec0",
                    fontSize: 10,
                    className: "hidden sm:block",
                  }}
                />
                {/* Right Y-axis for weight */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[minWeight, maxWeight]}
                  tick={{ fill: "#a0aec0" }}
                  tickLine={{ stroke: "#4a5568" }}
                  axisLine={{ stroke: "#4a5568" }}
                  label={{
                    value: "Weight (kg)",
                    angle: 90,
                    position: "insideRight",
                    fill: "#a0aec0",
                    fontSize: 10,
                    className: "hidden sm:block",
                  }}
                />
                {/* Custom tooltip that doesn't render anything */}
                <Tooltip
                  content={() => null} // Return null to render nothing
                  cursor={{ stroke: "#ffffff", strokeWidth: 1 }}
                />
                {/* Reference line for recommended calories */}
                {recommendedCalories && (
                  <ReferenceLine
                    yAxisId="left"
                    y={recommendedCalories}
                    stroke="#f39c12"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      value: `Target: ${recommendedCalories} kcal`,
                      position: "insideTopRight",
                      fill: "#f39c12",
                      fontSize: 10,
                    }}
                  />
                )}

                {/* Weight data as bars */}
                <Bar
                  dataKey="weight"
                  yAxisId="right"
                  fill="#9b59b6"
                  barSize={20}
                  name="Weight"
                />

                {/* Show calorie data with different colors based on target */}
                {recommendedCalories ? (
                  // If we have recommended calories, use red for above and green for below
                  <>
                    <Area
                      type="monotone"
                      dataKey={(data) =>
                        data.calories > recommendedCalories
                          ? data.calories
                          : recommendedCalories
                      }
                      yAxisId="left"
                      name="Above Target"
                      stroke="#e74c3c"
                      fillOpacity={0.8}
                      fill="url(#colorCaloriesRed)"
                      activeDot={{
                        r: 5,
                        stroke: "white",
                        strokeWidth: 1,
                        fill: "#e74c3c",
                      }}
                      dot={false} // Hide regular dots for cleaner mobile view
                      baseValue={recommendedCalories}
                    />
                    {/* For calories below the recommended calories */}
                    <Area
                      type="monotone"
                      dataKey={(data) =>
                        data.calories < recommendedCalories
                          ? data.calories
                          : null
                      }
                      yAxisId="left"
                      name="Below Target"
                      stroke="#2ecc71"
                      fillOpacity={0.8}
                      fill="url(#colorCaloriesGreen)"
                      activeDot={{
                        r: 5,
                        stroke: "white",
                        strokeWidth: 1,
                        fill: "#2ecc71",
                      }}
                      dot={false} // Hide regular dots for cleaner mobile view
                    />

                    {/* For calories exactly equal to the recommended calories */}
                    <Area
                      type="monotone"
                      dataKey={(data) =>
                        data.calories === recommendedCalories
                          ? data.calories
                          : null
                      }
                      yAxisId="left"
                      name="At Target"
                      stroke="#f39c12"
                      fillOpacity={0.8}
                      fill="url(#colorCaloriesYellow)"
                      activeDot={{
                        r: 5,
                        stroke: "white",
                        strokeWidth: 1,
                        fill: "#f39c12",
                      }}
                      dot={false} // Hide regular dots for cleaner mobile view
                    />
                  </>
                ) : (
                  // If no recommended calories, use a single color
                  <Area
                    type="monotone"
                    dataKey="calories"
                    yAxisId="left"
                    name="Calories"
                    stroke="#3498db"
                    fillOpacity={0.8}
                    fill="url(#colorCalories)"
                    activeDot={{
                      r: 5,
                      stroke: "white",
                      strokeWidth: 1,
                      fill: "#3498db",
                    }}
                    dot={false} // Hide regular dots for cleaner mobile view
                  />
                )}
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ color: "white" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-message">No progress data available</div>
          )}
        </div>
      </div>

      {/* Daily Details Section */}
      {selectedDay && (
        <div className="bg-[#123347] rounded-lg p-3 sm:p-4 md:p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                const currentDay = parseInt(selectedDay);
                if (currentDay > 1) {
                  setSelectedDay((currentDay - 1).toString());
                }
              }}
              className="bg-[#0a1f2e] hover:bg-[#1e293b] text-white px-3 py-1 rounded-lg"
              disabled={parseInt(selectedDay) <= 1}
            >
              &lt;
            </button>
            <h2 className="text-xl font-bold">Day {selectedDay} Details</h2>
            <button
              onClick={() => {
                const currentDay = parseInt(selectedDay);
                const daysInMonth = new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1,
                  0
                ).getDate();
                if (currentDay < daysInMonth) {
                  setSelectedDay((currentDay + 1).toString());
                }
              }}
              className="bg-[#0a1f2e] hover:bg-[#1e293b] text-white px-3 py-1 rounded-lg"
              disabled={
                parseInt(selectedDay) >=
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1,
                  0
                ).getDate()
              }
            >
              &gt;
            </button>
          </div>

          {selectedDayDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Meals Section */}
              <div className="bg-[#0a1f2e] p-4 rounded-lg">
                <h3 className="text-lg font-bold mb-3 flex items-center">
                  <FaUtensils className="mr-2" /> Meals
                </h3>

                {/* Breakfast */}
                <div className="mb-4">
                  <h4 className="font-bold text-[#3498db] mb-2">Breakfast</h4>
                  {selectedDayDetails.meals.breakfast &&
                  selectedDayDetails.meals.breakfast.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {selectedDayDetails.meals.breakfast.map((item, index) => (
                        <li key={`breakfast-${index}`} className="mb-1">
                          {item.quantity}x {item.name} -{" "}
                          {item.calories || item.totalCalories || 0} kcal
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">No breakfast recorded</p>
                  )}
                </div>

                {/* Lunch */}
                <div className="mb-4">
                  <h4 className="font-bold text-[#3498db] mb-2">Lunch</h4>
                  {selectedDayDetails.meals.lunch &&
                  selectedDayDetails.meals.lunch.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {selectedDayDetails.meals.lunch.map((item, index) => (
                        <li key={`lunch-${index}`} className="mb-1">
                          {item.quantity}x {item.name} -{" "}
                          {item.calories || item.totalCalories || 0} kcal
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">No lunch recorded</p>
                  )}
                </div>

                {/* Dinner */}
                <div className="mb-4">
                  <h4 className="font-bold text-[#3498db] mb-2">Dinner</h4>
                  {selectedDayDetails.meals.dinner &&
                  selectedDayDetails.meals.dinner.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {selectedDayDetails.meals.dinner.map((item, index) => (
                        <li key={`dinner-${index}`} className="mb-1">
                          {item.quantity}x {item.name} -{" "}
                          {item.calories || item.totalCalories || 0} kcal
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">No dinner recorded</p>
                  )}
                </div>

                {/* Nutrition Totals */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <h4 className="font-bold mb-2">Nutrition Totals</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="bg-[#123347] p-2 rounded">
                      <p className="text-sm text-gray-400">Calories</p>
                      <p className="font-bold">
                        {selectedDayDetails.meals.nutritionTotals.calories} kcal
                      </p>
                    </div>
                    <div className="bg-[#123347] p-2 rounded">
                      <p className="text-sm text-gray-400">Carbs</p>
                      <p className="font-bold">
                        {selectedDayDetails.meals.nutritionTotals.carbs} g
                      </p>
                    </div>
                    <div className="bg-[#123347] p-2 rounded">
                      <p className="text-sm text-gray-400">Proteins</p>
                      <p className="font-bold">
                        {selectedDayDetails.meals.nutritionTotals.proteins} g
                      </p>
                    </div>
                    <div className="bg-[#123347] p-2 rounded">
                      <p className="text-sm text-gray-400">Fats</p>
                      <p className="font-bold">
                        {selectedDayDetails.meals.nutritionTotals.fats} g
                      </p>
                    </div>
                    <div className="bg-[#123347] p-2 rounded">
                      <p className="text-sm text-gray-400">Fibre</p>
                      <p className="font-bold">
                        {selectedDayDetails.meals.nutritionTotals.fibre} g
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workout Section */}
              <div className="bg-[#0a1f2e] p-4 rounded-lg">
                <h3 className="text-lg font-bold mb-3 flex items-center">
                  <FaDumbbell className="mr-2" /> Workout
                </h3>

                {selectedDayDetails.workout &&
                selectedDayDetails.workout.exercises &&
                selectedDayDetails.workout.exercises.length > 0 ? (
                  <div>
                    {selectedDayDetails.workout.exercises.map(
                      (exercise, index) => (
                        <div
                          key={`exercise-${index}`}
                          className="mb-4 pb-4 border-b border-gray-700 last:border-0"
                        >
                          <h4 className="font-bold text-[#e74c3c]">
                            {exercise.name}
                          </h4>
                          {exercise.sets && Array.isArray(exercise.sets) ? (
                            <div className="mt-2">
                              <p className="text-xs text-gray-400 mb-1">
                                Sets ({exercise.sets.length})
                              </p>
                              <div className="flex flex-col gap-2">
                                {exercise.sets.map((set, setIndex) => (
                                  <div
                                    key={`set-${setIndex}`}
                                    className="bg-[#123347] p-2 rounded flex justify-between"
                                  >
                                    <span>Set {setIndex + 1}</span>
                                    <span>
                                      {set.weight} kg × {set.count || set.reps}{" "}
                                      count
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <div>
                                <p className="text-xs text-gray-400">Sets</p>
                                <p>{exercise.setCount}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Weight</p>
                                <p>
                                  {exercise.weight > 0
                                    ? `${exercise.weight} kg`
                                    : "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Count</p>
                                <p>{exercise.count || exercise.repsCount}</p>
                              </div>
                            </div>
                          )}
                          {exercise.notes && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-400">Notes</p>
                              <p className="text-sm">{exercise.notes}</p>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">
                    No workout recorded for this day
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400">
              No details available for this day
            </p>
          )}
        </div>
      )}

      {/* Summary statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#123347] p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Average Daily Calories</h3>
          <p className="text-3xl">
            {calorieData.length > 0
              ? Math.round(
                  calorieData.reduce((sum, data) => sum + data.calories, 0) /
                    calorieData.length
                )
              : "N/A"}
          </p>
        </div>
        <div className="bg-[#123347] p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Highest Day</h3>
          <p className="text-3xl">
            {calorieData.length > 0
              ? Math.max(...calorieData.map((data) => data.calories))
              : "N/A"}
          </p>
        </div>
        <div className="bg-[#123347] p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Current Weight</h3>
          <p className="text-3xl">
            {weightData.length > 0
              ? weightData[weightData.length - 1].weight.toFixed(1)
              : member?.weight || "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MemberProgress;
