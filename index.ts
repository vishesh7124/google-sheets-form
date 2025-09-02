// backend/index.ts
import express from "express";
import { google } from "googleapis";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";


const app = express();
dotenv.config({path:".env"});


app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));


app.use(bodyParser.json());



const PORT = process.env.PORT || 5000;

// Load questions (static JSON, could be from DB later)
const questions = [
  { id: 1, text: "What is your startup idea?", type: "text" },
  { id: 2, text: "How many members are in your team?", type: "number" },
  { id: 3, text: "Which sector are you working in?", type: "text" },
  { id: 4, text: "Why did you choose this problem?", type: "text" },
  { id: 5, text: "What impact will your solution create?", type: "text" },
  { id: 6, text: "Do you have a prototype ready?", type: "radio", options: ["Yes", "No"] },
];

// ---------------- GOOGLE SHEETS SETUP ----------------
const SHEET_ID =process.env.SHEET_ID  // Replace with your actual Sheet ID

const credentials = {
  type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newlines in private key
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
};
const auth = new google.auth.GoogleAuth({
    //@ts-ignore
  credentials: credentials, // Service account key file
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// ---------------- ROUTES ----------------

// Fetch questions
app.get("/api/questions", (req, res) => {
  res.json({ questions });
});

// Submit form
app.post("/api/submit", async (req, res) => {
  try {
    const { name, email, phone, rollNo, year, answers } = req.body;

    if (!name || !email || !phone || !rollNo || !year || !answers) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate email
    const emailRegex = /^[a-z0-9]+[0-9]{0,2}_be25@thapar\.edu$/i;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (answers.length !== questions.length) {
      return res.status(400).json({ error: "All questions must be answered" });
    }


    // Check if email already exists
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!B2:B", // Assuming emails are in column A
    });

    const emails = existing.data.values?.flat() || [];
    if (emails.includes(email)) {
      return res.status(400).json({ error: "This email has already submitted the form." });
    }

    // Append new row
    const row = [name, email, phone, rollNo, year, ...answers];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A2",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    res.json({ success: true, message: "Form submitted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
