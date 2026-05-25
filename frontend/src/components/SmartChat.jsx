import React, { useState, useRef, useEffect } from 'react';

export default function SmartChat() {
  // 1. CORE APPLICATION STATE MANAGERS
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hello! I am your AI software engineering mentor. Ask me anything about system architecture, code optimization, or debugging. You can also attach architectural diagrams or reference documentation!' 
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State layers for media attachments and database session synchronization
  const [selectedImage, setSelectedImage] = useState(null);
  const [attachedDocs, setAttachedDocs] = useState([]); // ⚡ UPDATED: Holds objects containing raw client text { name, text }
  const [conversationId, setConversationId] = useState("chat-session-uuid-9999"); 

  const chatEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);

  // Auto-scroll loop to anchor viewport tracking to the newest responses
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, selectedImage, attachedDocs]);

  // 2. FILE PROCESSING UTILITIES
  // Image Parser: Intercepts raw file attachments and compiles them into clean Base64 data strings
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Safety constraint to prevent large files from overwhelming network bandwidth
    if (file.size > 5 * 1024 * 1024) {
      alert('Selected file size exceeds the system safety limit (Max 5MB).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage({
        name: file.name,
        mediaType: file.type,
        previewUrl: URL.createObjectURL(file),
        base64Data: reader.result.split(',')[1], // Isolate raw base64 data array block by stripping metadata signatures
      });
    };
    reader.readAsDataURL(file);
  };

  // Document Processor: Reads text files on the client machine inline
  const handleDocChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const rawFileText = reader.result;
      // ⚡ UPDATED: Push filename alongside its raw text string into state memory
      setAttachedDocs((prev) => [...prev, { name: file.name, text: rawFileText }]);
    };
    reader.readAsText(file); // Parses text/markdown files into raw string text layout locally
  };

  // 3. MULTIMODAL & RAG DISPATCHER LOOP
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() && !selectedImage && attachedDocs.length === 0) return;

    const textPayload = inputMessage.trim();
    const userTurn = { role: 'user', content: textPayload || 'Analyzed uploaded asset content.' };
    
    // Optimistically push the current user action directly into view state logs
    const updatedMessages = [...messages, userTurn];
    setMessages(updatedMessages);

    // Dynamic pipeline target selector variables
    let targetUrl = 'http://localhost:5001/api/chat'; 
    const baseBodyPayload = {
      messages: updatedMessages,
      conversationId: conversationId,
      userId: 7 // ⚡ Explicitly hardcoded User ID matching your active MySQL primary key row!
    };

    // Route Selection Split A: Handle Multimodal Requests
    if (selectedImage) {
      targetUrl = 'http://localhost:5001/api/chat-multimodal';
      baseBodyPayload.images = [{ mediaType: selectedImage.mediaType, base64Data: selectedImage.base64Data }];
    } 
    // Route Selection Split B: Handle Retrieval-Augmented Generation Document Requests
    else if (attachedDocs.length > 0) {
      // ⚡ UPDATED: Route points cleanly to your single-call RAG route matching the exact backend parameter name
      targetUrl = 'http://localhost:5001/api/chat-with-rag';
      baseBodyPayload.documents = attachedDocs; 
    }

    // Flush active viewport input field components immediately to provide a snappy UI experience
    setInputMessage('');
    setSelectedImage(null);
    setAttachedDocs([]); // Clear document dock array selection cache
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
    setIsLoading(true);

    try {
      // Dispatch compiled payload parameters down the network wire
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseBodyPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'The system application server rejected the payload cluster.');
      }

      // Inject the assistant response securely back into state layers
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);

    } catch (error) {
      console.error('Ecosystem transmission pipeline failure:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ Connection Breakdown: ${error.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[650px] w-full max-w-2xl mx-auto bg-[#1e1e1e] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
      
      {/* Scrollable Chat View Workspace Panel */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white font-medium rounded-br-none'
                  : 'bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-bl-none'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-40 mb-1 font-bold">
                {msg.role === 'user' ? 'You' : 'AI Mentor'}
              </div>
              {msg.content}
            </div>
          </div>
        ))}
        
        {/* Processing Indicator HUD */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg rounded-bl-none p-4 text-sm flex items-center space-x-2">
              <span className="animate-pulse font-medium text-xs text-zinc-400">Mentor running architectural evaluation queries...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Dynamic Assets Selection Docking Strip */}
      {(selectedImage || attachedDocs.length > 0) && (
        <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex flex-wrap gap-2 items-center">
          {selectedImage && (
            <div className="flex items-center space-x-2 bg-zinc-800 border border-zinc-700 pl-1 pr-2 py-1 rounded-md text-xs">
              <img src={selectedImage.previewUrl} alt="Thumbnail preview" className="h-6 w-6 rounded object-cover" />
              <span className="text-zinc-300 truncate max-w-[120px]">{selectedImage.name}</span>
              <button 
                type="button" 
                onClick={() => { setSelectedImage(null); imageInputRef.current.value = ''; }} 
                className="text-zinc-500 hover:text-red-400 font-bold ml-1"
              >
                ×
              </button>
            </div>
          )}
          {attachedDocs.map((doc, index) => (
            <div key={index} className="flex items-center space-x-1 bg-blue-950/40 border border-blue-900/60 px-2 py-1 rounded-md text-xs text-blue-300">
              <span className="font-semibold">📄</span>
              <span className="truncate max-w-[120px]">{doc.name}</span>
              <button 
                type="button" 
                onClick={() => setAttachedDocs(prev => prev.filter((_, i) => i !== index))} 
                className="text-blue-500 hover:text-red-400 font-bold ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Handling Core Control Form Dock Panel */}
      <form onSubmit={handleSendMessage} className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center space-x-2">
        
        {/* Image Uploader Input Layout */}
        <label className="p-2.5 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg cursor-pointer text-xs font-bold transition-all shrink-0 active:scale-95">
          📷 Image
          <input type="file" ref={imageInputRef} accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} disabled={isLoading} className="hidden" />
        </label>

        {/* Document Uploader Input Layout */}
        <label className="p-2.5 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg cursor-pointer text-xs font-bold transition-all shrink-0 active:scale-95">
          📄 Doc
          <input type="file" ref={docInputRef} accept=".txt,.md,.json,.csv,.docx,.pdf" onChange={handleDocChange} disabled={isLoading || !!selectedImage} className="hidden" />
        </label>

        {/* Dynamic Text Prompt Field Parameter Box */}
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={selectedImage ? "Inquire about this image asset target..." : attachedDocs.length > 0 ? "Ask questions relative to the appended file contents..." : "Ask your software engineering mentor a system question..."}
          disabled={isLoading}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        
        {/* Operational Dispatch Trigger Submission Key */}
        <button
          type="submit"
          disabled={isLoading || (!inputMessage.trim() && !selectedImage && attachedDocs.length === 0)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  );
}