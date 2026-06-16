import { useState, useRef } from 'react';
import axios from 'axios';
import './index.css';

function App() {
  const [file, setFile] = useState(null);
  const [contextText, setContextText] = useState('');
  const [startId, setStartId] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [sprintType, setSprintType] = useState('TDD');
  const [infoType, setInfoType] = useState('UML');
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHelperModalOpen, setIsHelperModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    setDownloadUrl(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type !== 'application/pdf') {
        setError('Please upload a valid PDF file.');
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    setError(null);
    setDownloadUrl(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a valid PDF file.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleGenerateTasks = async () => {
    if (!file) return;

    if (!apiKey.trim()) {
      setError('Please provide a Gemini API key.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setDownloadUrl(null);

    const formData = new FormData();
    formData.append('assignmentFile', file);

    try {
      const response = await axios.post('https://ai-to-jira.onrender.com/api/generate-jira-tasks', formData, {
        responseType: 'blob',
        headers: {
          'x-uml-context': encodeURIComponent(contextText.trim()),
          'x-start-id': startId,
          'x-api-key': apiKey.trim(),
          'x-sprint-type': sprintType
        }
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      setDownloadUrl(url);

    } catch (err) {
      console.error('Frontend Error:', err);
      setError('Server process timed out or failed. Please check backend terminal.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-container">
      <h1>AI to Jira CSV</h1>
      <p className="subtitle">Upload your assignment PDF and let AI break it down into Jira tasks.</p>

      {!file && !downloadUrl && (
        <div
          className={`upload-zone ${isDragging ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-icon">📄</div>
          <div className="upload-text">Drag & drop your PDF here</div>
          <div className="upload-subtext">or click to browse files</div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
          />
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      <div style={{ width: '100%', marginTop: '1rem', textAlign: 'left' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
          Gemini API Key:
        </label>
        <input 
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your Gemini API key"
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'var(--text)',
            fontFamily: 'monospace',
            marginBottom: '0.5rem'
          }}
        />
        <div style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
          <button 
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--primary)', 
              textDecoration: 'underline', 
              cursor: 'pointer', 
              padding: 0,
              font: 'inherit'
            }}
          >
            Don't know how to get it?
          </button>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            The key you put is local on your computer only and the info doesn't pass forward. Don't believe me? You don't need to, just get in to <a href="https://github.com/eranmal/ai-to-jira" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>my GitHub</a> and see the code yourself :)
          </p>
        </div>

        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
          Starting Issue ID:
        </label>
        <input 
          type="number"
          min="1"
          value={startId}
          onChange={(e) => setStartId(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'var(--text)',
            fontFamily: 'monospace',
            marginBottom: '1rem'
          }}
        />

        <div style={{ marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '1rem', background: 'rgba(0,0,0,0.1)' }}>
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>
              Add Information {isInfoExpanded ? '▲' : '▼'}
            </h3>
          </div>
          
          {isInfoExpanded && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <button 
                  className={`btn ${infoType === 'UML' ? 'primary' : ''}`}
                  style={{ background: infoType === 'UML' ? 'var(--primary)' : 'transparent', border: '1px solid var(--primary)', padding: '0.5rem 1rem' }}
                  onClick={() => setInfoType('UML')}
                >
                  UML Insert
                </button>
                <button 
                  className={`btn ${infoType === 'PROJECT_STRUCTURE' ? 'primary' : ''}`}
                  style={{ background: infoType === 'PROJECT_STRUCTURE' ? 'var(--primary)' : 'transparent', border: '1px solid var(--primary)', padding: '0.5rem 1rem' }}
                  onClick={() => setInfoType('PROJECT_STRUCTURE')}
                >
                  Project Structure
                </button>
                <button 
                  className="btn"
                  style={{ background: 'var(--text-muted)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', fontWeight: 'bold' }}
                  onClick={() => setIsHelperModalOpen(true)}
                  title="How to achieve the ideal structure?"
                >
                  ?
                </button>
              </div>

              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                {infoType === 'UML' ? 'Existing UML Structure (Mermaid/Text):' : 'Current Project Directory Structure:'}
              </label>
              <textarea
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                placeholder={infoType === 'UML' ? "Paste existing architecture text or Mermaid UML here..." : "Paste project structure here (e.g. root/ -> server/ -> client/)..."}
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '1rem',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'var(--text)',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {file && !downloadUrl && (
        <div className="file-info">
          <div className="file-name">
            📝 {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>

          {isProcessing ? (
            <>
              <div className="spinner"></div>
              <p>Analyzing assignment and generating tasks starting from ID {startId}...</p>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sprint Type:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="sprintType" 
                    value="TDD" 
                    checked={sprintType === 'TDD'} 
                    onChange={() => setSprintType('TDD')}
                  />
                  TDD
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="sprintType" 
                    value="Regular" 
                    checked={sprintType === 'Regular'} 
                    onChange={() => setSprintType('Regular')}
                  />
                  Regular
                </label>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn" onClick={handleGenerateTasks}>
                  Generate Jira CSV
                </button>
                <button
                  className="btn"
                  style={{ background: 'transparent', border: '1px solid var(--primary)' }}
                  onClick={() => setFile(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {downloadUrl && (
        <div className="file-info">
          <div className="upload-icon">✅</div>
          <div className="upload-text">Success! Your CSV is ready.</div>
          <p className="upload-subtext">You can now import this file directly into Jira. IDs start from {startId}.</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <a
              href={downloadUrl}
              download="Jira_Tasks.csv"
              className="btn success"
              style={{ textDecoration: 'none' }}
            >
              ⬇️ Download CSV
            </a>
            <button
              className="btn"
              style={{ background: 'transparent', border: '1px solid var(--primary)' }}
              onClick={() => {
                setFile(null);
                setDownloadUrl(null);
              }}
            >
              Upload Another
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setIsModalOpen(false)}>X</button>
            <h2>How to get a Gemini API Key?</h2>
            <ol style={{ textAlign: 'left', marginTop: '1rem', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
              <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Google AI Studio</a>.</li>
              <li>Sign in with your Google account.</li>
              <li>Click "Create API key".</li>
              <li>Select a new project or an existing one.</li>
              <li>Copy the generated key and paste it here.</li>
            </ol>
          </div>
        </div>
      )}

      {isHelperModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <button className="close-btn" onClick={() => setIsHelperModalOpen(false)}>X</button>
            <h2>How to achieve the ideal {infoType === 'UML' ? 'UML' : 'Project Structure'}</h2>
            <div style={{ textAlign: 'left', marginTop: '1rem', lineHeight: '1.6' }}>
              <p>Follow these steps to generate the best context for the AI:</p>
              <ol style={{ paddingLeft: '1.5rem' }}>
                <li>Open the root of your project in your IDE (e.g., VS Code, IntelliJ).</li>
                <li>Open your AI agent extension (e.g., GitHub Copilot, Gemini Code Assist, Cursor) in the IDE.</li>
                <li>Copy and paste the following prompt to the agent:
                  <div style={{ 
                    background: 'rgba(0,0,0,0.3)', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    marginTop: '0.5rem', 
                    marginBottom: '0.5rem',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {infoType === 'UML' 
                      ? "Please generate a Mermaid UML diagram representing the core architecture and component relationships of this project. Only output the text." 
                      : "Please provide a detailed directory and file structure tree of the current project root, focusing on the main application directories (e.g., frontend, backend, src). Only output the text."}
                  </div>
                </li>
                <li>Copy the agent's answer and paste it into the text area.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* */}
      <footer className="app-footer">
        Created with ❤️ by <a href="https://github.com/eranmal" target="_blank" rel="noopener noreferrer">@Eran Malachi</a> | Fully Driven by AI & Prompt Engineering
      </footer>
    </div>
  );
}

export default App;