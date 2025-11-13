// frontend/src/components/SidePanel/ConfigPanel.jsx
import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function ConfigPanel({
  selectedNode,
  onChange,
  isOpen = true,
  onToggle,
  kbFiles,
  updateKBFiles
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const files = kbFiles || [];
  const [listing, setListing] = useState(false);
  const [listError, setListError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // fetch file list when selectedNode changes or collection name changes
  useEffect(() => {
    if (!selectedNode) return;

    if (selectedNode.type === "knowledgeBase") {
      const collectionName = selectedNode.data?.sourceName;
      if (collectionName) {
        listFiles(collectionName);
      }
    }
  }, [selectedNode?.id, selectedNode?.data?.sourceName, selectedNode?.type]);

  async function listFiles(collectionName) {
    setListing(true);
    setListError("");

    try {
      const res = await fetch(
        `${API_BASE}/knowledgebase/collections/${encodeURIComponent(
          collectionName
        )}/files`
      );

      const j = await res.json();

      if (!res.ok) {
        setListError(j.detail || "Failed to load files");
        updateKBFiles(collectionName, []); // ✅ shared state update
      } else {
        updateKBFiles(collectionName, j.files || []); // ✅ shared state update
      }
    } catch (err) {
      setListError(err.message);
      updateKBFiles(collectionName, []); // ❌ no local state, shared state only
    } finally {
      setListing(false);
    }
  }

  // Upload handler (same as before but triggers listFiles after success)
  const handlePDFUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const collectionName = selectedNode?.data?.sourceName;
    if (!collectionName) {
      alert("⚠️ Please enter a Collection Name before uploading.");
      return;
    }

    setUploading(true);
    setUploadMessage("");

    try {
      const formData = new FormData();

      for (const file of selectedFiles) {
        formData.append("files", file); // ⬅ MUST MATCH backend
      }

      formData.append("collection_name", collectionName);

      const res = await fetch(`${API_BASE}/knowledgebase/upload-pdf/`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        setUploadMessage(`✅ ${result.message}`);
        listFiles(collectionName); // Refresh list
      } else {
        setUploadMessage(
          `❌ Error: ${result.detail || JSON.stringify(result)}`
        );
      }
    } catch (err) {
      setUploadMessage(`⚠️ Network error: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  };

  async function handleDeleteFile(fileId) {
    if (!selectedNode) return;
    const cn = selectedNode.data?.sourceName;
    if (!cn) return;
    if (!confirm("Delete this file and its embeddings from the collection?"))
      return;

    setDeletingId(fileId);
    try {
      const res = await fetch(
        `${API_BASE}/knowledgebase/collections/${encodeURIComponent(
          cn
        )}/files/${encodeURIComponent(fileId)}`,
        { method: "DELETE" }
      );
      const j = await res.json();
      if (res.ok) {
        // refresh list
        await listFiles(cn);
      } else {
        alert(`Delete failed: ${j.detail || JSON.stringify(j)}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  // collapsed view
  if (!isOpen) {
    return (
      <div className="h-full flex items-center justify-center border-l border-gray-300 bg-gray-50">
        <button
          onClick={onToggle}
          title="Open settings"
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    );
  }

  // open + no node selected
  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col p-4 border-l border-gray-300 bg-gray-50 w-72">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700 italic">
            No node selected
          </h2>
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-gray-100"
            title="Collapse"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center text-gray-400 italic">
          Select a node to configure
        </div>
      </div>
    );
  }

  const { type, data } = selectedNode;

  const getFields = () => {
    switch (type) {
      case "userQuery":
        return [
          { key: "placeholder", label: "Placeholder Text" },
          { key: "description", label: "Description" },
        ];
      case "knowledgeBase":
        return [
          { key: "sourceName", label: "Collection Name" },
          { key: "embeddingModel", label: "Embedding Model" },
          { key: "topK", label: "Top K Context", type: "number" },
        ];
      case "llmEngine":
        return [
          { key: "model", label: "Model" },
          { key: "temperature", label: "Temperature", type: "number" },
          { key: "customPrompt", label: "Custom Prompt" },
        ];
      case "output":
        return [
          { key: "responseFormat", label: "Response Format" },
          { key: "displayName", label: "Display Name" },
        ];
      default:
        return [];
    }
  };

  const handleChange = (key, value) => {
    onChange({ ...selectedNode.data, [key]: value });
  };

  return (
    <div className="h-full flex flex-col p-4 border-l border-gray-300 bg-gray-50 w-72">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-700 mb-0 capitalize">
          {type} Settings
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-gray-100"
            title="Collapse"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto">
        {getFields().map((field) => (
          <div key={field.key}>
            <label className="text-sm text-gray-600 mb-1 block">
              {field.label}
            </label>
            <input
              type={field.type || "text"}
              value={data?.[field.key] ?? ""}
              onChange={(e) =>
                handleChange(
                  field.key,
                  field.type === "number"
                    ? Number(e.target.value)
                    : e.target.value
                )
              }
              className="w-full border border-gray-300 rounded-md p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        ))}

        {/* PDF upload + list — only for knowledgeBase nodes */}
        {type === "knowledgeBase" && (
          <div className="mt-4 border-t pt-3">
            <label className="text-sm font-medium text-gray-600 block mb-1">
              Upload PDF to Knowledge Base
            </label>

            <input
              type="file"
              accept="application/pdf"
              onChange={handlePDFUpload}
              disabled={uploading}
              className="w-full text-sm border border-gray-300 p-2 rounded-md bg-white"
              multiple
            />

            {uploading && (
              <p className="text-sm text-blue-500 mt-2">⏳ Uploading...</p>
            )}
            {uploadMessage && (
              <p
                className={`text-sm mt-2 ${
                  uploadMessage.startsWith("✅")
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {uploadMessage}
              </p>
            )}

            <div className="mt-3">
              <h4 className="text-sm font-semibold mb-2">
                Files in collection
              </h4>

              {listing ? (
                <p className="text-sm text-gray-500">Loading files…</p>
              ) : listError ? (
                <p className="text-sm text-red-500">{listError}</p>
              ) : files.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No files yet for this collection.
                </p>
              ) : (
                <ul className="space-y-2 max-h-36 overflow-y-auto">
                  {files.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between bg-white p-2 rounded border"
                    >
                      <div className="text-sm">
                        <div className="font-medium">{f.filename}</div>
                        <div className="text-xs text-gray-500">
                          {f.size ? `${Math.round(f.size / 1024)} KB` : ""}{" "}
                          {f.uploaded_at
                            ? ` • ${new Date(f.uploaded_at).toLocaleString()}`
                            : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`${API_BASE}/knowledgebase/collections/${encodeURIComponent(
                            data?.sourceName || ""
                          )}/files/${encodeURIComponent(f.id)}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        >
                          Download
                        </a>

                        <button
                          onClick={() => handleDeleteFile(f.id)}
                          disabled={deletingId === f.id}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          {deletingId === f.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
