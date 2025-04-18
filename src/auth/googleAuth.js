const { google } = require("googleapis")
const config = require("../../config/config")
const { saveToken, getToken } = require("../sheets/tokenStorage")

const oauth2Client = new google.auth.OAuth2(
  config.google.credentials.web.client_id,
  config.google.credentials.web.client_secret,
  config.google.credentials.web.redirect_uris[0],
)

function getAuthUrl(email) {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    state: email,
    prompt: "consent",
  })
}

async function handleCallback(code, email) {
  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)
    await saveToken(email, tokens.access_token, tokens.refresh_token, tokens.expiry_date)
    return tokens
  } catch (error) {
    throw new Error(`Lỗi khi lấy token: ${error.message}`)
  }
}

// Cải thiện hàm getValidAuth để xử lý lỗi tốt hơn
async function getValidAuth(email) {
  const token = await getToken(email)
  if (!token) {
    throw new Error(`Không tìm thấy token cho ${email}. Cần xác thực lại.`)
  }

  oauth2Client.setCredentials({
    access_token: token[1],
    refresh_token: token[2],
    expiry_date: Number.parseInt(token[3]),
  })

  // Kiểm tra token hết hạn
  if (Date.now() > Number.parseInt(token[3])) {
    console.log(`Access Token cho ${email} đã hết hạn, đang làm mới...`)
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      await saveToken(email, credentials.access_token, credentials.refresh_token || token[2], credentials.expiry_date)
      oauth2Client.setCredentials(credentials)
    } catch (error) {
      console.error(`Không thể làm mới token: ${error.message}`)
      throw new Error(`Token hết hạn và không thể làm mới. Cần xác thực lại.`)
    }
  }

  return oauth2Client
}

module.exports = { getAuthUrl, handleCallback, getValidAuth }
