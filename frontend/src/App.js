import React, { useState } from 'react';
import './App.css';
function App() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [downloadLink, setDownloadLink] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
    setDownloadLink('');
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('File uploaded successfully!');
        setDownloadLink(data.downloadLink);
      } else {
        setMessage(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error(error);
      setMessage('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container">
      <h1>SecureDrop File Upload</h1>

      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <br />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>

      {message && <p className={message.includes('success') ? 'alert-success' : 'alert-error'}>{message}</p>}

      {downloadLink && (
        <p>
          Your link is Ready:{' '}
          <a href={downloadLink} target="_blank" rel="noopener noreferrer" download>
            {downloadLink}
          </a>
        </p>
      )}
    </div>
  );
}

export default App;
