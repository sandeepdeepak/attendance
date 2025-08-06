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
    console.log("Updating PWA manifest with gym owner:", gymOwner);

    // Get the current path for the gym owner
    const path = window.location.pathname;
    const pathSegments = path.split("/").filter((segment) => segment);
    const gymOwnerPath = pathSegments.length > 0 ? `/${pathSegments[0]}` : "/";

    // Create a meta tag for the gym owner's name
    let appNameMeta = document.querySelector('meta[name="application-name"]');
    if (!appNameMeta) {
      appNameMeta = document.createElement("meta");
      appNameMeta.name = "application-name";
      document.head.appendChild(appNameMeta);
    }
    appNameMeta.content = gymOwner.gymName || "SD GYM";

    // Create a meta tag for the gym owner's short name
    let shortNameMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-title"]'
    );
    if (!shortNameMeta) {
      shortNameMeta = document.createElement("meta");
      shortNameMeta.name = "apple-mobile-web-app-title";
      document.head.appendChild(shortNameMeta);
    }
    shortNameMeta.content = gymOwner.gymName || "SD GYM";

    // Update the page title
    document.title = gymOwner.gymName || document.title;

    // Update favicon and apple touch icon if gym owner has a logo
    if (gymOwner.logoUrl) {
      // Update favicon
      let favicon = document.querySelector('link[rel="icon"]');
      if (favicon) {
        favicon.href = gymOwner.logoUrl;
      }

      // Add apple touch icon
      let appleTouchIcon = document.querySelector(
        'link[rel="apple-touch-icon"]'
      );
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement("link");
        appleTouchIcon.rel = "apple-touch-icon";
        document.head.appendChild(appleTouchIcon);
      }
      appleTouchIcon.href = gymOwner.logoUrl;

      // Add apple touch startup image
      let appleStartupImage = document.querySelector(
        'link[rel="apple-touch-startup-image"]'
      );
      if (!appleStartupImage) {
        appleStartupImage = document.createElement("link");
        appleStartupImage.rel = "apple-touch-startup-image";
        document.head.appendChild(appleStartupImage);
      }
      appleStartupImage.href = gymOwner.logoUrl;
    }

    console.log("PWA metadata updated for gym owner:", gymOwner.gymName);

    return true;
  } catch (error) {
    console.error("Error updating PWA metadata:", error);
    return false;
  }
};
