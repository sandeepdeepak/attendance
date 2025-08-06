// This is a custom service worker that will be used by the VitePWA plugin

// Store for dynamically generated PWA icons and manifest
const DYNAMIC_ICON_CACHE = "dynamic-pwa-icons";
const DYNAMIC_MANIFEST_CACHE = "dynamic-pwa-manifest";

// Listen for the message event to receive icon updates from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "UPDATE_PWA_ICONS") {
    const { icon192, icon512, gymOwner } = event.data;

    // Store the icons in the cache
    caches.open(DYNAMIC_ICON_CACHE).then((cache) => {
      // Cache the icons with special URLs that we'll intercept later
      cache.put(
        "/pwa-192x192.png",
        new Response(dataURItoBlob(icon192), {
          headers: { "Content-Type": "image/png" },
        })
      );

      cache.put(
        "/pwa-512x512.png",
        new Response(dataURItoBlob(icon512), {
          headers: { "Content-Type": "image/png" },
        })
      );

      console.log("PWA icons cached in service worker");
    });

    // Update the manifest with the gym owner's name
    if (gymOwner && gymOwner.name) {
      // Fetch the current manifest
      fetch("/manifest.webmanifest")
        .then((response) => response.json())
        .then((manifest) => {
          // Update the manifest with the gym owner's name
          manifest.name = gymOwner.name;
          manifest.short_name = gymOwner.name;

          // Store the updated manifest in the cache
          caches.open(DYNAMIC_MANIFEST_CACHE).then((cache) => {
            cache.put(
              "/manifest.webmanifest",
              new Response(JSON.stringify(manifest), {
                headers: { "Content-Type": "application/manifest+json" },
              })
            );
            console.log(
              "PWA manifest updated with gym owner name:",
              gymOwner.name
            );
          });
        })
        .catch((error) => {
          console.error("Error updating manifest:", error);
        });
    }
  }
});

// Helper function to convert data URI to Blob
function dataURItoBlob(dataURI) {
  // Convert base64 to raw binary data held in a string
  const byteString = atob(dataURI.split(",")[1]);

  // Separate out the mime component
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

  // Write the bytes of the string to an ArrayBuffer
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
}

// Intercept fetch requests for PWA icons and manifest
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Check if the request is for a PWA icon
  if (
    url.pathname.endsWith("/pwa-192x192.png") ||
    url.pathname.endsWith("/pwa-512x512.png")
  ) {
    event.respondWith(
      caches.match(url.pathname).then((response) => {
        // If we have a cached version of the icon, return it
        if (response) {
          return response;
        }

        // Otherwise, fetch the default icon
        return fetch(event.request);
      })
    );
  }

  // Check if the request is for the manifest
  if (url.pathname.endsWith("/manifest.webmanifest")) {
    event.respondWith(
      caches.open(DYNAMIC_MANIFEST_CACHE).then((cache) => {
        return cache.match("/manifest.webmanifest").then((response) => {
          // If we have a cached version of the manifest, return it
          if (response) {
            return response;
          }

          // Otherwise, fetch the default manifest
          return fetch(event.request);
        });
      })
    );
  }
});

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("Push event received:", event);
  const data = event.data?.json() || {};

  const title = data.title || "Notification";
  const options = {
    body: data.body || "You have a new message.",
    icon: "pwa-192x192.png",
    badge: "pwa-192x192.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Try to get the current path to preserve gym owner context
      const url = self.registration.scope;
      const pathMatch = url.match(/https?:\/\/[^\/]+(\/[^\/]+)/);
      const gymOwnerPath = pathMatch ? pathMatch[1] : "/";

      if (clients.openWindow) {
        return clients.openWindow(gymOwnerPath);
      }
    })
  );
});
