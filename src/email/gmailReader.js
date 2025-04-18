const { google } = require('googleapis');
const cheerio = require('cheerio');

async function readGmailEmails(auth, maxResults = 3) {
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.messages.list({ userId: 'me', maxResults });
  const messages = res.data.messages || [];

  const emails = [];
  for (const message of messages) {
    const msg = await gmail.users.messages.get({ userId: 'me', id: message.id, format: 'full' });
    const payload = msg.data.payload;
    let text = '', images = [], links = [];

    function extractParts(part) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text += Buffer.from(part.body.data, 'base64').toString();
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString();
        const $ = cheerio.load(html);
        links = $('a').map((i, el) => $(el).attr('href')).get();
        text += $.text();
      } else if (part.mimeType?.startsWith('image/') && part.body?.data) {
        images.push({
          filename: part.filename,
          data: part.body.data,
        });
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          extractParts(subPart);
        }
      }
    }

    extractParts(payload); // recursive extract

    const subject = payload.headers.find(h => h.name === 'Subject')?.value;

    emails.push({
      id: msg.data.id,
      subject,
      text: text.trim(),
      images,
      links,
    });
  }

  return emails;
}

module.exports = { readGmailEmails };
