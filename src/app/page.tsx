"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, Send, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import "./globals.css";

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
  sources?: any[];
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [collectionName, setCollectionName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "bot",
      content: "Hello! Upload a PDF document first, and then ask me any questions about it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Uploading & Indexing... Give me a sec!");
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setCollectionName(data.collectionName);
        setUploadStatus("Document Indexed Successfully! 🎉");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "bot",
            content: `I've successfully read **"${file.name}"**. What would you like to know about it?`,
          },
        ]);
      } else {
        setUploadStatus(`Oops: ${data.error}`);
      }
    } catch (error: any) {
      setUploadStatus(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !collectionName) return;

    const userQuery = input.trim();
    setInput("");
    
    const newMsgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: newMsgId, role: "user", content: userQuery },
    ]);

    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery, collectionName }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: data.answer || data.error || "Sorry, I could not generate an answer.",
          sources: data.sources,
        },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: `**Error:** ${error.message}`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setCollectionName(null);
    setUploadStatus(null);
    setInput("");
    setMessages([
      {
        id: "1",
        role: "bot",
        content: "Hello! Upload a PDF document first, and then ask me any questions about it.",
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="container">
      <header>
        <h1>NotebookLM</h1>
        <p>Your RAG-Powered Study Buddy!</p>
      </header>

      <div className="app-grid">
        {/* Sidebar */}
        <aside className="sidebar card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Sparkles size={28} color="var(--brand-color)" />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Knowledge Base</h2>
          </div>
          
          <label className="upload-zone" style={file ? { cursor: "default" } : {}}>
            {!file && <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange} 
              style={{ display: "none" }} 
            />}
            {file ? (
              <>
                <FileText />
                <span style={{ fontWeight: 800, wordBreak: "break-all", fontSize: "1.2rem" }}>{file.name}</span>
                <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </>
            ) : (
              <>
                <UploadCloud />
                <span style={{ fontWeight: 800, fontSize: "1.2rem" }}>Click or drag a PDF here!</span>
              </>
            )}
          </label>

          {file && !collectionName && (
            <button 
              className="upload-btn" 
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <Loader2 size={20} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                  Processing...
                </span>
              ) : (
                "Index Document!"
              )}
            </button>
          )}

          {uploadStatus && (
            <div className={`status-badge ${uploadStatus.includes("Error") || uploadStatus.includes("Oops") ? "error" : ""}`}>
              {uploadStatus}
            </div>
          )}

          {collectionName && (
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, padding: "1rem", background: "var(--bg-color)", borderRadius: "12px", border: "2px solid var(--border-color)" }}>
                <strong>Active Session ID:</strong><br />
                <span style={{ wordBreak: "break-all", display: "inline-block", marginTop: "0.25rem", color: "var(--brand-color)" }}>
                  {collectionName}
                </span>
              </div>
              <button 
                onClick={handleReset}
                className="upload-btn"
                style={{ background: "#fff", color: "var(--text-main)", marginTop: "0" }}
              >
                Start Over
              </button>
            </div>
          )}
        </aside>

        {/* Chat Area */}
        <main className="chat-container card">
          <div className="chat-history" ref={chatHistoryRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <span className="message-label">
                  {msg.role === "user" ? "You" : "Notebook Buddy"}
                </span>
                <div className="message-bubble">
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message bot">
                <span className="message-label">Notebook Buddy</span>
                <div className="message-bubble loading-dots" style={{ display: "inline-block", width: "40px" }}>
                  <span style={{ visibility: "hidden" }}>.</span>
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              placeholder={collectionName ? "Ask me anything about your document!" : "Upload a document first to chat..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!collectionName || isTyping}
            />
            <button 
              className="send-btn"
              onClick={handleSendMessage}
              disabled={!input.trim() || !collectionName || isTyping}
            >
              <Send size={20} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
