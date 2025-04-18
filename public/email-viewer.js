// Helper function to safely render HTML content
function createEmailIframe(container) {
    // Clear previous content
    container.innerHTML = ""
  
    // Create iframe for email content
    const iframe = document.createElement("iframe")
    iframe.style.width = "100%"
    iframe.style.border = "none"
    iframe.style.overflow = "hidden" // Hide scrollbars
  
    // Add to container
    container.appendChild(iframe)
  
    return iframe
  }
  
  // Function to render email content safely
  function renderEmailContent(container, emailData) {
    // Create iframe
    const iframe = createEmailIframe(container)
  
    // Get document reference
    const doc = iframe.contentDocument || iframe.contentWindow.document
  
    // Determine if content is HTML
    const isHTML =
      emailData.text.includes("<html") ||
      emailData.text.includes("<body") ||
      emailData.text.includes("<div") ||
      emailData.text.includes("<table") ||
      emailData.text.includes("<img")
  
    // Prepare content
    let content = ""
  
    if (isHTML) {
      // Use the HTML content directly
      content = emailData.text
  
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
                /* Fix for common email layout issues */
                .gmail-fix {
                  max-width: 600px !important;
                  width: 100% !important;
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
            }
            img {
              max-width: 100%;
              height: auto;
            }
            table {
              max-width: 100%;
            }
            /* Fix for common email layout issues */
            .gmail-fix {
              max-width: 600px !important;
              width: 100% !important;
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
      let processedText = emailData.text
  
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
  
    // Function to resize iframe based on content height
    function resizeIframe() {
      // Get the height of the iframe content
      const height = iframe.contentWindow.document.body.scrollHeight
      // Set iframe height to match content
      iframe.style.height = height + "px"
    }
  
    // Resize on load
    iframe.onload = resizeIframe
  
    // Also resize after a short delay to handle dynamic content
    setTimeout(resizeIframe, 100)
  
    // Set up a resize observer to handle dynamic content changes
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        resizeIframe()
      })
      ro.observe(iframe.contentWindow.document.body)
    } else {
      // Fallback for browsers without ResizeObserver
      // Periodically check for size changes
      setInterval(resizeIframe, 1000)
    }
  
    // Also resize when images load
    const images = iframe.contentWindow.document.querySelectorAll("img")
    images.forEach((img) => {
      img.onload = resizeIframe
    })
  }
  
  // Function to format date
  function formatDate(dateString) {
    if (!dateString) return ""
  
    try {
      const date = new Date(dateString)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
  
      if (isToday) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      } else {
        return date.toLocaleDateString()
      }
    } catch (e) {
      return dateString
    }
  }
  
  // Function to extract text preview from HTML
  function extractTextPreview(html, maxLength = 100) {
    if (!html) return ""
  
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = html
  
    // Get text content
    let text = tempDiv.textContent || tempDiv.innerText || ""
  
    // Remove extra whitespace
    text = text.replace(/\s+/g, " ").trim()
  
    // Truncate if needed
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + "..."
    }
  
    return text
  }
  