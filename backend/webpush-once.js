const webPush = require("web-push");

// const vapidKeys = webPush.generateVAPIDKeys();

// console.log(vapidKeys);

webPush.setVapidDetails(
  "mailto:support@sdgym.com",
  "BLAaXng_kgEkQVcxalwNVoFO3A7VJgTTGFueVyyc-sOyPSqDy5AmaICGebKXwAOq6fyFu3vlE7OB1759-ZRP3aA",
  "TxrtKlVEK9FzUPdDTtXcCGBtxkPYd-sIgjoBODuK3Ts"
);

webPush
  .sendNotification(
    {
      endpoint:
        "https://fcm.googleapis.com/fcm/send/doPXmF42r84:APA91bERckdEWgzJT0rEZCqMNNsf7cfuOetpepDtBWK7BzsQUL382iL5SMTGM5zEgWdhQEu_g6YxY9dCFsHJjcL3yER4S1mcljy2QC28JfDX_phLdk0ujD5Gr9FH-MMKLefyxBSdn3ap",
      expirationTime: null,
      keys: {
        p256dh:
          "BHeHGo4_FT-bkwqCRdxIL-BzwmOboqQzmskt0euNvG0Y7ApLy8RR1sP-zdcGs4Pb8SQ9En1sywvds4OSYBg-SgU",
        auth: "xVeok1UAFr0qb_IyQ9L2Sw",
      },
    },
    JSON.stringify({
      title: "Hello User!",
      body: "Here is a notification just for you.",
    })
  )
  .then(() => {
    console.log("Push Notification sent successfully!");
  })
  .catch((err) => {
    console.error("Error sending notification", err);
  });
