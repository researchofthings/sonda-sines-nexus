from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Dict, List
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data storage
class ValueEntry:
    def __init__(self, key: str, value: float, timestamp: datetime):
        self.key = key
        self.value = value
        self.timestamp = timestamp

# In-memory storage
current_values: Dict[str, float] = {}
value_history: Dict[str, List[ValueEntry]] = {}
max_history_length = 100

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

@app.get("/api/values")
async def get_values():
    """Get all current values"""
    return current_values

@app.get("/api/history/{key}")
async def get_history(key: str):
    """Get history for a specific key"""
    if key in value_history:
        return {
            "key": key,
            "history": [
                {
                    "value": entry.value,
                    "timestamp": entry.timestamp.isoformat()
                }
                for entry in value_history[key]
            ]
        }
    return {"key": key, "history": []}

@app.post("/api/update")
async def update_value(request: dict):
    """Receive and store a new value"""
    key = request.get("key")
    value = request.get("value")
    
    if not key or value is None:
        return {"status": "error", "message": "Missing key or value"}
    
    timestamp = datetime.now()
    
    # Update current value
    current_values[key] = value
    
    # Add to history
    if key not in value_history:
        value_history[key] = []
    
    value_history[key].append(ValueEntry(key, value, timestamp))
    
    # Limit history size
    if len(value_history[key]) > max_history_length:
        value_history[key].pop(0)
    
    # Broadcast update to all connected clients
    await manager.broadcast({
        "type": "update",
        "key": key,
        "value": value,
        "timestamp": timestamp.isoformat()
    })
    
    return {"status": "success", "key": key, "value": value}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        # Send current values on connection
        await websocket.send_json({
            "type": "init",
            "values": current_values
        })
        
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
