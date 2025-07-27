const { google } = require("googleapis");
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json", // path to your service account key
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function updateAttendance(data) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const spreadsheetId = "1kmwq7-lE1OOrOj1s2DqwhCT2b9DdkVUVWGDtPWWFYIU";
  const range = "Members!A2:D"; // adjust to your sheet/tab

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: data, // e.g., [['John', '2025-07-27', '08:00', '09:00']]
    },
  });

  console.log("Attendance updated in Google Sheets!");
}

module.exports = { updateAttendance };
