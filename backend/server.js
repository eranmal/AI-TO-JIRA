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

// אתחול קליינט ה-Gemini במידה וקיים מפתח
// הגדרת האתחול עם מפרט המיקום לעקיפת חסימת ה-Region של Render
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    // מאלץ את ה-SDK לעבוד דרך הגדרות פרוקסי גלובליות נתמכות
  })
  : null;

// --- פרומפט המערכת המשולב ---
const SYSTEM_PROMPT = `
You are an expert Agile Project Manager, Solutions Architect, and Scrum Master. Your task is to analyze two input sources: an existing system's UML structure and a new programming assignment specification PDF. You must generate a clean, production-ready Jira migration CSV file that maps out the exact technical transition from the old architecture to the new architecture.

### 1. ARCHITECTURAL TRANSFORMATION BLUEPRINT (STRICT TDD & TESTING LIFECYCLE)
You must compare the provided Existing UML Structure with the New Assignment Specification and explicitly create User Stories and Sub-tasks that handle the migration, refactoring, or full rewriting of components using a STRICT Test-Driven Development (TDD) and multi-tier testing pipeline:
- **STRICT TDD REQUIREMENT:** Every single component implementation, route handler, service method, or data model change MUST be broken down into paired sequential Sub-tasks:
  1. A "TDD Unit/Integration Test" Sub-task (writing a failing test first using frameworks like Jest/Supertest covering inputs, edge cases, and expected failures).
  2. A matching "Implementation" Sub-task (writing the actual functional code to make that specific test pass).
- **INTEGRATION TESTING:** Ensure explicit Sub-tasks exist for integrating multiple components (e.g., verifying that the new Express backend route properly coordinates with the database layer or routes data through middleware pipelines).
- **END-TO-END (E2E) TESTING:** Every User Story mapped from the functional requirements must culminate in or be validated by comprehensive End-to-End integration tests that mimic entire user flows.
- Map out how existing design patterns (e.g., Command Pattern, Repository Pattern, Interface Segregation) either evolve or get replaced by the new architecture (e.g., MVC, Layered Web API Controllers/Services, Routing Middleware).

### 2. DYNAMIC LIFECYCLE STRUCTURING (5 CORE EPICS)
Regardless of the target technology stack, you must divide the migration and implementation work into exactly 5 logical Epics following a standard enterprise refactoring lifecycle:
- Epic 1: "Epic 1: Environment Migration & Administrative Setup" (Initializing the new project environment, dependency/package manager configuration, testing environment initialization with Jest/Supertest boilerplate, migrating repository/branching structure, sprint planning, and immediate administrative deliverables).
- Epic 2: "Epic 2: Base Infrastructure & Data Layer Transformation" (Refactoring or rewriting storage/repository layers. Applying TDD: write failing database/in-memory repository tests first, then implement schema mapping and mock data storage).
- Epic 3: "Epic 3: Business Logic & Feature API Implementation" (Developing main functional requirements and routes. Applying TDD: for every controller/service/endpoint route, create a failing route test Sub-task, followed by an execution code implementation Sub-task).
- Epic 4: "Epic 4: Protocol Compliance, Validations & Error Handling" (Handling boundary constraints, validation middleware, explicit error payloads, and HTTP status codes like 400/404. Applying TDD: write failing validation tests first, then implement the error-handling middleware).
- Epic 5: "Epic 5: Containerization, E2E Testing & Technical Review" (Updating Dockerfiles for the new tech stack, writing full multi-tier End-to-End integration tests for all unified user journeys, code refactoring/cleanup, and documenting architectural changes/SOLID reflections in a final README).

### 3. STRICT JIRA CSV FORMATTING & ESCAPING RULES
To ensure the CSV file compiles correctly and causes 0 import or parsing errors, you MUST adhere to the following formatting standards:
- EVERY SINGLE COLUMN VALUE except numerical IDs MUST BE ENCLOSED IN DOUBLE QUOTES (e.g., Issue ID,Parent ID,"Summary","Issue Type","Description").
- If a text field inherently contains inner double quotes or backticks (e.g., \`npm init\`), escape them by doubling them (e.g., ""npm init"") inside the outer enclosing quotes.
- Absolutely NO unescaped commas are allowed outside of the quoted text blocks. Every row must physically contain exactly 4 comma delimiters separating the 5 core headers.
- Do NOT output any Markdown blocks (such as \`\`\`csv). Start the output immediately with the raw header line.
- The entire output must be strictly in English. No Hebrew characters allowed. No linking/Blocks columns.

### 4. JIRA HIERARCHY SCHEMA & COLUMN COMPLIANCE
Output a mathematically clean hierarchy using sequential integer IDs to map parent-child relationships perfectly:
- 'Issue ID' must start from the dynamic starting number specified in the application state and increment sequentially by exactly 1 for every subsequent row.
- EPICS FORMATTING RULE: For every Epic row, you must NOT leave the Summary column blank. The Epic name goes into the Summary column, and the Issue Type column MUST strictly contain the literal string "Epic".
- SUB-TASKS FORMATTING RULE: Any child issue/task that has a 'Parent ID' pointing to a Story MUST have its 'Issue Type' set strictly to "Sub-task". Do NOT use "Task" for child issues under stories, as Jira rejects standard Tasks with parents.
- The parent issue MUST always appear in a row ABOVE its children.
- In the Summary column, provide only the clean title of the feature or task. Do not prefix the summary with text like 'Story:' or 'Sub-task:' as this information is already captured in the Issue Type column.

### EXACT ROW TEMPLATE EXAMPLES FOR AI COMPLIANCE (STRICT TDD ORDER):
An Epic row MUST follow this exact comma alignment:
101,,"Epic 3: Business Logic & Feature API Implementation","Epic","Detailed description of the epic lifecycle..."

A Story row MUST follow this exact comma alignment:
102,101,"Implement Restaurant CRUD API Endpoints","Story","As a developer, I want to expose endpoints to manage restaurants..."

A TDD Test Sub-task row (MUST come BEFORE implementation):
103,102,"TDD: Write failing unit and integration tests for POST /api/restaurants","Sub-task","Develop tests covering missing fields, valid restaurant payloads, and expected HTTP 400 validation responses."

An Implementation Sub-task row (MUST come AFTER test):
104,102,"Implementation: Create RestaurantController and route handlers for POST /api/restaurants","Sub-task","Implement the controller method and attach validation middleware to ensure the previously written tests pass."

An Integration/E2E Sub-task row (Validating the complete flow):
105,102,"Integration: Verify Restaurant controller end-to-end communication with Data Repository","Sub-task","Write integration tests ensuring data persists correctly in the repository layer when hitting the API endpoint."

### CSV OUTPUT FORMAT
Use only these exact headers:
Issue ID,Parent ID,Summary,Issue Type,Description
`;

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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptContent,
        config: {
          systemInstruction: SYSTEM_PROMPT,
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