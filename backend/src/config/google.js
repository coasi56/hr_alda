const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(__dirname, '../../../google-credentials.json'),
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