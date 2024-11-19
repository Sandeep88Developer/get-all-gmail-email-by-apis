const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const fs = require('fs');

// Load client secrets from credentials.json
const CREDENTIALS = require('./credentials.json');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// OAuth2 Configuration
const oAuth2Client = new google.auth.OAuth2(
  CREDENTIALS.web.client_id,
  CREDENTIALS.web.client_secret,
  CREDENTIALS.web.redirect_uris[0]
);

// Read tokens.json to load saved credentials
if (fs.existsSync('tokens.json')) {
    const tokens = JSON.parse(fs.readFileSync('tokens.json'));
    oAuth2Client.setCredentials(tokens);
  }
  
// Define the Gmail API scope
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Step 1: Redirect to Google's OAuth 2.0 Consent Screen
app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  res.redirect(authUrl);
});

async function listAllMessages(auth) {
    const gmail = google.gmail({ version: 'v1', auth });
    let messages = [];
    let nextPageToken = null;

    do {
        // Fetch a batch of emails
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 100, // Adjust the batch size (max is 500)
            pageToken: nextPageToken, // Use token to fetch the next page
        });

        // Collect messages
        if (response.data.messages) {
            messages = messages.concat(response.data.messages);
        }

        // Update the page token for the next iteration
        nextPageToken = response.data.nextPageToken;
    } while (nextPageToken); // Continue until there are no more pages

    return messages;
}

// Step 2: Handle the OAuth 2.0 Redirect
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  try {
    // Exchange authorization code for access token
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Save the tokens to reuse later (optional)
    fs.writeFileSync('tokens.json', JSON.stringify(tokens));
    res.send('Authentication successful! You can now access Gmail API.');
  } catch (error) {
    console.error('Error retrieving access token:', error);
    res.status(500).send('Authentication failed.');
  }
});

// Express route to fetch all emails
app.get('/emails', async (req, res) => {
    try {
        // Load saved tokens
        const tokens = JSON.parse(fs.readFileSync('tokens.json'));
        oAuth2Client.setCredentials(tokens);

        // Fetch all emails
        const messages = await listAllMessages(oAuth2Client);

        res.json({ count: messages.length, emails: messages });
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).send('Error fetching emails');
    }
});


async function getEmailDetails(auth, messageId) {
    const gmail = google.gmail({ version: 'v1', auth });

    const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
    });

    // Extract key parts (e.g., subject, snippet)
    const headers = response.data.payload.headers;
    const subject = headers.find((header) => header.name === 'Subject')?.value;
    const snippet = response.data.snippet;

    return { id: messageId, subject, snippet };
}

// Fetch details for all emails
app.get('/emails/details', async (req, res) => {
    try {
        const tokens = JSON.parse(fs.readFileSync('tokens.json'));
        oAuth2Client.setCredentials(tokens);

        const messages = await listAllMessages(oAuth2Client);

        // Fetch detailed information for each email
        const detailedEmails = await Promise.all(
            messages.map((msg) => getEmailDetails(oAuth2Client, msg.id))
        );

        res.json(detailedEmails);
    } catch (error) {
        console.error('Error fetching email details:', error);
        res.status(500).send('Error fetching email details');
    }
});

// Function to fetch all email IDs
async function fetchAllEmailIds(auth) {
    const gmail = google.gmail({ version: 'v1', auth });
    let messages = [];
    let nextPageToken = null;
  
    do {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 10, // Batch size (adjust as needed)
        pageToken: nextPageToken,
      });
  
      if (response.data.messages) {
        messages = messages.concat(response.data.messages);
      }
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);
  
    return messages;
  }

// Function to fetch email subject for a specific email ID
async function fetchEmailSubject(auth, messageId) {
    const gmail = google.gmail({ version: 'v1', auth });
  
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
    });
  
    // Extract the subject from headers
    const headers = response.data.payload.headers;
    const subjectHeader = headers.find((header) => header.name === 'Subject');
    return subjectHeader ? subjectHeader.value : '(No Subject)';
  }
  
  // Express route to fetch all email subjects
  app.get('/email-subjects', async (req, res) => {
    try {
      // Fetch all email IDs
      const emailIds = await fetchAllEmailIds(oAuth2Client);
  
      // Fetch subjects for all emails
      const subjects = await Promise.all(
        emailIds.map((email) => fetchEmailSubject(oAuth2Client, email.id))
      );
  
      res.json({ count: subjects.length, subjects });
    } catch (error) {
      console.error('Error fetching email subjects:', error);
      res.status(500).send('Error fetching email subjects');
    }
  });
// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
