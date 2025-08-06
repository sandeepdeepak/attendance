/**
 * Utility to dynamically update the PWA manifest at runtime
 */

/**
 * Updates the PWA manifest with gym owner information
 * @param {Object} gymOwner - The gym owner object with properties like gymName and logoUrl
 */
export const updatePWAManifest = async (gymOwner) => {
  if (!gymOwner) return;

  try {
    // Check if the manifest link exists
    let manifestLink = document.querySelector('link[rel="manifest"]');

    // If no manifest link is found, create one
    if (!manifestLink) {
      console.warn("No manifest link found in the document, creating one");
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = "/manifest.webmanifest";
      document.head.appendChild(manifestLink);
    }

    // Fetch the current manifest
    const manifestUrl = manifestLink.href;
    const response = await fetch(manifestUrl);
    const manifest = await response.json();

    // Get the current path for the gym owner
    const path = window.location.pathname;
    const pathSegments = path.split("/").filter((segment) => segment);
    const gymOwnerPath = pathSegments.length > 0 ? `/${pathSegments[0]}` : "/";

    // Create a new manifest with updated properties
    const updatedManifest = {
      ...manifest,
      name: gymOwner.gymName || manifest.name,
      short_name: gymOwner.gymName || manifest.short_name,
      start_url: gymOwnerPath, // Set the start_url to the gym owner's path
      scope: "/", // Ensure the scope includes the start_url
    };

    // If the gym owner has a logo, update the icons
    if (gymOwner.logoUrl) {
      // Keep the original icons as fallback
      const originalIcons = manifest.icons || [];

      // Add the gym owner's logo as the primary icon
      updatedManifest.icons = [
        {
          src: gymOwner.logoUrl,
          sizes: "192x192", // Assume the logo can be used at this size
          type: "image/png",
        },
        {
          src: gymOwner.logoUrl,
          sizes: "512x512", // Assume the logo can be used at this size
          type: "image/png",
        },
        {
          src: gymOwner.logoUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
        ...originalIcons, // Keep original icons as fallback
      ];
    }

    // Create a Blob with the updated manifest
    const manifestBlob = new Blob([JSON.stringify(updatedManifest)], {
      type: "application/json",
    });

    // Create a URL for the Blob
    const updatedManifestUrl = URL.createObjectURL(manifestBlob);

    // Update the manifest link
    manifestLink.href = updatedManifestUrl;

    console.log(
      "PWA manifest updated with gym owner information:",
      updatedManifest
    );

    // If the PWA is already installed, prompt for reload to apply changes
    if (window.matchMedia("(display-mode: standalone)").matches) {
      if (confirm("App updated. Reload to apply changes?")) {
        window.location.reload();
      }
    }

    return updatedManifest;
  } catch (error) {
    console.error("Error updating PWA manifest:", error);
  }
};
