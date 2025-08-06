import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { API_URL } from "./config";
import { updatePWAManifest } from "./utils/pwaManifestUpdater";

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

const VAPID_PUBLIC_KEY =
  "BLAaXng_kgEkQVcxalwNVoFO3A7VJgTTGFueVyyc-sOyPSqDy5AmaICGebKXwAOq6fyFu3vlE7OB1759-ZRP3aA";

// Function to request permission and subscribe
async function subscribeToPush() {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }
  if (!("PushManager" in window)) {
    console.warn("Push notifications not supported");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.log("Notification permission not granted");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    console.log("Push Subscription:", JSON.stringify(subscription));
    // Send subscription to your backend here
    const response = await fetch(`${API_URL}/api/push-subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });
    console.log("Subscription response:", await response.json());
  } catch (error) {
    console.error("Failed to subscribe user:", error);
  }
}

// Initialize PWA functionality
const initializePWA = async () => {
  try {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => {
        // subscribeToPush();
        console.log("Service worker ready");
      });

      // Extract the path from the URL to check for gym owner
      const path = window.location.pathname;
      const pathSegments = path.split("/").filter((segment) => segment);

      // If there's a path segment that might be a gym owner identifier
      if (pathSegments.length > 0) {
        const identifier = pathSegments[0];

        // Try to fetch gym owner information
        try {
          const response = await fetch(
            `${API_URL}/api/gym-owner/${identifier}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.gymOwner) {
              // Pre-initialize the PWA manifest with gym owner info
              // This is a backup in case the HomePage component hasn't loaded yet
              updatePWAManifest(data.gymOwner);
            }
          }
        } catch (error) {
          console.error("Error pre-initializing PWA manifest:", error);
        }
      }
    }
  } catch (error) {
    console.error("Error initializing PWA:", error);
  }
};

// Initialize PWA
initializePWA();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
