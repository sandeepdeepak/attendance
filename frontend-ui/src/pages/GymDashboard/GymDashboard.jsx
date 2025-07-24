import React, { useState } from "react";
import {
  FaCalendarCheck,
  FaUsers,
  FaTimesCircle,
  FaUserPlus,
  FaPlus,
  FaRegUser,
  FaTrash,
} from "react-icons/fa";
import "./GymDashboard.css";
const GymDashboard = ({
  onFaceRecognitionClick,
  onAddMemberClick,
  onAllMembersClick,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const handleDeleteAllFaces = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete all faces? This action cannot be undone."
      )
    ) {
      try {
        setIsDeleting(true);
        setDeleteSuccess(null);
        setDeleteError(null);

        const response = await fetch("http://localhost:7777/api/faces", {
          method: "DELETE",
        });

        const result = await response.json();

        if (response.ok) {
          setDeleteSuccess(
            `Successfully deleted ${result.deletedFaces || 0} faces and ${
              result.deletedMembers || 0
            } members.`
          );
        } else {
          setDeleteError(result.error || "Failed to delete faces");
        }
      } catch (error) {
        console.error("Error deleting faces:", error);
        setDeleteError("Failed to connect to server");
      } finally {
        setIsDeleting(false);
      }
    }
  };
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-8 gap-2">
      <div>
        <h1 className="text-4xl font-bold mb-2"> Attendance</h1>
        <p className="text-gray-400 mb-6 text-lg">using face recognition</p>
      </div>

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
          <FaUsers /> All Member
        </button>
        <button
          className="flex items-center justify-center gap-2 bg-[#f9f9f9] px-6 py-3 rounded-2xl text-black w-60"
          onClick={onFaceRecognitionClick}
        >
          <FaRegUser /> Go to face recognition
        </button>
        {/* <button
          className="flex items-center justify-center gap-2 bg-red-600 px-6 py-3 rounded-2xl text-white w-60"
          onClick={handleDeleteAllFaces}
          disabled={isDeleting}
        >
          <FaTrash /> {isDeleting ? "Deleting..." : "Delete All Faces"}
        </button> */}
      </div>

      {/* Success/Error Messages */}
      {deleteSuccess && (
        <div className="mt-4 p-3 bg-green-800 text-white rounded-lg">
          {deleteSuccess}
        </div>
      )}
      {deleteError && (
        <div className="mt-4 p-3 bg-red-800 text-white rounded-lg">
          {deleteError}
        </div>
      )}
    </div>
  );
};

export default GymDashboard;
