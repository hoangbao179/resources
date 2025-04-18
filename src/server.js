const express = require('express');
const { getAuthUrl, handleCallback, getValidAuth } = require('./auth/googleAuth');
const { readGmailEmails } = require('./email/gmailReader');
const config = require('../config/config');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.get('/auth', (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send('Thiếu email');
  const url = getAuthUrl(email);
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  const email = req.query.state;
  try {
    await handleCallback(code, email);
    res.send('Xác thực thành công! Quay lại <a href="/">trang chủ</a>.');
  } catch (error) {
    res.status(500).send(`Lỗi xác thực: ${error.message}`);
  }
});

app.post('/read-emails', async (req, res) => {
  const { email } = req.body;
  try {
    const auth = await getValidAuth(email);
    const emails = await readGmailEmails(auth);
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(config.port, () => {
  console.log(`Server chạy tại http://localhost:${config.port}`);
});