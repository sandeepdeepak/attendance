import React from "react";
import {
  FaCalendarCheck,
  FaUsers,
  FaTimesCircle,
  FaUserPlus,
  FaPlus,
} from "react-icons/fa";
import "./GymDashboard.css";
const GymDashboard = () => {
  const stats = [
    {
      icon: <FaCalendarCheck size={30} />,
      label: "Today’s Attendance",
      value: 42,
    },
    {
      icon: <FaUsers size={30} />,
      label: "Members Inside",
      value: 15,
    },
    {
      icon: <FaTimesCircle size={30} />,
      label: "Missed Check-ins",
      value: 8,
    },
    {
      icon: <FaUserPlus size={30} />,
      label: "New Joinees",
      value: 3,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-8">
      <h1 className="text-4xl font-bold mb-2">Gym Attendance</h1>
      <p className="text-gray-400 mb-6 text-lg">using face recognition</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-[#1A1A1A] rounded-2xl p-6 flex flex-col items-center justify-center w-40 h-40"
          >
            <div className="text-gray-300 mb-2">{stat.icon}</div>
            <p className="text-center text-sm mb-1">{stat.label}</p>
            <p className="text-3xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <button className="flex items-center gap-2 bg-[#1A1A1A] px-6 py-3 rounded-2xl text-white">
        <FaPlus /> Add Member
      </button>
    </div>
  );
};

export default GymDashboard;
