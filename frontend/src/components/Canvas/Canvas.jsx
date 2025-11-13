import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { debounce } from "lodash";

import UserQueryNode from "../Canvas/UserQueryNode.jsx";
import KnowledgeBaseNode from "../Canvas/KnowledgeBaseNode.jsx";
import LLMEngineNode from "../Canvas/LLMEngineNode.jsx";
import OutputNode from "../Canvas/OutputNode.jsx";
import ConfigPanel from "../SidePanel/ConfigPanel.jsx";

const nodeTypes = {
  userQuery: UserQueryNode,
  knowledgeBase: KnowledgeBaseNode,
  llmEngine: LLMEngineNode,
  output: OutputNode,
};

function CanvasInner({
  draggedNodeType,
  nodes,
  setNodes,
  edges,
  setEdges,
  onSave,
}) {
  const reactFlowInstance = useReactFlow();
  const [selectedNode, setSelectedNode] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const wrapperRef = useRef(null);
  const [kbFiles, setKbFiles] = useState([]);

const updateKBFiles = (collection, files) => {
      setKbFiles((prev) => ({ ...prev, [collection]: files }));
    };

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement.tagName.toLowerCase();
      const isTyping =
        ["input", "textarea"].includes(activeTag) ||
        document.activeElement.isContentEditable;
      if (isTyping) e.stopPropagation();
    };
    

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  /* ---------- React Flow basic handlers ---------- */
  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed },
            animated: true,
          },
          eds
        )
      ),
    [setEdges]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: { label: `${type} node` },
        draggable: true,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeClick = (_, node) => {
    setSelectedNode(node);
    setContextMenu(null);
  };

  // Debounced update to avoid heavy re-renders while typing non-text configs
  const debouncedUpdate = useRef(
    debounce((id, updatedData) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            const mergedData = { ...n.data, ...updatedData };
            const labelKey =
              mergedData.displayName ||
              mergedData.sourceName ||
              mergedData.model ||
              mergedData.placeholder ||
              mergedData.description;

            return {
              ...n,
              data: {
                ...mergedData,
                label: labelKey || mergedData.label || `${n.type} node`,
              },
            };
          }
          return n;
        })
      );
    }, 300)
  ).current;

  const handleConfigChange = useCallback(
    (updatedData) => {
      if (!selectedNode) return;

      const isTextField =
        "displayName" in updatedData ||
        "placeholder" in updatedData ||
        "sourceName" in updatedData ||
        "model" in updatedData ||
        "description" in updatedData;

      // Live update for visual text fields
      if (isTextField) {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === selectedNode.id) {
              const mergedData = { ...n.data, ...updatedData };
              const labelKey =
                mergedData.displayName ||
                mergedData.sourceName ||
                mergedData.model ||
                mergedData.placeholder ||
                mergedData.description;

              return {
                ...n,
                data: {
                  ...mergedData,
                  label: labelKey || mergedData.label || `${n.type} node`,
                },
              };
            }
            return n;
          })
        );
      } else {
        // Debounced for non-text updates (like numbers or advanced configs)
        debouncedUpdate(selectedNode.id, updatedData);
      }

      // Always keep the panel data in sync immediately
      setSelectedNode((prev) =>
        prev
          ? {
              ...prev,
              data: { ...prev.data, ...updatedData },
            }
          : prev
      );
    },
    [selectedNode?.id]
  );

  /* ---------- Keyboard Shortcuts ---------- */
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Delete node/edge
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        setNodes((nds) => nds.filter((n) => !n.selected));
        setEdges((eds) => eds.filter((e) => !e.selected));
        setSelectedNode(null);
        return;
      }

      // Ctrl+S → Save
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (onSave) onSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, setNodes, setEdges]);

  /* ---------- Right-click Context Menu ---------- */
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setSelectedNode(node);
    setContextMenu({
      nodeId: node.id,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const handleMenuAction = (action) => {
    if (!contextMenu) return;
    const nodeId = contextMenu.nodeId;

    if (action === "delete") {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
    } else if (action === "duplicate") {
      setNodes((nds) => {
        const nodeToDup = nds.find((n) => n.id === nodeId);
        if (!nodeToDup) return nds;
        const newNode = {
          ...nodeToDup,
          id: `${nodeToDup.type}_${Date.now()}`,
          position: {
            x: nodeToDup.position.x + 50,
            y: nodeToDup.position.y + 50,
          },
          selected: false,
        };
        return nds.concat(newNode);
      });
    } else if (action === "rename") {
      const newLabel = prompt("Enter new name for node:");
      if (newLabel) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
          )
        );
      }
    }

    setContextMenu(null);
  };
  const enrichedNodes = nodes.map((node) => {
  if (node.type === "knowledgeBase") {
    return {
      ...node,
      data: {
        ...node.data,
        kbFiles: kbFiles[node.data?.sourceName] || [],
        updateKBFiles
      }
    };
  }
  return node;
});


  /* ---------- Render ---------- */
  return (
    <div className="flex w-full h-[calc(100vh-100px)] bg-gray-50 rounded-xl shadow-inner">
      <div
        className="flex-1 relative h-full"
        ref={wrapperRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={enrichedNodes}
          edges={edges}
          onNodesChange={(changes) =>
            setNodes((nds) => applyNodeChanges(changes, nds))
          }
          onEdgesChange={(changes) =>
            setEdges((eds) => applyEdgeChanges(changes, eds))
          }
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          edgeOptions={{
            type: "smoothstep",
            animated: true,
          }}
        >
          {/* ✅ MiniMap added here */}
          <MiniMap
            nodeStrokeColor={(n) => {
              if (n.type === "userQuery") return "#3b82f6";
              if (n.type === "knowledgeBase") return "#a855f7";
              if (n.type === "llmEngine") return "#16a34a";
              if (n.type === "output") return "#ca8a04";
              return "#999";
            }}
            nodeColor={(n) => {
              if (n.type === "userQuery") return "#bfdbfe";
              if (n.type === "knowledgeBase") return "#e9d5ff";
              if (n.type === "llmEngine") return "#bbf7d0";
              if (n.type === "output") return "#fef08a";
              return "#eee";
            }}
            nodeBorderRadius={2}
            zoomable
            pannable
          />
          <Background variant="dots" gap={16} size={1} />
          <Controls />
        </ReactFlow>

        {/* ✅ Context Menu */}
        {contextMenu && (
          <div
            className="absolute bg-white border border-gray-300 rounded-md shadow-lg z-50 text-sm"
            style={{
              top:
                contextMenu.y - wrapperRef.current.getBoundingClientRect().top,
              left:
                contextMenu.x - wrapperRef.current.getBoundingClientRect().left,
            }}
          >
            <button
              onClick={() => handleMenuAction("rename")}
              className="block w-full text-left px-3 py-1.5 hover:bg-gray-100"
            >
              ✏️ Rename
            </button>
            <button
              onClick={() => handleMenuAction("duplicate")}
              className="block w-full text-left px-3 py-1.5 hover:bg-gray-100"
            >
              📄 Duplicate
            </button>
            <button
              onClick={() => handleMenuAction("delete")}
              className="block w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50"
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>

      <div
        className={`transition-all duration-200 ease-in-out flex-shrink-0 ${
          panelOpen ? "w-72" : "w-12"
        }`}
      >

        <ConfigPanel
          selectedNode={selectedNode}
          onChange={handleConfigChange}
          isOpen={panelOpen}
          onToggle={() => setPanelOpen((v) => !v)}
          kbFiles={kbFiles[selectedNode?.data?.sourceName]}
          updateKBFiles={updateKBFiles}
        />
      </div>
    </div>
  );
}

export default function Canvas({
  draggedNodeType,
  nodes,
  setNodes,
  edges,
  setEdges,
  onSave,
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner
        draggedNodeType={draggedNodeType}
        nodes={nodes}
        setNodes={setNodes}
        edges={edges}
        setEdges={setEdges}
        onSave={onSave}
      />
    </ReactFlowProvider>
  );
}
