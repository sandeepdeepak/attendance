import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaUser, FaTrash, FaEdit } from "react-icons/fa";
import "./AllMembers.css";
import { API_URL } from "../../config";
import AddMember from "../AddMember/AddMember";

const AllMembers = ({
  onBackClick,
  onMemberClick,
  filteredMembers = null,
  title = "All members",
}) => {
  const [showEditForm, setShowEditForm] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingMemberId, setDeletingMemberId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
  });
  const [updating, setUpdating] = useState(false);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch(`${API_URL}/api/members`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

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
    if (filteredMembers) {
      setMembers(Array.isArray(filteredMembers) ? filteredMembers : []);
      setLoading(false);
    } else {
      fetchMembers();
    }
  }, [filteredMembers]);

  const handleDeleteMember = async (e, memberId) => {
    e.stopPropagation(); // Prevent triggering the member click event

    try {
      setDeletingMemberId(memberId);

      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch(`${API_URL}/api/members/${memberId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
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

  const handleEditClick = (e, member) => {
    e.stopPropagation(); // Prevent triggering the member click event
    setMemberToEdit(member);
    setShowEditForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();

    if (!editingMember) return;

    try {
      setUpdating(true);

      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch(
        `${API_URL}/api/members/${editingMember.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update member");
      }

      // Close modal and refresh members list
      setShowEditModal(false);
      setEditingMember(null);
      await fetchMembers();
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Failed to update member. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  // Handle returning from edit form
  const handleEditFormBack = () => {
    setShowEditForm(false);
    setMemberToEdit(null);
    fetchMembers(); // Refresh the members list
  };

  // If showing edit form, render the AddMember component
  if (showEditForm && memberToEdit) {
    return (
      <AddMember
        onBackClick={handleEditFormBack}
        editMode={true}
        memberToEdit={memberToEdit}
      />
    );
  }

  return (
    <div className="h-screen bg-[#0a1f2e] text-white flex flex-col items-center px-4 py-6 overflow-hidden">
      <div className="flex items-center w-full max-w-md">
        {/* Back button */}
        <div className="flex-shrink-0 mb-4">
          <button className="text-white p-2" onClick={onBackClick}>
            <FaArrowLeft size={20} />
          </button>
        </div>

        {/* Header with title and count */}
        <div className="flex-shrink-0 w-full flex justify-start mb-4 mt-1">
          <div className="text-xl font-bold text-center">
            {title} {members.length > 0 ? `(${members.length})` : ""}
          </div>
        </div>
      </div>

      {/* Members list */}
      <div className="flex-1 w-full max-w-md h-[calc(100vh-10rem)] overflow-auto">
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
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center cursor-pointer bg-[#024a72] p-3 rounded-xl transition-colors"
                onClick={() => onMemberClick(member.id)}
              >
                <div className="w-12 h-12 bg-[#1e293b] rounded-full flex items-center justify-center mr-3">
                  <FaUser size={24} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-medium text-left text-white truncate">
                    {member.fullName}
                  </h2>
                  <p className="text-gray-300 text-left text-sm truncate">
                    {member.phoneNumber}
                  </p>
                </div>
                <div className="flex items-center">
                  {deletingMemberId === member.id ? (
                    <div className="p-3 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-t-2 border-white rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <button
                        className="p-3 text-white hover:text-gray-300 transition-colors rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Toggle dropdown menu
                          const dropdown = document.getElementById(
                            `dropdown-${member.id}`
                          );
                          if (dropdown) {
                            dropdown.classList.toggle("hidden");
                          }
                        }}
                        disabled={deletingMemberId !== null || updating}
                        style={{
                          opacity:
                            deletingMemberId !== null || updating ? 0.5 : 1,
                        }}
                      >
                        <div className="flex flex-col items-center justify-center h-6">
                          <div className="w-1.5 h-1.5 bg-white rounded-full mb-1"></div>
                          <div className="w-1.5 h-1.5 bg-white rounded-full mb-1"></div>
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      </button>

                      {/* Dropdown menu */}
                      <div
                        id={`dropdown-${member.id}`}
                        className="absolute right-0 mt-2 w-40 bg-gray-800 rounded-md shadow-lg z-10 hidden"
                      >
                        <div className="py-1">
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#1e293b] flex items-center"
                            onClick={(e) => handleEditClick(e, member)}
                          >
                            <FaEdit className="mr-2" /> Edit Member
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#1e293b] flex items-center"
                            onClick={(e) => handleDeleteMember(e, member.id)}
                          >
                            <FaTrash className="mr-2" /> Delete Member
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Member Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-[#0a1f2e] bg-opacity-75 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800 rounded-lg p-4 w-full max-w-xs">
            <h2 className="text-xl font-bold mb-3">Edit Member</h2>

            <form onSubmit={handleUpdateMember}>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-[#1e293b] rounded text-white text-sm"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-[#1e293b] rounded text-white text-sm"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-[#1e293b] rounded text-white text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-[#1e293b] rounded text-white text-sm"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMember(null);
                  }}
                  className="px-3 py-1.5 bg-gray-600 rounded text-sm hover:bg-[#1e293b] transition-colors"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#024a72] rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
                  disabled={updating}
                >
                  {updating ? (
                    <div className="w-5 h-5 border-2 border-t-2 border-white rounded-full animate-spin"></div>
                  ) : (
                    "Update"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllMembers;
