require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

const { TDD_PROMPT, REGULAR_PROMPT } = require('./prompt');

app.post('/api/generate-jira-tasks', upload.single('assignmentFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Uploaded file must be a PDF' });
    }

    const rawUml = req.headers['x-uml-context'] || '';
    const umlText = rawUml ? decodeURIComponent(rawUml).trim() : '';
    const startId = parseInt(req.headers['x-start-id'], 10) || 1;
    const sprintType = req.headers['x-sprint-type'] || 'TDD';
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    const ai = new GoogleGenAI({ apiKey });

    console.log('=== NETWORK PIPELINE SUCCESS ===');
    console.log('UML Length:', umlText.length);
    console.log('Starting Issue ID:', startId);

    const dataBuffer = req.file.buffer;
    const data = await pdfParse(dataBuffer);
    const pdfText = data.text;

    let csvData = '';

    if (ai) {
      console.log('Invoking Gemini Pro Refactoring Engine...');

      const promptContent = `
[EXISTING UML STRUCTURE / TEXT]:
${umlText || 'No previous architecture provided.'}

[NEW ASSIGNMENT SPECIFICATION PDF TEXT]:
${pdfText}

### CRITICAL HIERARCHY ID CONSTRAINT:
- For this specific execution, the sequential 'Issue ID' counter MUST strictly start from the integer ${startId} and increment sequentially by 1 for every subsequent row (e.g., ${startId}, ${startId + 1}, ${startId + 2}, ...).
- Ensure that all 'Parent ID' fields for Stories and Sub-tasks correctly reference these new shifted sequential IDs. Do NOT start from 1.
`;

      const systemInstruction = sprintType === 'Regular' ? REGULAR_PROMPT : TDD_PROMPT;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptContent,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.15,
        }
      });
      // חילוץ טקסט בטוח ומותאם ל-SDK החדש
      let responseText = '';
      if (response && response.text) {
        responseText = (typeof response.text === 'function') ? response.text() : response.text;
      } else if (response && response.candidates && response.candidates[0]?.content?.parts[0]?.text) {
        responseText = response.candidates[0].content.parts[0].text;
      }

      // הגנה קריטית: ניקוי רק אם קיבלנו מחרוזת תקינה
      if (responseText) {
        responseText = responseText
          .replace(/```csv\n?/gi, '')
          .replace(/```\n?/g, '')
          .trim();
        csvData = responseText;
      } else {
        console.log('WARNING: Gemini returned empty or unexpected structure.');
        csvData = `Issue ID,Parent ID,Summary,Issue Type,Description\n${startId},,"Error: Failed to fetch structured content from AI.","Task","Check logs."`;
      }

      console.log('Jira CSV compilation completed successfully.');
    } else {
      return res.status(500).json({ error: 'Gemini Client missing.' });
    }

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
});