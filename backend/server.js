require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path'); // מודול מובנה לניהול נתיבים בטוח
const { GoogleGenAI } = require('@google/genai');

// טעינת הפרומפט באמצעות נתיב אבסולוטי מוחלט כדי למנוע קריסות ב-Render
const { SYSTEM_PROMPT } = require(path.join(__dirname, 'prompt.js'));

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// הגדרת ה-Multer פעם אחת בלבד בראש הקובץ
const storage = multer.memoryStorage();
const upload = multer({ storage });

// אתחול קליינט ה-Gemini במידה וקיים מפתח
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

app.post('/api/generate-jira-tasks', upload.single('assignmentFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Uploaded file must be a PDF' });
    }

    // 1. קריאת ופענוח ה-UML מה-Headers
    const rawUml = req.headers['x-uml-context'] || '';
    const umlText = rawUml ? decodeURIComponent(rawUml).trim() : '';

    // קריאת ה-ID הראשוני שנשלח מה-Frontend
    const startId = parseInt(req.headers['x-start-id'], 10) || 1;

    console.log('=== NETWORK PIPELINE SUCCESS ===');
    console.log('UML received via Headers. Length:', umlText.length);
    console.log('Starting Issue ID requested:', startId);

    // 2. חילוץ הטקסט האמיתי מה-PDF
    const dataBuffer = req.file.buffer;
    const data = await pdfParse(dataBuffer);
    const pdfText = data.text;

    console.log('PDF text extracted successfully. Length:', pdfText.length);

    let csvData;

    if (ai) {
      console.log('Invoking Gemini Pro Refactoring Engine with dynamic IDs and TDD constraints...');

      // בניית הפרומפט המשולב עם הטקסטים והנחיית ה-ID הדינמית
      const promptContent = `
[EXISTING UML STRUCTURE / TEXT]:
${umlText || 'No previous architecture provided.'}

[NEW ASSIGNMENT SPECIFICATION PDF TEXT]:
${pdfText}

### CRITICAL HIERARCHY ID CONSTRAINT:
- For this specific execution, the sequential 'Issue ID' counter MUST strictly start from the integer ${startId} and increment sequentially by 1 for every subsequent row (e.g., ${startId}, ${startId + 1}, ${startId + 2}, ...).
- Ensure that all 'Parent ID' fields for Stories and Sub-tasks correctly reference these new shifted sequential IDs. Do NOT start from 1.
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

      // ניקוי תגיות מרקדאון של ה-CSV במידה וה-AI החזיר אותן
      responseText = responseText
        .replace(/```csv\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();

      csvData = responseText;
      console.log('Jira CSV compilation completed successfully.');
    } else {
      console.log('CRITICAL: AI instance is null.');
      return res.status(500).json({ error: 'Gemini Client missing.' });
    }

    // שליחת הקובץ חזרה לדפדפן
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Jira_Tasks.csv"');
    res.send(csvData);

  } catch (error) {
    console.error('Pipeline Crash:', error);
    res.status(500).json({ error: 'Internal processing error.' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
  if (!ai) {
    console.log('WARNING: GEMINI_API_KEY not set. Will use mock response data.');
  } else {
    console.log('SUCCESS: Gemini API Client initialized correctly!');
  }
});