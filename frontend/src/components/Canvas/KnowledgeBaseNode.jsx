import React, { useEffect, useState, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function KnowledgeBaseNode({ data, kbFiles, updateKBFiles }) {
  const files = kbFiles || [];
  const [loading, setLoading] = useState(false);
  const collection = data?.sourceName?.trim();

  const fetchFiles = useCallback(async () => {
    if (!collection) return; 

    try {
      const res = await fetch(
        `${API_BASE}/knowledgebase/collections/${collection}/files`
      );
      const json = await res.json();
      updateKBFiles(collection, json.files || []);
    } catch (err) {
      console.error("Failed to load KB files:", err);
    }
  }, [collection, updateKBFiles]);

  // Run fetch when collection changes
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Download PDF
  const handleDownload = async (filename) => {
    try {
      const res = await fetch(
        `${API_BASE}/knowledgebase/collections/${collection}/files/${filename}/download`
      );
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`⚠️ Download error: ${err.message}`);
    }
  };

  // Delete PDF
  const handleDelete = async (filename) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      const res = await fetch(
        `${API_BASE}/knowledgebase/collections/${collection}/files/${filename}`,
        {
          method: "DELETE",
        }
      );
      const json = await res.json();

      alert(json.message || "Deleted");
      fetchFiles(); // 🔄 Sync update
    } catch (err) {
      alert(`⚠️ Delete error: ${err.message}`);
    }
  };

  return (
    <div className="bg-purple-100 border border-purple-400 rounded-lg p-3 shadow-md text-center min-w-[220px]">
      <h3 className="font-semibold text-purple-700">Knowledge Base</h3>
      <p className="text-xs text-purple-500 mb-2">
        {collection || "No collection name"}
      </p>

      {/* Files List */}
      <div className="mt-2 max-h-24 overflow-y-auto text-left text-xs bg-white border border-purple-200 rounded p-1">
        {files.length === 0 ? (
          <p className="text-gray-400 text-center italic">No files</p>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between border-b border-gray-200 py-0.5"
            >
              <span className="truncate mr-1">{file.filename}</span>

              <div className="flex gap-1">
                <button
                  onClick={() => handleDownload(file.filename)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Download"
                >
                  ⬇
                </button>
                <button
                  onClick={() => handleDelete(file.filename)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Handle type="target" position={Position.Left} style={{ background: "#a855f7" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#a855f7" }} />
    </div>
  );
}
