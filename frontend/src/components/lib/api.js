const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export const createWorkflow = async (data) => {
  const res = await fetch(`${API_BASE}/workflows/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const getWorkflows = async () => {
  const res = await fetch(`${API_BASE}/workflows/`);
  return res.json();
};

export const getWorkflowById = async (id) => {
  const res = await fetch(`${API_BASE}/workflows/${id}`);
  return res.json();
};

export const runChatWorkflow = async (workflowId, query) => {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow_id: workflowId, query }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Chat workflow failed");
  }

  return res.json();
};

export const sendChatQuery = async (workflow_id, query) => {
  const res = await fetch(`${API_BASE}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow_id, query }),
  });
  return res.json();
};

export async function deleteAllWorkflows() {
  const res = await fetch(`${API_BASE}/workflows/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete workflows");
  return res.json();
}


export async function deleteWorkflow(id) {
  const res = await fetch(`${API_BASE}/workflows/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete workflow");
  return res.json();
}



