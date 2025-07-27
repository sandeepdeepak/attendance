const { google } = require("googleapis");
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json", // path to your service account key
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function updateMembers(data) {
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

  console.log("Members updated in Google Sheets!");
}

async function readMembers() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const spreadsheetId = "1kmwq7-lE1OOrOj1s2DqwhCT2b9DdkVUVWGDtPWWFYIU";
  const range = "Members!A2:D"; // Adjust to match the data range

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;

  if (!rows || rows.length === 0) {
    console.log("No member data found.");
    return [];
  }

  console.log("Members fetched from Google Sheets:", rows);
  return rows; // Array of arrays, e.g., [['John', '2025-07-27', '08:00', '09:00']]
}

module.exports = { updateMembers, readMembers };
