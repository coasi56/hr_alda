const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar',
  ],
});

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth });
}

function getCalendarClient() {
  return google.calendar({ version: 'v3', auth });
}

module.exports = { getSheetsClient, getCalendarClient };
