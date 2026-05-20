import { useState, useRef } from 'react';
import axios from 'axios';
import './index.css';

function App() {
  const [file, setFile] = useState(null);
  const [umlText, setUmlText] = useState('');
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

    setIsProcessing(true);
    setError(null);
    setDownloadUrl(null);

    const formData = new FormData();
    formData.append('assignmentFile', file);

    try {
      const response = await axios.post('https://ai-to-jira.onrender.com/api/generate-jira-tasks', formData, {
        responseType: 'blob',
        headers: {
          'x-uml-context': encodeURIComponent(umlText.trim())
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
          Existing UML Structure (Optional Mermaid/Text):
        </label>
        <textarea
          value={umlText}
          onChange={(e) => setUmlText(e.target.value)}
          placeholder="Paste existing architecture text or Mermaid UML here..."
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

      {file && !downloadUrl && (
        <div className="file-info">
          <div className="file-name">
            📝 {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>

          {isProcessing ? (
            <>
              <div className="spinner"></div>
              <p>Analyzing assignment and generating tasks...</p>
            </>
          ) : (
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
          )}
        </div>
      )}

      {downloadUrl && (
        <div className="file-info">
          <div className="upload-icon">✅</div>
          <div className="upload-text">Success! Your CSV is ready.</div>
          <p className="upload-subtext">You can now import this file directly into Jira.</p>
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

      {/* */}
      <footer className="app-footer">
        Created with ❤️ by <a href="https://github.com/eranmal" target="_blank" rel="noopener noreferrer">@Eran Malachi</a> | Fully Driven by AI & Prompt Engineering
      </footer>
    </div>
  );
}

export default App;