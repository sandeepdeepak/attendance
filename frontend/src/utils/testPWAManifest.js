/**
 * Test utility for PWA manifest updates
 * This file can be used to manually test the PWA manifest update functionality
 */

import { updatePWAManifest } from "./pwaManifestUpdater";

/**
 * Test function to simulate updating the PWA manifest with a gym owner
 */
export const testManifestUpdate = () => {
  // Mock gym owner data
  const mockGymOwner = {
    gymName: "Test Gym",
    logoUrl: "https://example.com/logo.png",
  };

  console.log("Testing PWA manifest update with mock gym owner:", mockGymOwner);

  // Call the update function
  updatePWAManifest(mockGymOwner)
    .then((updatedManifest) => {
      console.log("Manifest updated successfully:", updatedManifest);
    })
    .catch((error) => {
      console.error("Error updating manifest:", error);
    });
};

// To test, import this function and call it from the browser console:
// import { testManifestUpdate } from './utils/testPWAManifest';
// testManifestUpdate();
