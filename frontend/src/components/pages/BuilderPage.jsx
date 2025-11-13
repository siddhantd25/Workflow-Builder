import React, { useState, useRef } from "react";
import Canvas from "../Canvas/Canvas";
import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  runChatWorkflow,
  deleteAllWorkflows,
  deleteWorkflow
} from "../lib/api";
import ChatModal from "../Chat/ChatModel";

export default function BuilderPage() {
  const [draggedNodeType, setDraggedNodeType] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [showChat, setShowChat] = useState(false);

  const components = [
    { type: "userQuery", label: "🟦 User Query" },
    { type: "knowledgeBase", label: "🟪 Knowledge Base" },
    { type: "llmEngine", label: "🟩 LLM Engine" },
    { type: "output", label: "🟨 Output" },
  ];

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
    setDraggedNodeType(nodeType);
  };

  const handleSave = async () => {
    const name = prompt("Enter a name for your workflow:");
    if (!name) return;

    const payload = {
      name,
      graph_json: { nodes, edges },
    };

    try {
      const saved = await createWorkflow(payload);
      setSelectedWorkflow(saved); // ✅ Auto-select right after saving
      alert(`✅ Workflow saved and ready! ID: ${saved.id}`);
    } catch (err) {
      alert(`❌ Error saving workflow: ${err.message}`);
    }
  };

  const handleLoadList = async () => {
    const data = await getWorkflows();
    setWorkflows(data);
  };

  const handleLoadWorkflow = async (id) => {
    const wf = await getWorkflowById(id);
    setNodes(wf.graph_json.nodes || []);
    setEdges(wf.graph_json.edges || []);
    setSelectedWorkflow(wf);
    alert(`✅ Loaded workflow: ${wf.name}`);
  };

  const handleRunChat = async () => {
    if (!selectedWorkflow) {
      alert("⚠️ Please load or save a workflow first!");
      return;
    }

    const query = prompt("Enter your question:");
    if (!query) return;

    try {
      const response = await runChatWorkflow(selectedWorkflow.id, query);
      alert(`🤖 Response:\n\n${response.response}`);
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-16 shadow-md border-b">
        <h1 className="text-2xl font-bold text-gray-700">
          AI Workflow Builder
        </h1>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition-all"
          >
            💾 Save
          </button>

          <button
            onClick={handleLoadList}
            className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 transition-all"
          >
            📂 Load
          </button>

          {selectedWorkflow && (
            <button
              onClick={() => setShowChat(true)}
              className="bg-purple-600 text-white px-4 py-1 rounded hover:bg-purple-700 transition-all"
            >
              💬 Chat with {selectedWorkflow.name}
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-gray-100 p-4">
          <h2 className="font-semibold text-gray-600 mb-3">Components</h2>
          <ul className="space-y-2">
            {components.map((c) => (
              <li
                key={c.type}
                draggable
                onDragStart={(e) => onDragStart(e, c.type)}
                className="cursor-grab p-2 bg-white rounded-md border border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all"
              >
                {c.label}
              </li>
            ))}
          </ul>

          {/* Workflow list when loading */}
          {workflows.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-600 mb-2">
                Saved Workflows
              </h3>
              <ul className="space-y-1 text-sm">
                {workflows.map((wf) => (
                  <li
                    key={wf.id}
                    className="flex justify-between items-center p-1 px-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    <span
                      className="cursor-pointer"
                      onClick={() => handleLoadWorkflow(wf.id)}
                    >
                      {wf.name}
                    </span>

                    <button
                      className="text-red-600 hover:text-red-800 ml-2"
                      onClick={async () => {
                        if (!confirm(`Delete workflow "${wf.name}"?`)) return;
                        await deleteWorkflow(wf.id);
                        alert("🗑️ Workflow deleted");
                        handleLoadList(); // refresh list
                        if (selectedWorkflow?.id === wf.id) {
                          setSelectedWorkflow(null);
                          setNodes([]);
                          setEdges([]);
                        }
                      }}
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>

              <button
                className="mt-3 w-full bg-red-600 text-white text-sm py-1 rounded hover:bg-red-700"
                onClick={async () => {
                  if (!confirm("Delete ALL workflows? This cannot be undone."))
                    return;
                  await deleteAllWorkflows();
                  alert("🗑️ All workflows deleted");
                  setWorkflows([]);
                  setSelectedWorkflow(null);
                  setNodes([]);
                  setEdges([]);
                }}
              >
          
                Delete All
              </button>
            </div>
          )}
        </aside>

        {/* Canvas workspace */}
        <section className="flex-1 h-[calc(100vh-64px)]">
          <Canvas
            draggedNodeType={draggedNodeType}
            nodes={nodes}
            setNodes={setNodes}
            edges={edges}
            setEdges={setEdges}
            onSave={handleSave}
          />
        </section>
      </main>

      {showChat && selectedWorkflow && (
        <ChatModal
          workflow={selectedWorkflow}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
