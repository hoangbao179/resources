const { google } = require('googleapis');
const config = require('../../config/config');

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: {
      client_email: config.google.serviceAccount.client_email,
      private_key: config.google.serviceAccount.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

async function saveToken(email, accessToken, refreshToken, expiry) {
  try {
    const existing = await getToken(email);
    if (existing) {
      const rows = await sheets.spreadsheets.values.get({
        spreadsheetId: config.google.sheetId,
        range: 'Mail-token!A:D',
      });
      const rowIndex = rows.data.values.findIndex(row => row[0] === email) + 1;

      await sheets.spreadsheets.values.update({
        spreadsheetId: config.google.sheetId,
        range: `Mail-token!A${rowIndex}:D${rowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[email, accessToken, refreshToken, expiry]],
        },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: config.google.sheetId,
        range: 'Mail-token!A:D',
        valueInputOption: 'RAW',
        resource: {
          values: [[email, accessToken, refreshToken, expiry]],
        },
      });
    }
  } catch (error) {
    throw new Error(`Lỗi khi lưu token: ${error.message}`);
  }
}

async function getToken(email) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: config.google.sheetId,
      range: 'Mail-token!A:D',
    });
    const rows = res.data.values || [];
    return rows.find(row => row[0] === email);
  } catch (error) {
    throw new Error(`Lỗi khi lấy token: ${error.message}`);
  }
}

module.exports = { saveToken, getToken };