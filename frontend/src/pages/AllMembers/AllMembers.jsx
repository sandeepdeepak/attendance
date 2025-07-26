import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaUser, FaTrash } from "react-icons/fa";
import "./AllMembers.css";
import { API_URL } from "../../config";

const AllMembers = ({ onBackClick, onMemberClick }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingMemberId, setDeletingMemberId] = useState(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/members`);

      if (!response.ok) {
        throw new Error("Failed to fetch members");
      }

      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error("Error fetching members:", error);
      setError("Failed to load members. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleDeleteMember = async (e, memberId) => {
    e.stopPropagation(); // Prevent triggering the member click event

    try {
      setDeletingMemberId(memberId);

      const response = await fetch(`${API_URL}/api/members/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete member");
      }

      // Refresh the members list
      await fetchMembers();
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member. Please try again.");
    } finally {
      setDeletingMemberId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col px-4 py-8">
      {/* Header with back button and title */}
      <div className="w-full flex items-center mb-8">
        <button className="text-white p-2" onClick={onBackClick}>
          <FaArrowLeft size={24} />
        </button>
        <div className="text-3xl font-bold ml-4">
          All members {members.length > 0 ? `(${members.length})` : ""}{" "}
        </div>
      </div>

      {/* Members list */}
      <div className="flex-1 max-h-[44rem] overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-xl">Loading members...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-red-500 text-xl">{error}</p>
          </div>
        ) : members.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-xl">No members found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center cursor-pointer hover:bg-gray-800 p-3 rounded-lg transition-colors"
                onClick={() => onMemberClick(member.id)}
              >
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mr-4">
                  <FaUser size={32} className="text-gray-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-medium text-left">
                    {member.fullName}
                  </h2>
                  <p className="text-gray-400 text-left">
                    {member.phoneNumber}
                  </p>
                </div>
                {deletingMemberId === member.id ? (
                  <div className="p-3 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-t-2 border-white rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <button
                    className="p-3 text-red-500 hover:text-red-300 transition-colors"
                    onClick={(e) => handleDeleteMember(e, member.id)}
                    disabled={deletingMemberId !== null}
                    title="Delete member"
                    style={{ opacity: deletingMemberId !== null ? 0.5 : 1 }}
                  >
                    <FaTrash size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllMembers;
