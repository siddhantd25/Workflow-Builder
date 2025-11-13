import { Handle, Position } from "@xyflow/react";
import React from "react";

export default function LLMEngineNode({ data }) {
  return (
    <div className="bg-green-100 border border-green-400 rounded-lg p-3 shadow-md text-center">
      <h3 className="font-semibold text-green-700">LLM Engine</h3>
      <p className="text-xs text-green-500">{data?.label || "LLM Processing"}</p>

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#16a34a" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#16a34a" }}
      />
    </div>
  );
}
