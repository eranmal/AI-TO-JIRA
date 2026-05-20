require('dotenv').config(); // <-- 1. הוספה קריטית בשורה הראשונה של הקובץ!

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');
const { SYSTEM_PROMPT, getMockCsvData } = require('./prompt');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize Gemini API client if API key is present
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

app.post('/api/generate-jira-tasks', upload.single('assignmentFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Uploaded file must be a PDF' });
    }

    // 1. קריאת ופענוח ה-UML מה-Headers (עובד מיידית ובטוח לחלוטין!)
    const rawUml = req.headers['x-uml-context'] || '';
    const umlText = rawUml ? decodeURIComponent(rawUml).trim() : '';

    console.log('=== NETWORK PIPELINE SUCCESS ===');
    console.log('UML received via Headers. Length:', umlText.length);
    if (umlText) {
      console.log('UML Preview:', umlText.substring(0, 100).replace(/\n/g, ' '));
    }

    // 2. חילוץ הטקסט מה-PDF
    const dataBuffer = req.file.buffer;
    const data = await pdfParse(dataBuffer);
    const pdfText = data.text;

    console.log('PDF text extracted successfully. Length:', pdfText.length);

    let csvData;

    if (ai) {
      console.log('Invoking Gemini Pro Refactoring Engine...');

      const promptContent = `
[EXISTING UML STRUCTURE / TEXT]:
${umlText || 'No previous architecture provided.'}

[NEW ASSIGNMENT SPECIFICATION PDF TEXT]:
${pdfText}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptContent,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.15,
        }
      });

      let responseText = (typeof response.text === 'function') ? response.text() : response.text;

      // ניקוי תגיות מרקדאון
      responseText = responseText
        .replace(/```csv\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();

      csvData = responseText;
      console.log('Jira CSV compilation completed by AI.');
    } else {
      console.log('CRITICAL: AI instance is null.');
      return res.status(500).json({ error: 'Gemini Client missing.' });
    }

    // שליחת הקובץ
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Jira_Tasks.csv"');
    res.send(csvData);

  } catch (error) {
    console.error('Pipeline Crash:', error);
    res.status(500).json({ error: 'Internal processing error.' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
  if (!ai) {
    console.log('WARNING: GEMINI_API_KEY not set in .env file. Will use mock response data.');
  } else {
    console.log('SUCCESS: Gemini API Client initialized correctly from .env!');
  }
});