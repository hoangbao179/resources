let currentEmails = []
let selectedEmailId = null

// Function to extract a text preview from HTML content
function extractTextPreview(html, maxLength = 150) {
  if (!html) return ""

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement("div")
  tempDiv.innerHTML = html

  // Get text content
  let text = tempDiv.textContent || tempDiv.innerText || ""

  // Remove extra whitespace
  text = text.replace(/\s+/g, " ").trim()

  // Remove tracking URLs
  text = text.replace(/https?:\/\/[^\s]+\.(png|jpg|gif|jpeg)\S*/gi, "")
  text = text.replace(/https?:\/\/[^\s]+\/(open|track|pixel|wf\/open)\S*/gi, "")

  // Truncate the text and add ellipsis if it exceeds maxLength
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "..."
  }

  return text
}

async function readEmails() {
  const email = document.getElementById("emailInput").value
  if (!email) {
    alert("Vui lòng nhập email!")
    return
  }

  // Show loading state
  const emailList = document.getElementById("emailList")
  emailList.innerHTML = '<div class="loading-indicator">Đang tải...</div>'

  const emailContent = document.getElementById("emailContent")
  emailContent.innerHTML = '<div class="loading-indicator">Đang tải...</div>'

  try {
    const response = await fetch("/read-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    if (response.status === 500) {
      // Need authentication
      window.location.href = `/auth?email=${encodeURIComponent(email)}`
      return
    }

    currentEmails = await response.json()
    renderEmailList(currentEmails)

    // Select first email if available
    if (currentEmails.length > 0) {
      selectEmail(currentEmails[0].id)
    } else {
      emailContent.innerHTML = '<div class="no-email-selected">Không tìm thấy email nào</div>'
    }
  } catch (error) {
    console.error("Lỗi:", error)
    emailList.innerHTML = '<div class="loading-indicator">Có lỗi xảy ra, vui lòng thử lại.</div>'
    emailContent.innerHTML = '<div class="no-email-selected">Có lỗi xảy ra, vui lòng thử lại.</div>'
  }
}

function renderEmailList(emails) {
  const emailList = document.getElementById("emailList")
  emailList.innerHTML = ""

  emails.forEach((email) => {
    const preview = extractTextPreview(email.text)
    const listItem = document.createElement("li")
    listItem.className = `email-item ${email.id === selectedEmailId ? "active" : ""}`
    listItem.setAttribute("data-id", email.id)
    listItem.innerHTML = `
      <div class="email-item-header">
        <div class="email-item-subject">${email.subject || "(Không có tiêu đề)"}</div>
        <div class="email-item-date">${formatDate(email.date)}</div>
      </div>
      <div class="email-item-preview">${preview}</div>
    `
    listItem.addEventListener("click", () => selectEmail(email.id))
    emailList.appendChild(listItem)
  })
}

function selectEmail(emailId) {
  selectedEmailId = emailId

  // Update active state in list
  document.querySelectorAll(".email-item").forEach((item) => {
    if (item.getAttribute("data-id") === emailId) {
      item.classList.add("active")
    } else {
      item.classList.remove("active")
    }
  })

  // Find the selected email
  const email = currentEmails.find((e) => e.id === emailId)
  if (!email) return

  // Render email content
  const emailContent = document.getElementById("emailContent")

  // Create simplified email view with just header and content
  emailContent.innerHTML = `
    <div class="email-header">
      <div class="email-subject">${email.subject || "(Không có tiêu đề)"}</div>
      <div class="email-from">Từ: ${email.from || "Người gửi"}</div>
      <div class="email-date">${formatDate(email.date)}</div>
    </div>
    <div class="email-body" id="emailBody"></div>
  `

  // Render email content in iframe
  const emailBody = document.getElementById("emailBody")
  renderEmailContent(emailBody, email.text)
}

function renderEmailContent(container, htmlContent) {
  // Clear previous content
  container.innerHTML = ""

  // Create iframe for email content
  const iframe = document.createElement("iframe")
  iframe.style.width = "100%"
  iframe.style.height = "100%"
  iframe.style.border = "none"

  // Add to container
  container.appendChild(iframe)

  // Get document reference
  const doc = iframe.contentDocument || iframe.contentWindow.document

  // Determine if content is HTML
  const isHTML =
    htmlContent.includes("<html") ||
    htmlContent.includes("<body") ||
    htmlContent.includes("<div") ||
    htmlContent.includes("<table") ||
    htmlContent.includes("<img")

  // Prepare content
  let content = ""

  if (isHTML) {
    // Use the HTML content directly
    content = htmlContent

    // If it's not a complete HTML document, wrap it
    if (!content.includes("<html")) {
      content = `
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                color: #202124;
                font-size: 14px;
                line-height: 1.5;
                overflow-y: auto;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              a {
                color: #1a73e8;
                text-decoration: none;
              }
              a:hover {
                text-decoration: underline;
              }
              table {
                max-width: 100%;
              }
              td, th {
                padding: 4px;
              }
              /* Hide tracking pixels */
              img[width="1"], img[height="1"], 
              img[width="0"], img[height="0"],
              img[style*="width:1px"], img[style*="height:1px"],
              img[style*="width: 1px"], img[style*="height: 1px"] {
                display: none !important;
              }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `
    } else {
      // If it's a complete HTML document, we need to modify it to fix common issues
      // Add base target to open links in new tab
      content = content.replace("<head>", '<head><base target="_blank">')

      // Add viewport meta tag if missing
      if (!content.includes("viewport")) {
        content = content.replace(
          "<head>",
          '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">',
        )
      }

      // Add CSS to fix common email rendering issues
      content = content.replace(
        "</head>",
        `
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            overflow-y: auto;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          table {
            max-width: 100%;
          }
          /* Make sure content doesn't overflow */
          * {
            max-width: 100%;
            box-sizing: border-box;
          }
          /* Hide tracking pixels */
          img[width="1"], img[height="1"], 
          img[width="0"], img[height="0"],
          img[style*="width:1px"], img[style*="height:1px"],
          img[style*="width: 1px"], img[style*="height: 1px"] {
            display: none !important;
          }
        </style>
      </head>`,
      )
    }
  } else {
    // Process plain text to handle tracking pixels and URLs
    let processedText = htmlContent

    // Hide tracking pixels by removing lines with tracking URLs
    processedText = processedText.replace(/https?:\/\/[^\s]+\.(png|jpg|gif|jpeg)\S*/gi, "")
    processedText = processedText.replace(/https?:\/\/[^\s]+\/(open|track|pixel|wf\/open)\S*/gi, "")

    // Convert plain text to HTML
    content = `
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #202124;
              font-size: 14px;
              line-height: 1.5;
              overflow-y: auto;
            }
            a {
              color: #1a73e8;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              margin: 0;
              font-family: Arial, sans-serif;
            }
          </style>
        </head>
        <body>
          <pre>${processedText.replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank">$&</a>')}</pre>
        </body>
      </html>
    `
  }

  // Write content to iframe
  doc.open()
  doc.write(content)
  doc.close()

  // Add event listener to make links open in new tab
  const links = doc.querySelectorAll("a")
  links.forEach((link) => {
    link.setAttribute("target", "_blank")
    link.setAttribute("rel", "noopener noreferrer")
  })

  // Hide tracking pixels that might have been missed by CSS
  const trackingPixels = doc.querySelectorAll('img[width="1"], img[height="1"], img[width="0"], img[height="0"]')
  trackingPixels.forEach((img) => {
    img.style.display = "none"
  })
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("emailInput")

  // Add enter key support
  emailInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      readEmails()
    }
  })

  // Focus the input field
  emailInput.focus()
})

function formatDate(dateString) {
  if (!dateString) return ""

  try {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0") // Month is 0-indexed
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")

    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch (e) {
    // If date parsing fails, return the original string
    return dateString
  }
}
