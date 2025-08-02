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
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});
