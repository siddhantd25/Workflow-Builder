import React, { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function ChatModal({ workflow, onClose }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const storageKey = `chat_${workflow.id}`;

  // ✅ Load messages from localStorage every time modal opens
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setMessages(JSON.parse(saved));
  }, [storageKey]);

  // ✅ Persist messages in localStorage when updated
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  // ✅ Auto-scroll when new message appears
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMessage = {
      role: "user",
      text: query,
      time: new Date().toLocaleTimeString(),
    };

    setMessages((msgs) => [...msgs, userMessage]);
    setQuery("");
    setLoading(true);

    try {
      // 🧠 Build pipeline like before
      const { nodes = [], edges = [] } = workflow.graph_json || {};
      const graph = {};
      edges.forEach((edge) => {
        if (!graph[edge.source]) graph[edge.source] = [];
        graph[edge.source].push(edge.target);
      });

      const targets = new Set(edges.map((e) => e.target));
      const startNode = nodes.find((n) => !targets.has(n.id));

      const orderedNodes = [];
      let current = startNode;
      const visited = new Set();

      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        orderedNodes.push(current);
        const nextIds = graph[current.id] || [];
        current = nodes.find((n) => nextIds.includes(n.id));
      }

      const pipeline = orderedNodes.map((node) => ({
        id: node.id,
        type: node.type,
        config: node.data || {},
      }));

      // 📨 Send pipeline to backend
      const res = await fetch(`${API_BASE}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: workflow.id,
          query,
          pipeline,
        }),
      });

      const data = await res.json();
      const aiText = res.ok
        ? data.response || "No response text returned."
        : `❌ Error: ${data.detail}`;

      // ✅ Add an empty assistant message for typing
      const aiMessage = {
        role: "assistant",
        text: "",
        time: new Date().toLocaleTimeString(),
      };
      setMessages((msgs) => [...msgs, aiMessage]);

      // 🧩 Simulate typing effect
      let currentText = "";
      const words = aiText.split(" ");
      let wordIndex = 0;

      const typeNextWord = () => {
        if (wordIndex < words.length) {
          currentText += (wordIndex > 0 ? " " : "") + words[wordIndex];
          wordIndex++;
          setMessages((msgs) => {
            const updated = [...msgs];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              text: currentText,
            };
            return updated;
          });
          setTimeout(typeNextWord, 30); // typing speed in ms
        } else {
          setLoading(false);
        }
      };

      typeNextWord();
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        { role: "assistant", text: `⚠️ Network error: ${err.message}` },
      ]);
      setLoading(false);
    }
  };

  // ✅ Handle Enter (send) and Shift+Enter (newline)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ✅ Clear chat manually
  const handleClearChat = () => {
    if (confirm("Clear chat history for this workflow?")) {
      localStorage.removeItem(storageKey);
      setMessages([]);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-700">
            💬 Chat with Workflow:{" "}
            <span className="text-blue-600">{workflow.name}</span>
          </h2>

          <div className="flex gap-3 items-center">
            <button
              onClick={handleClearChat}
              className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md"
            >
              🧹 Clear
            </button>

            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ✖ Close
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length === 0 && !loading && (
            <p className="text-center text-gray-400 italic mt-10">
              Start chatting with this workflow...
            </p>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-800 rounded-bl-none"
                }`}
              >
                <p>{msg.text}</p>
                <span className="block text-[10px] opacity-70 mt-1">
                  {msg.time}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-700 p-3 rounded-2xl rounded-bl-none text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.1s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}

          <div ref={chatEndRef}></div>
        </div>

        {/* Input Box */}
        <div className="p-4 border-t bg-white flex gap-2">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter = Send, Shift+Enter = New line)"
            className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none h-16"
          />

          <button
            onClick={handleSend}
            disabled={loading}
            className="bg-blue-600 text-white px-4 rounded-md hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
