import { Handle, Position } from "@xyflow/react";
import React from "react";

export default function OutputNode({ data }) {
  return (
    <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3 shadow-md text-center">
      <h3 className="font-semibold text-yellow-700">Output</h3>
      <p className="text-xs text-yellow-500">{data?.label || "Chat Response"}</p>

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#ca8a04" }}
      />
    </div>
  );
}
