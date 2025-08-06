import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaKey } from "react-icons/fa";
import { API_URL } from "../../config";

const GymOwnersList = ({ onEditClick, onChangePasswordClick }) => {
  const [gymOwners, setGymOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  useEffect(() => {
    fetchGymOwners();
  }, []);

  const fetchGymOwners = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${API_URL}/api/admin/gym-owners`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch gym owners");
      }

      const data = await response.json();
      setGymOwners(data.gymOwners || []);
    } catch (error) {
      console.error("Error fetching gym owners:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (email) => {
    setDeleteConfirmation(email);
  };

  const handleDeleteConfirm = async (email) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${API_URL}/api/admin/gym-owners/${email}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete gym owner");
      }

      // Refresh the list
      fetchGymOwners();
    } catch (error) {
      console.error("Error deleting gym owner:", error);
      setError(error.message);
    } finally {
      setDeleteConfirmation(null);
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation(null);
  };

  if (loading && gymOwners.length === 0) {
    return <div className="admin-loading">Loading gym owners...</div>;
  }

  if (error) {
    return <div className="admin-error">Error: {error}</div>;
  }

  return (
    <div className="gym-owners-list">
      <h2>Gym Owners</h2>
      {gymOwners.length === 0 ? (
        <p>No gym owners found.</p>
      ) : (
        <table className="gym-owners-table">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Email</th>
              <th>Gym Name</th>
              <th>Admin</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {gymOwners.map((owner) => (
              <tr key={owner.email}>
                <td className="logo-cell">
                  {owner.logoUrl ? (
                    <img
                      src={owner.logoUrl}
                      alt={`${owner.gymName} Logo`}
                      className="gym-logo-thumbnail"
                    />
                  ) : (
                    <div className="no-logo-placeholder">No Logo</div>
                  )}
                </td>
                <td>{owner.email}</td>
                <td>{owner.gymName}</td>
                <td>{owner.isAdmin ? "Yes" : "No"}</td>
                <td className="actions-cell h-25">
                  <button
                    className="edit-button"
                    onClick={() => onEditClick(owner)}
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="password-button"
                    onClick={() => onChangePasswordClick(owner)}
                    title="Change Password"
                  >
                    <FaKey />
                  </button>
                  {deleteConfirmation === owner.email ? (
                    <div className="delete-confirmation">
                      <button
                        className="confirm-button"
                        onClick={() => handleDeleteConfirm(owner.email)}
                        title="Confirm"
                      >
                        <FaCheck />
                      </button>
                      <button
                        className="cancel-button"
                        onClick={handleDeleteCancel}
                        title="Cancel"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteClick(owner.email)}
                      title="Delete"
                      disabled={
                        owner.isAdmin &&
                        gymOwners.filter((o) => o.isAdmin).length <= 1
                      }
                    >
                      <FaTrash />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default GymOwnersList;
