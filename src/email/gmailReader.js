const { google } = require("googleapis")
const cheerio = require("cheerio")

async function readGmailEmails(auth, maxResults = 10) {
  const gmail = google.gmail({ version: "v1", auth })
  const res = await gmail.users.messages.list({ userId: "me", maxResults })
  const messages = res.data.messages || []

  const emails = []
  for (const message of messages) {
    try {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full",
      })

      const payload = msg.data.payload
      let text = "",
        html = "",
        images = [],
        links = []

      // Function to decode base64 content
      function decodeBase64(data) {
        if (!data) return ""
        // Replace URL-safe characters back to standard base64
        const normalizedData = data.replace(/-/g, "+").replace(/_/g, "/")
        try {
          return Buffer.from(normalizedData, "base64").toString("utf-8")
        } catch (e) {
          console.error("Error decoding base64:", e)
          return ""
        }
      }

      // Function to extract parts recursively
      function extractParts(part) {
        if (!part) return

        // Handle text/plain parts
        if (part.mimeType === "text/plain" && part.body?.data) {
          text += decodeBase64(part.body.data)
        }

        // Handle text/html parts
        else if (part.mimeType === "text/html" && part.body?.data) {
          html += decodeBase64(part.body.data)

          // Extract links from HTML
          try {
            const $ = cheerio.load(html)
            links = $("a")
              .map((i, el) => $(el).attr("href"))
              .get()
              .filter((link) => link && link.trim() !== "" && !link.startsWith("#"))
          } catch (e) {
            console.error("Error parsing HTML:", e)
          }
        }

        // Handle image attachments
        else if (part.mimeType?.startsWith("image/") && part.body?.data) {
          images.push({
            filename: part.filename,
            data: part.body.data,
          })
        }

        // Process nested parts
        if (part.parts) {
          for (const subPart of part.parts) {
            extractParts(subPart)
          }
        }
      }

      // Start extracting parts
      extractParts(payload)

      // Use HTML content if available, otherwise use plain text
      const emailContent = html || text

      // Extract headers
      const subject = payload.headers.find((h) => h.name.toLowerCase() === "subject")?.value || ""
      const from = payload.headers.find((h) => h.name.toLowerCase() === "from")?.value || ""
      const date = payload.headers.find((h) => h.name.toLowerCase() === "date")?.value || ""

      emails.push({
        id: msg.data.id,
        subject,
        from,
        date,
        text: emailContent,
        images,
        links,
      })
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error)
    }
  }

  return emails
}

module.exports = { readGmailEmails }
