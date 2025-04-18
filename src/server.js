const express = require("express")
const { getAuthUrl, handleCallback, getValidAuth } = require("./auth/googleAuth")
const { readGmailEmails } = require("./email/gmailReader")
const config = require("../config/config")

const app = express()
app.use(express.json())
app.use(express.static("public"))

app.get("/auth", (req, res) => {
  const email = req.query.email
  if (!email) return res.status(400).send("Thiếu email")
  const url = getAuthUrl(email)
  res.redirect(url)
})

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code
  const email = req.query.state
  try {
    await handleCallback(code, email)
    res.send('Xác thực thành công! Quay lại <a href="/">trang chủ</a>.')
  } catch (error) {
    res.status(500).send(`Lỗi xác thực: ${error.message}`)
  }
})

app.post("/read-emails", async (req, res) => {
  const { email } = req.body
  try {
    // Kiểm tra email có được cung cấp không
    if (!email) {
      return res.status(400).json({ error: "Thiếu địa chỉ email" })
    }

    // Thử lấy token xác thực
    let auth
    try {
      auth = await getValidAuth(email)
    } catch (error) {
      console.error(`Lỗi xác thực: ${error.message}`)
      // Nếu không có token hoặc token không hợp lệ, trả về 401 để client chuyển hướng đến trang xác thực
      return res.status(401).json({ error: "Cần xác thực", message: error.message })
    }

    // Đọc email
    const emails = await readGmailEmails(auth)

    // Kiểm tra kết quả
    if (!emails || emails.length === 0) {
      return res.json([]) // Trả về mảng rỗng nếu không có email
    }

    res.json(emails)
  } catch (error) {
    console.error(`Lỗi đọc email: ${error.message}`)
    res.status(500).json({ error: "Lỗi server", message: error.message })
  }
})

app.listen(config.port, () => {
  console.log(`Server chạy tại http://localhost:${config.port}`)
})
