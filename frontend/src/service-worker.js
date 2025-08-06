self.addEventListener("push", (event) => {
  console.log("Push event received:", event);
  console.log("self.registration", self.registration);
  const data = event.data?.json() || {};

  const title = data.title || "Notification";
  const options = {
    body: data.body || "You have a new message.",
    icon: "pwa-192x192.png",
    badge: "pwa-192x192.png",
  };

  console.log("Notification data:", data);
  console.log("Notification title:", title);
  console.log("Notification options:", options);

  event.waitUntil(self.registration.showNotification(title, options));
});

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

// Handle fetch events to ensure proper caching
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // If no match in cache, try to return the index.html as fallback
          return caches.match("/");
        });
      })
    );
  }
});
