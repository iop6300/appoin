const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');

const app = express();
const PORT = 3001;

// --- Google Sheets Configuration ---
const SPREADSHEheet_ID = '1DkANNGxxlUC8HZ-nVvVoI_odEGpdKxobbxCwm2Hn28w';
const CREDENTIALS_FILE = path.join(__dirname, 'google-credentials.json');
const SHEETS_SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_NAME = 'Sheet1'; // Assumes data is in 'Sheet1'. Change if your sheet name is different.
// ----------------------------------

app.use(cors());
app.use(bodyParser.json());

// --- Google Sheets Helper Functions ---

// Function to get authenticated Google Sheets client
async function getSheetsClient() {
    const authOptions = { scopes: SHEETS_SCOPE };
    if (process.env.GOOGLE_CREDENTIALS) {
        authOptions.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } else {
        authOptions.keyFile = CREDENTIALS_FILE;
    }
    const auth = new google.auth.GoogleAuth(authOptions);
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client });
}

// Function to read all reservations from the sheet
async function readFromSheet() {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:H`, // Read all columns
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) { // <= 1 to account for header row
        return [];
    }

    // Assumes header row is: date, time, studentName, parentContact, schoolLevel, grade, interest, recordedTime
    const reservations = rows.slice(1).map(row => ({
        date: row[0],
        time: row[1],
        studentName: row[2],
        parentContact: row[3],
        schoolLevel: row[4],
        grade: row[5],
        interest: row[6],
    }));
    return reservations;
}

// Function to append a new reservation to the sheet
async function appendToSheet(data) {
    const sheets = await getSheetsClient();
    const resource = {
        values: [[
            data.date,
            data.time,
            data.studentName,
            data.parentContact,
            data.schoolLevel,
            data.grade,
            data.interest,
            new Date().toISOString()
        ]],
    };

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:H`,
        valueInputOption: 'USER_ENTERED',
        resource,
    });
    console.log('Data successfully appended to Google Sheet.');
}

// -------------------------------------

// GET endpoint to fetch reservations for a specific date
app.get('/api/reservations', async (req, res) => {
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ message: 'Date query parameter is required' });
    }

    try {
        const allReservations = await readFromSheet();
        const filteredReservations = allReservations.filter(r => r.date === date);
        res.json(filteredReservations);
    } catch (err) {
        console.error('Error reading from Google Sheet:', err);
        res.status(500).json({ message: 'Error reading reservations data from source.' });
    }
});

// POST endpoint to add a new reservation
app.post('/api/reservations', async (req, res) => {
    const newReservation = req.body;

    if (!newReservation || !newReservation.date || !newReservation.time || !newReservation.studentName) {
        return res.status(400).json({ message: 'Invalid reservation data' });
    }

    try {
        const allReservations = await readFromSheet();
        
        // Check for conflicts
        const isTimeSlotTaken = allReservations.some(r => r.date === newReservation.date && r.time === newReservation.time);
        if (isTimeSlotTaken) {
            return res.status(409).json({ message: 'This time slot is already taken' });
        }

        // If no conflict, append to sheet
        await appendToSheet(newReservation);
        
        res.status(201).json(newReservation);

    } catch (err) {
        console.error('Error processing reservation:', err);
        res.status(500).json({ message: 'Error processing reservation.' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
