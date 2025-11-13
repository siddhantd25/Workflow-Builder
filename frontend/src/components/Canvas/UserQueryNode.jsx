import { Handle, Position } from "@xyflow/react";
import React from "react";

export default function UserQueryNode({ data, selected }) {
  return (
    <div
      className={`bg-blue-100 border ${
        selected ? "border-blue-600 shadow-lg" : "border-blue-400"
      } rounded-lg p-3 shadow-md text-center`}
    >
      <h3 className="font-semibold text-blue-700">User Query</h3>
      <p className="text-xs text-blue-500">{data?.label || "Entry point"}</p>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#3b82f6" }}
      />
    </div>
  );
}

