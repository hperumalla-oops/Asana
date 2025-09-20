
import "tailwindcss";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AsanaSlideUI() {
  const [step, setStep] = useState(0); // 0=auth,1=workspaces,2=projects,3=tasks
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const [tasks, setTasks] = useState<any[]>([]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!apiKey.trim()) {
      setError("Please enter an API key.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/asana/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.detail || data.message || "Authentication failed");
        return;
      }
      await fetchWorkspaces();
      setStep(1);
    } catch (err) {
      setLoading(false);
      setError(String(err));
    }
  };

  const fetchWorkspaces = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/asana/workspaces");
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.detail || "Failed to load workspaces");
        return;
      }
      setWorkspaces(data.data || []);
    } catch (err) {
      setLoading(false);
      setError(String(err));
    }
  };

  const handleWorkspaceSelect = async (ws: any) => {
    setSelectedWorkspace(ws);
    setLoading(true);
    try {
      const res = await fetch(`/api/asana/projects/${ws.workspace_id}`);
      const data = await res.json();
      setProjects(data.data || []);
      setLoading(false);
      setStep(2);
    } catch (err) {
      setLoading(false);
      setError(String(err));
    }
  };

  const handleProjectSelect = async (p: any) => {
    setSelectedProject(p);
    setLoading(true);
    try {
      const res = await fetch(`/api/asana/tasks/${p.project_id}`);
      const data = await res.json();
      let allTasks: any[] = [];
      if (Array.isArray(data.data)) {
        allTasks = data.data;
      } else if (data.data) {
        allTasks = [data.data];
      }
      setTasks(allTasks);
      setLoading(false);
      setStep(3);
    } catch (err) {
      setLoading(false);
      setError(String(err));
    }
  };

  const variants = {
    enter: { x: "100%", opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Asana Tasks</h1>

        <div className="relative bg-white rounded-2xl shadow-md p-6 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.form
                key="auth"
                initial="enter"
                animate="center"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.45 }}
                onSubmit={handleAuth}
                className="space-y-4"
              >
                <p className="text-sm text-gray-500">Step 1 — Authenticate with your Asana API key</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600">API Key</label>
                  <input
                  type="password"
                    className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-3"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API key"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                  disabled={loading}
                >
                  {loading ? "Authenticating..." : "Submit"}
                </button>
                {error && <div className="text-sm text-red-600">{error}</div>}
              </motion.form>
            )}

            {step === 1 && (
              <motion.div
                key="workspaces"
                initial="enter"
                animate="center"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.45 }}
              >
                <p className="text-sm text-gray-500 mb-4">Step 2 — Select a workspace</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.workspace_id}
                      onClick={() => handleWorkspaceSelect(ws)}
                      className="text-left p-4 rounded-xl border hover:shadow-lg transition flex flex-col"
                    >
                      <div className="text-lg font-medium">{ws.name}</div>
                      <div className="text-xs text-gray-500 mt-2">ID: {ws.workspace_id}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="projects"
                initial="enter"
                animate="center"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.45 }}
              >
                <p className="text-sm text-gray-500 mb-4">Step 3 — Select a project</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((p) => (
                    <button
  disabled={loading}
  onClick={() => handleProjectSelect(p)}
  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
>
  {loading ? (
    <div className="flex items-center space-x-2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      <span>Loading...</span>
    </div>
  ) : (
    p.name
  )}
</button>

                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="tasks"
                initial="enter"
                animate="center"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.45 }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Step 4 — Tasks for project</p>
                    <h2 className="text-xl font-semibold mt-1">{selectedProject?.name}</h2>
                    <div className="text-xs text-gray-400">{selectedProject?.project_id}</div>
                  </div>
                  <div className="space-x-2">
                    <button
                      className="px-3 py-1 rounded-md border text-sm"
                      onClick={() => setStep(2)}
                    >
                      Change Project
                    </button>
                    <button
                      className="px-3 py-1 rounded-md border text-sm"
                      onClick={() => {
                        setStep(0);
                        setWorkspaces([]);
                        setProjects([]);
                        setTasks([]);
                        setSelectedWorkspace(null);
                        setSelectedProject(null);
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {loading && <div className="text-sm text-gray-500">Loading tasks...</div>}
                  {!loading && tasks.length === 0 && (
                    <div className="text-sm text-gray-500">No tasks found for the selected project.</div>
                  )}
                  <div className="space-y-3">
  <TaskTable tasks={tasks} />
</div>
<div className="space-y-3">
  <UpdatedTasksTable />
</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}



function TaskTable({ tasks }: { tasks: any[] }) {
  const [selectedTasks, setSelectedTasks] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const toggleSelect = (task: any) => {
    setSelectedTasks((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
    );
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortConfig) return 0;
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];

    // custom sorting for Priority
    if (sortConfig.key === "Priority") {
      const order = ["Low", "Medium", "High"];
      valA = order.indexOf(valA);
      valB = order.indexOf(valB);
    }

    // custom sorting for Status
    if (sortConfig.key === "Status") {
      const order = ["Off track", "At risk", "On track"];
      valA = order.indexOf(valA);
      valB = order.indexOf(valB);
    }

    if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleAddTasks = async () => {
    await fetch("/api/asana/add-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedTasks),
    });
    alert("Tasks sent to backend!");
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Select</th>
            <th className="p-2 border cursor-pointer" onClick={() => handleSort("Name")}>
              Name
            </th>
            <th className="p-2 border cursor-pointer" onClick={() => handleSort("Assignee")}>
              Assignee
            </th>
            <th className="p-2 border cursor-pointer" onClick={() => handleSort("Due Date")}>
              Due Date
            </th>
            <th className="p-2 border cursor-pointer" onClick={() => handleSort("Priority")}>
              Priority
            </th>
            <th className="p-2 border cursor-pointer" onClick={() => handleSort("Status")}>
              Status
            </th>
            <th className="p-2 border">Task Details</th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="p-2 border text-center">
                <input
                  type="checkbox"
                  checked={selectedTasks.includes(task)}
                  onChange={() => toggleSelect(task)}
                />
              </td>
              <td className="p-2 border">{task.Name}</td>
              <td className="p-2 border">{task.gid}</td>
              <td className="p-2 border">{task.Assignee}</td>
              <td className="p-2 border">{task["Due Date"]}</td>
              <td className="p-2 border">{task.Priority}</td>
              <td className="p-2 border">{task.Status}</td>
              <td className="p-2 border">{task.Notes}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={handleAddTasks}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Add Tasks
      </button>
    </div>
  );
}


const PRIORITY_OPTIONS = ["Low", "Medium", "High"];
const STATUS_OPTIONS = ["Off track", "At risk", "On track"];
const ASSIGNEES = [
  "avindersahi@gmail.com",
  "gayathri21219444@gmail.com",
  "dhruvdhankher1@gmail.com",
  "himashree@example.com",
];

interface UpdatedTask {
  ID: string;
  Name: string;
  Assignee: string;
  Priority: string;
  Status: string;
  ["Due Date"]: string;
  Notes: string;
}

function UpdatedTasksTable() {
  const [tasks, setTasks] = useState<UpdatedTask[]>([]);
  const [showTable, setShowTable] = useState(false);

  const fetchUpdates = async () => {
    const res = await fetch("/api/asana/spiked-insights");
    const data = await res.json();
    setTasks(data.tasks);
    setShowTable(true);
  };

  const handleChange = (index: number, field: string, value: string) => {
    const newTasks = [...tasks];
    // @ts-ignore
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const handleSave = async () => {
    await fetch("/api/asana/update-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tasks),
    });
    alert("Updated tasks sent!");
  };

  return (
    <div className="mt-6">
      <button
        onClick={fetchUpdates}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        View Updated Tasks
      </button>

      {showTable && (
        <div className="overflow-x-auto mt-4">
          <h2 className="text-lg font-semibold mb-2">Spiked’s Insights (Editable)</h2>
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Assignee</th>
                <th className="p-2 border">Priority</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Due Date</th>
                <th className="p-2 border">Notes</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, i) => (
                <tr key={task.ID} className="hover:bg-gray-50">
                  <td className="p-2 border">{task.Name}</td>

                  {/* Assignee dropdown */}
                  <td className="p-2 border">
                    <select
                      value={task.Assignee}
                      onChange={(e) => handleChange(i, "Assignee", e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      {ASSIGNEES.map((assignee) => (
                        <option key={assignee} value={assignee}>
                          {assignee}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Priority dropdown */}
                  <td className="p-2 border">
                    <select
                      value={task.Priority}
                      onChange={(e) => handleChange(i, "Priority", e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Status dropdown */}
                  <td className="p-2 border">
                    <select
                      value={task.Status}
                      onChange={(e) => handleChange(i, "Status", e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Due Date picker */}
                  <td className="p-2 border">
                    <input
                      type="date"
                      value={task["Due Date"]}
                      onChange={(e) => handleChange(i, "Due Date", e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                  </td>

                  {/* Notes free text */}
                  <td className="p-2 border">
                    <input
                      type="text"
                      value={task.Notes}
                      onChange={(e) => handleChange(i, "Notes", e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={handleSave}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save Updates
          </button>
        </div>
      )}
    </div>
  );
}



// // Dropdown options
// const PRIORITY_OPTIONS = ["Low", "Medium", "High"];
// const STATUS_OPTIONS = ["Off track", "At risk", "On track"];
// const ASSIGNEES = [
//   "avindersahi@gmail.com",
//   "gayathri21219444@gmail.com",
//   "dhruvdhankher1@gmail.com",
//   "himashree@example.com",
// ];

// interface Task {
//   ID: string;
//   Name: string;
//   Assignee: string;
//   Priority: string;
//   Status: string;
//   ["Due Date"]: string;
//   Notes: string;
// }

// // ---------------------------
// // 1. TASK TABLE (from Asana)
// // ---------------------------
// function TaskTable({ projectId }: { projectId: string }) {
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
//   const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

//   // Fetch tasks directly from Asana via backend
//   useEffect(() => {
//     const fetchAsanaTasks = async () => {
//       const res = await fetch(`/api/asana/tasks/${projectId}`);
//       const data = await res.json();
//       setTasks(data || []);
//     };
//     fetchAsanaTasks();
//   }, [projectId]);

//   const toggleSelect = (task: Task) => {
//     setSelectedTasks((prev) =>
//       prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
//     );
//   };

//   const handleSort = (key: string) => {
//     let direction: "asc" | "desc" = "asc";
//     if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
//       direction = "desc";
//     }
//     setSortConfig({ key, direction });
//   };

//   const sortedTasks = [...tasks].sort((a, b) => {
//     if (!sortConfig) return 0;
//     let valA = a[sortConfig.key as keyof Task];
//     let valB = b[sortConfig.key as keyof Task];

//     if (sortConfig.key === "Priority") {
//       const order = ["Low", "Medium", "High"];
//       valA = order.indexOf(valA as string);
//       valB = order.indexOf(valB as string);
//     }

//     if (sortConfig.key === "Status") {
//       const order = ["Off track", "At risk", "On track"];
//       valA = order.indexOf(valA as string);
//       valB = order.indexOf(valB as string);
//     }

//     if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
//     if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
//     return 0;
//   });

//   const handleAddTasks = async () => {
//     await fetch("/api/asana/add-tasks", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(selectedTasks),
//     });
//     alert("Tasks added to Supabase!");
//   };

//   return (
//     <div className="overflow-x-auto">
//       <h2 className="text-lg font-semibold mb-2">Asana Tasks</h2>
//       <table className="min-w-full border border-gray-200">
//         <thead>
//           <tr className="bg-gray-100">
//             <th className="p-2 border">Select</th>
//             <th className="p-2 border cursor-pointer" onClick={() => handleSort("Name")}>Name</th>
//             <th className="p-2 border cursor-pointer" onClick={() => handleSort("Assignee")}>Assignee</th>
//             <th className="p-2 border cursor-pointer" onClick={() => handleSort("Due Date")}>Due Date</th>
//             <th className="p-2 border cursor-pointer" onClick={() => handleSort("Priority")}>Priority</th>
//             <th className="p-2 border cursor-pointer" onClick={() => handleSort("Status")}>Status</th>
//             <th className="p-2 border">Notes</th>
//           </tr>
//         </thead>
//         <tbody>
//           {sortedTasks.map((task, i) => (
//             <tr key={i} className="hover:bg-gray-50">
//               <td className="p-2 border text-center">
//                 <input
//                   type="checkbox"
//                   checked={selectedTasks.includes(task)}
//                   onChange={() => toggleSelect(task)}
//                 />
//               </td>
//               <td className="p-2 border">{task.Name}</td>
//               <td className="p-2 border">{task.Assignee}</td>
//               <td className="p-2 border">{task["Due Date"]}</td>
//               <td className="p-2 border">{task.Priority}</td>
//               <td className="p-2 border">{task.Status}</td>
//               <td className="p-2 border">{task.Notes}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       <button
//         onClick={handleAddTasks}
//         className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
//       >
//         Add Selected Tasks to Supabase
//       </button>
//     </div>
//   );
// }

// // ----------------------------------
// // 2. GET TASKS FROM SUPABASE (edit)
// // ----------------------------------
// function SupabaseTasksTable() {
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [showTable, setShowTable] = useState(false);

//   const fetchFromSupabase = async () => {
//     const res = await fetch("/api/asana/tasks-from-supabase");
//     const data = await res.json();
//     setTasks(data.tasks);
//     setShowTable(true);
//   };

//   const handleChange = (index: number, field: string, value: string) => {
//     const newTasks = [...tasks];
//     // @ts-ignore
//     newTasks[index][field] = value;
//     setTasks(newTasks);
//   };

//   const handleSave = async () => {
//     await fetch("/api/asana/update-tasks", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(tasks),
//     });
//     alert("Tasks sent back to Asana!");
//   };

//   return (
//     <div className="mt-6">
//       <button
//         onClick={fetchFromSupabase}
//         className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
//       >
//         View Tasks from Supabase
//       </button>

//       {showTable && (
//         <div className="overflow-x-auto mt-4">
//           <h2 className="text-lg font-semibold mb-2">Supabase Tasks (Editable)</h2>
//           <table className="min-w-full border border-gray-200">
//             <thead>
//               <tr className="bg-gray-100">
//                 <th className="p-2 border">Name</th>
//                 <th className="p-2 border">Assignee</th>
//                 <th className="p-2 border">Priority</th>
//                 <th className="p-2 border">Status</th>
//                 <th className="p-2 border">Due Date</th>
//                 <th className="p-2 border">Notes</th>
//               </tr>
//             </thead>
//             <tbody>
//               {tasks.map((task, i) => (
//                 <tr key={task.ID} className="hover:bg-gray-50">
//                   <td className="p-2 border">{task.Name}</td>

//                   {/* Assignee dropdown */}
//                   <td className="p-2 border">
//                     <select
//                       value={task.Assignee}
//                       onChange={(e) => handleChange(i, "Assignee", e.target.value)}
//                       className="border rounded px-2 py-1"
//                     >
//                       {ASSIGNEES.map((assignee) => (
//                         <option key={assignee} value={assignee}>
//                           {assignee}
//                         </option>
//                       ))}
//                     </select>
//                   </td>

//                   {/* Priority dropdown */}
//                   <td className="p-2 border">
//                     <select
//                       value={task.Priority}
//                       onChange={(e) => handleChange(i, "Priority", e.target.value)}
//                       className="border rounded px-2 py-1"
//                     >
//                       {PRIORITY_OPTIONS.map((p) => (
//                         <option key={p} value={p}>
//                           {p}
//                         </option>
//                       ))}
//                     </select>
//                   </td>

//                   {/* Status dropdown */}
//                   <td className="p-2 border">
//                     <select
//                       value={task.Status}
//                       onChange={(e) => handleChange(i, "Status", e.target.value)}
//                       className="border rounded px-2 py-1"
//                     >
//                       {STATUS_OPTIONS.map((s) => (
//                         <option key={s} value={s}>
//                           {s}
//                         </option>
//                       ))}
//                     </select>
//                   </td>

//                   {/* Due Date picker */}
//                   <td className="p-2 border">
//                     <input
//                       type="date"
//                       value={task["Due Date"]}
//                       onChange={(e) => handleChange(i, "Due Date", e.target.value)}
//                       className="border rounded px-2 py-1"
//                     />
//                   </td>

//                   {/* Notes free text */}
//                   <td className="p-2 border">
//                     <input
//                       type="text"
//                       value={task.Notes}
//                       onChange={(e) => handleChange(i, "Notes", e.target.value)}
//                       className="border rounded px-2 py-1 w-full"
//                     />
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           <button
//             onClick={handleSave}
//             className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
//           >
//             Save Updates to Asana
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }
