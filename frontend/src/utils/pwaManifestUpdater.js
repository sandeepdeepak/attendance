/**
 * Utility to dynamically update the PWA manifest at runtime
 */

/**
 * Resizes an image to the specified dimensions
 * @param {string} imageUrl - URL of the image to resize
 * @param {number} width - Target width
 * @param {number} height - Target height
 * @returns {Promise<string>} - Promise resolving to a data URL of the resized image
 */
const resizeImage = async (imageUrl, width, height) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Enable CORS for the image

    img.onload = () => {
      // Create a canvas element
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      // Draw the image on the canvas with the desired dimensions
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Convert the canvas to a data URL
      const dataUrl = canvas.toDataURL("image/png");
      resolve(dataUrl);
    };

    img.onerror = (error) => {
      console.error("Error loading image:", error);
      reject(error);
    };

    img.src = imageUrl;
  });
};

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
      try {
        // Resize the gym owner's logo to PWA icon dimensions
        const icon192 = await resizeImage(gymOwner.logoUrl, 192, 192);
        const icon512 = await resizeImage(gymOwner.logoUrl, 512, 512);

        // Create a link element for the 192x192 PWA icon
        let pwaIcon192 = document.querySelector('link[rel="pwa-icon-192"]');
        if (!pwaIcon192) {
          pwaIcon192 = document.createElement("link");
          pwaIcon192.rel = "pwa-icon-192";
          document.head.appendChild(pwaIcon192);
        }
        pwaIcon192.href = icon192;

        // Create a link element for the 512x512 PWA icon
        let pwaIcon512 = document.querySelector('link[rel="pwa-icon-512"]');
        if (!pwaIcon512) {
          pwaIcon512 = document.createElement("link");
          pwaIcon512.rel = "pwa-icon-512";
          document.head.appendChild(pwaIcon512);
        }
        pwaIcon512.href = icon512;

        // Update favicon
        let favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
          favicon.href = icon192;
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
        appleTouchIcon.href = icon192;

        // Add apple touch startup image
        let appleStartupImage = document.querySelector(
          'link[rel="apple-touch-startup-image"]'
        );
        if (!appleStartupImage) {
          appleStartupImage = document.createElement("link");
          appleStartupImage.rel = "apple-touch-startup-image";
          document.head.appendChild(appleStartupImage);
        }
        appleStartupImage.href = icon512;

        // Send the icons and gym owner info to the service worker
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "UPDATE_PWA_ICONS",
            icon192,
            icon512,
            gymOwner: {
              name: gymOwner.gymName,
              path: gymOwnerPath,
            },
          });
          console.log("Sent PWA icons and gym owner info to service worker");
        } else {
          console.warn("Service worker not ready yet, icons not updated");

          // Wait for the service worker to be ready
          navigator.serviceWorker.ready.then((registration) => {
            registration.active.postMessage({
              type: "UPDATE_PWA_ICONS",
              icon192,
              icon512,
              gymOwner: {
                name: gymOwner.gymName,
                path: gymOwnerPath,
              },
            });
            console.log(
              "Sent PWA icons and gym owner info to service worker (after ready)"
            );
          });
        }

        console.log("PWA icons updated with gym owner logo");
      } catch (error) {
        console.error("Error updating PWA icons:", error);
      }
    }

    console.log("PWA metadata updated for gym owner:", gymOwner.gymName);

    return true;
  } catch (error) {
    console.error("Error updating PWA metadata:", error);
    return false;
  }
};
