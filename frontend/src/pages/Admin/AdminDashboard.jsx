import React, { useState } from "react";
import { FaArrowLeft, FaSignOutAlt } from "react-icons/fa";
import GymOwnersList from "./GymOwnersList";
import GymOwnerForm from "./GymOwnerForm";
import ChangePasswordForm from "./ChangePasswordForm";
import "./AdminDashboard.css";

const AdminDashboard = ({ onBackClick, onLogout }) => {
  const [view, setView] = useState("list"); // 'list', 'add', 'edit', 'changePassword'
  const [selectedGymOwner, setSelectedGymOwner] = useState(null);

  const handleAddClick = () => {
    setSelectedGymOwner(null);
    setView("add");
  };

  const handleEditClick = (gymOwner) => {
    setSelectedGymOwner(gymOwner);
    setView("edit");
  };

  const handleFormSubmitSuccess = () => {
    setView("list");
  };

  const handleBackToList = () => {
    setView("list");
  };

  const handleChangePasswordClick = (gymOwner) => {
    setSelectedGymOwner(gymOwner);
    setView("changePassword");
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-header-left">
          <button className="admin-back-button" onClick={onBackClick}>
            <FaArrowLeft />
          </button>
          <h1>Admin Dashboard</h1>
        </div>
        <button className="admin-logout-button" onClick={onLogout}>
          <FaSignOutAlt /> Logout
        </button>
      </div>

      {view === "list" && (
        <>
          <div className="admin-actions">
            <button className="admin-add-button" onClick={handleAddClick}>
              Add Gym Owner
            </button>
          </div>
          <GymOwnersList
            onEditClick={handleEditClick}
            onChangePasswordClick={handleChangePasswordClick}
          />
        </>
      )}

      {(view === "add" || view === "edit") && (
        <GymOwnerForm
          gymOwner={selectedGymOwner}
          isEdit={view === "edit"}
          onSubmitSuccess={handleFormSubmitSuccess}
          onCancel={handleBackToList}
        />
      )}

      {view === "changePassword" && selectedGymOwner && (
        <ChangePasswordForm
          gymOwner={selectedGymOwner}
          onSuccess={handleFormSubmitSuccess}
          onCancel={handleBackToList}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
