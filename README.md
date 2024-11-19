# get-all-gmail-email-by-apis
Get all the gmail email from the gmail  via apis in node js express 
Step 1: Set Up a Google Cloud Project
Go to the Google Cloud Console.
Create a new project:
Click New Project.
Provide a project name and click Create.
Enable the Gmail API:
Navigate to APIs & Services > Library.
Search for Gmail API and enable it.
Create OAuth 2.0 Credentials:
Go to APIs & Services > Credentials.
Click Create Credentials > OAuth Client ID.
Configure the OAuth consent screen and add the scope:
Add https://www.googleapis.com/auth/gmail.readonly as a scope.
Select the application type (e.g., Web Application) and add redirect URIs:
Example redirect URI: http://localhost:3000/oauth2callback
Download the credentials.json file.

**Install Required Packages**
npm install express googleapis body-parser nodemon

Start the server
node app.js
Open a browser and navigate to:
http://localhost:3000/auth
http://localhost:3000/emails
