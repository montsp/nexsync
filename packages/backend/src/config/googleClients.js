const { google } = require('googleapis');
const path = require('path');
const fs = require('fs'); // fsモジュールをインポート
require('dotenv').config();

const KEYFILEPATH = path.join(__dirname, '../../credentials.json');

// --- Debugging Start ---
console.log('--- Initializing Google Clients ---');
console.log(`Attempting to load credentials from: ${KEYFILEPATH}`);

// 1. Check if credentials.json exists
if (!fs.existsSync(KEYFILEPATH)) {
    throw new Error(`FATAL: Credentials file not found at path: ${KEYFILEPATH}. Please ensure 'credentials.json' is in the 'packages/backend' directory.`);
}
console.log('Credentials file found.');

// 2. Check if GOOGLE_SHEET_ID is loaded
const googleSheetId = process.env.GOOGLE_SHEET_ID;
if (!googleSheetId || googleSheetId === 'YOUR_GOOGLE_SHEET_ID') {
    throw new Error(`FATAL: GOOGLE_SHEET_ID is not set correctly in the .env file. Current value: ${googleSheetId}`);
}
console.log(`Google Sheet ID loaded: ${googleSheetId}`);
// --- Debugging End ---

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

module.exports = { sheets, drive, auth, googleSheetId };
