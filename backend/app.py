from fastapi import FastAPI, HTTPException, status, Depends,Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import requests

# from postgrest import APIError
# from core.config import get_g_vars
# from core.dependencies import get_user_id_from_token




BASE_URL = "https://app.asana.com/api/1.0"

class AsanaClient_mod:
    def __init__(self, api_key: str):
        self.headers = {"Authorization": f"Bearer {api_key}"}

    # -------------------
    # Validate API Key
    # -------------------
    def validate_api_key(self):
        """Validate the API key by attempting to fetch user info"""
        try:
            url = f"{BASE_URL}/users/me"
            response = requests.get(url, headers=self.headers)
            return response.status_code == 200
        except:
            return False

    # -------------------
    # Workspaces
    # -------------------
    def get_workspaces(self):
        url = f"{BASE_URL}/workspaces"
        res = requests.get(url, headers=self.headers).json()
        return [self.format_workspace(ws) for ws in res.get("data", [])]

    def format_workspace(self, ws: dict) -> dict:
        return {
            "workspace_id": ws.get("gid"),
            "name": ws.get("name"),
            "resource_type": ws.get("resource_type")
        }

    # -------------------
    # Projects
    # -------------------
    def get_projects(self, workspace_gid: str):
        url = f"{BASE_URL}/projects?workspace={workspace_gid}"
        res = requests.get(url, headers=self.headers).json()
        return [self.format_project(p) for p in res.get("data", [])]

    def format_project(self, project: dict) -> dict:
        return {
            "project_id": project.get("gid"),
            "name": project.get("name"),
            "resource_type": project.get("resource_type")
        }

    # -------------------
    # Tasks
    # -------------------

    def get_tasks(self, project_gid: str):
        """Fetch all tasks for a given project with full details."""
        url = f"{BASE_URL}/projects/{project_gid}/tasks"
        res = requests.get(url, headers=self.headers).json()

        tasks = []
        for t in res.get("data", []):
            # get full task details by gid
            details = self.get_task_details(t["gid"])
            tasks.append(details)

        return tasks

    def get_task_details(self, task_gid: str):
        """Fetch details for a specific task by gid."""
        url = f"{BASE_URL}/tasks/{task_gid}"
        res = requests.get(url, headers=self.headers).json()
        return self.format_task(res.get("data", {}),task_gid)

    def format_task(self, task: dict,task_gid: str) -> dict:
        """Extract and normalize task details."""

        # Custom fields
        custom_fields = {}
        for field in task.get("custom_fields", []):
            custom_fields[field.get("name")] = field.get("display_value")

        # Assignee
        assignee = None
        if task.get("assignee"):
            assignee = task["assignee"].get("name")

        # Followers
        followers = [f.get("name") for f in task.get("followers", [])]

        # Build filtered dict with only what you want
        filtered_task = {
            "Name": task.get("name"),
            "ID": task_gid,
            "Assignee": assignee or "Unassigned",
            "Priority": custom_fields.get("Priority", "Not set"),
            "Status": custom_fields.get("Status", "Not set"),
            "Due Date": task.get("due_on") or "No due date",
            "Followers": ", ".join(followers) if followers else None,
            "Notes": task.get("notes") if task.get("notes") else "(empty)",
            "Link": task.get("permalink_url"),
        }

        return filtered_task
    

app = FastAPI(title="Asana RAG Bot API", version="1.0.0")

# CORS middleware to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variable to store the current client
current_asana_client: Optional[AsanaClient_mod] = None

# Pydantic models
class AuthRequest(BaseModel):
    api_key: str

class TaskCreate(BaseModel):
    name: str
    notes: Optional[str] = ""
    projects: Optional[List[str]] = []
    assignee: Optional[str] = None
    due_on: Optional[str] = None
    start_on: Optional[str] = None

class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None

class DropRequest(BaseModel):
    selected_items: List[Dict[str, Any]]

class TaskPayload(BaseModel):
    id: str
    name: str
    notes: Optional[str] = None
    priority: Optional[str] = None
    estimated_time: Optional[str] = None

class AddTasksRequest(BaseModel):
    tasks: List[TaskPayload]
    workspace_gid: str
    project_gid: Optional[str] = None

# Dependency to get the current Asana client
async def get_asana_client():
    if current_asana_client is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please authenticate with Asana API key first."
        )
    return current_asana_client

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Asana RAG Bot API is running"}

api=''
# Authentication endpoint
@app.post("/api/asana/auth")
async def authenticate(auth_request: AuthRequest):
    global current_asana_client
    global api
    try:
        client = AsanaClient_mod(auth_request.api_key)
        
        # Validate the API key
        if not client.validate_api_key():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        current_asana_client = client
        api=auth_request.api_key
        print(api)
        return {"message": "Authentication successful", "status": "authenticated"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

# Asana API endpoints
@app.get("/api/asana/workspaces")
async def get_workspaces(client: AsanaClient_mod = Depends(get_asana_client)):
    try:
        workspaces = client.get_workspaces()
        # print({"blejjj",workspaces})
        return {"data": workspaces}
    

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/asana/projects/{workspace_id}")
async def get_projects(workspace_id: str, client: AsanaClient_mod = Depends(get_asana_client)):
    try:
        projects = client.get_projects(workspace_id)
        print(projects)
        return {"data": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/asana/tasks/{project_id}")
async def get_tasks(project_id: str, client: AsanaClient_mod = Depends(get_asana_client)):
    try:
        tasks = client.get_tasks(project_id)
        print("Tasks:")
        for t in tasks:
            print(t)   # now prints clean filtered tasks
            print("\n\n")

        if not tasks:
            print("⚠️ No tasks found in project.")
        
        return {"data": tasks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/asana/add-tasks")
async def add_tasks(request: Request):
    global stored_tasks
    data = await request.json()
    
    print("Received tasks from frontend:")
    for task in data:
        print(task)  # each task is a dict (Name, Assignee, Priority, etc.)
    
    stored_tasks = data  # save them in memory
    return {"status": "ok", "count": len(data)}


# @app.post("/api/asana/add-tasks", status_code=status.HTTP_201_CREATED)
# async def add_tasks_to_supabase(request: Request, user_id: str = Depends(get_user_id_from_token)):
#     """Adds multiple Asana tasks into Supabase."""
#     g_vars = get_g_vars()
#     supabase = g_vars["supabase"]

#     data = await request.json()   # list of task dicts

#     tasks_to_insert = []
#     for task in data:
#         tasks_to_insert.append({
#             "task_id": task.get("ID"),
#             "name": task.get("Name"),
#             "assignee": task.get("Assignee"),
#             "priority": task.get("Priority"),
#             "status": task.get("Status"),
#             "due_date": task.get("Due Date"),
#             "followers": task.get("Followers"),
#             "notes": task.get("Notes"),
#             "link": task.get("Link"),
#             "user_id": user_id
#         })

#     try:
#         response = supabase.table("tasks").insert(tasks_to_insert).execute()
#         if not response.data:
#             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to insert tasks")
#         return {"status": "ok", "inserted": len(response.data)}
#     except APIError as e:
#         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {e.message}")
#     except Exception as e:
#         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected error: {str(e)}")

# @app.get("/api/asana/tasks-from-supabase")
# async def get_tasks_from_supabase(user_id: str = Depends(get_user_id_from_token)):
#     """Fetch all tasks for the authenticated user from Supabase."""
#     g_vars = get_g_vars()
#     supabase = g_vars["supabase"]

#     response = (
#         supabase.table("tasks")
#         .select("*")
#         .eq("user_id", user_id)
#         .order("created_at")
#         .execute()
#     )

#     return {"tasks": response.data or []}

# from typing import Dict

# @app.put("/api/asana/tasks/{task_id}")
# async def update_task_in_supabase(
#     task_id: str,
#     task_update: Dict,
#     user_id: str = Depends(get_user_id_from_token)
# ):
#     g_vars = get_g_vars()
#     supabase = g_vars["supabase"]

#     update_data = {k: v for k, v in task_update.items() if v is not None}

#     response = (
#         supabase.table("tasks")
#         .update(update_data)
#         .eq("task_id", task_id)
#         .eq("user_id", user_id)
#         .execute()
#     )

#     if not response.data:
#         raise HTTPException(status_code=404, detail="Task not found or no permission")

#     return response.data[0]


# @app.delete("/api/asana/tasks/{task_id}", status_code=204)
# async def delete_task_from_supabase(task_id: str, user_id: str = Depends(get_user_id_from_token)):
#     g_vars = get_g_vars()
#     supabase = g_vars["supabase"]

#     response = (
#         supabase.table("tasks")
#         .delete()
#         .eq("task_id", task_id)
#         .eq("user_id", user_id)
#         .execute()
#     )

#     if not response.data:
#         raise HTTPException(status_code=404, detail="Task not found or no permission")

#     return None

from datetime import datetime, timedelta
import random

stored_tasks = []  # global storage for tasks

@app.get("/api/asana/spiked-insights")
async def spiked_insights():
    global stored_tasks
    if not stored_tasks:
        return {"tasks": []}  # nothing added yet

    updated_tasks = []
    for task in stored_tasks:
        # Copy so we don't mutate the original task
        t = task.copy()

        # Apply some arbitrary "insight" changes

        # Example: push due date by random days
        try:
            if t.get("Due Date") and t["Due Date"] != "No due date":
                due_date = datetime.strptime(t["Due Date"], "%Y-%m-%d")
                new_due_date = due_date + timedelta(days=random.randint(1, 5))
                t["Due Date"] = new_due_date.strftime("%Y-%m-%d")
        except Exception:
            pass

        # Flip priority randomly
        priorities = ["Low", "Medium", "High"]
        t["Priority"] = random.choice(priorities)

        # Change status randomly
        statuses = ["Off track", "At risk", "On track"]
        t["Status"] = random.choice(statuses)

        # Add some placeholder notes
        t["Notes"] = f"Suggested update for {t['Name']}"

        updated_tasks.append(t)

    return {"tasks": updated_tasks}

@app.post("/api/asana/update-tasks")
async def update_tasks_to_asana(request: Request):   # to the main asana dashboard
    global api
    data = await request.json()

    def merge_notes(old_notes: str, new_notes: str) -> str:
        if not old_notes or old_notes == "(empty)":
            return new_notes
        if not new_notes:
            return old_notes
        return f"{old_notes}\n---\nSpiked Insights:\n{new_notes}"

    # If it's a list, loop over each
    if isinstance(data, list):
        results = []
        for task in data:
            task_id = task.get("ID")

            # Fetch existing task first to preserve current notes
            url_get = f"{BASE_URL}/tasks/{task_id}"
            headers = {
                "Authorization": f"Bearer {api}",
                "Content-Type": "application/json",
            }
            existing_resp = requests.get(url_get, headers=headers)
            old_notes = ""
            if existing_resp.ok:
                old_notes = existing_resp.json()["data"].get("notes", "")

            # Merge notes
            merged_notes = merge_notes(old_notes, task.get("Notes"))

            updates = {
                "due_on": task.get("Due Date"),
                "assignee": task.get("Assignee"),
                "notes": merged_notes,
                "name": task.get("Name"),
                # TODO: add priority/status via custom fields if needed
            }

            # Update task
            response = requests.put(url_get, json={"data": updates}, headers=headers)

            results.append({
                "task_id": task_id,
                "status": response.status_code,
                "response": response.json() if response.ok else response.text
            })

        return {"results": results}

    # Single task update
    task_id = data.get("ID")
    updates = data.get("updates", {})

    url_get = f"{BASE_URL}/tasks/{task_id}"
    headers = {
        "Authorization": f"Bearer {api}",
        "Content-Type": "application/json",
    }
    existing_resp = requests.get(url_get, headers=headers)
    old_notes = ""
    if existing_resp.ok:
        old_notes = existing_resp.json()["data"].get("notes", "")

    # Merge notes
    new_notes = updates.get("notes")
    updates["notes"] = merge_notes(old_notes, new_notes)

    # Update task
    response = requests.put(url_get, json={"data": updates}, headers=headers)
    return response.json()
