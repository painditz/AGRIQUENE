"""
AGRIQUENE Real-Time WebSocket Hub
Manages live connections for Procurement Centres and broadcasts instantaneous queue movements, token calls, and ETA updates to all listening farmers and buyers.
"""

from typing import Dict, List, Set, Any
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("agriquene.websocket")

class ConnectionManager:
    def __init__(self):
        # Map centre_id (str) -> set of WebSockets
        self.active_centre_connections: Dict[str, Set[WebSocket]] = {}
        # Global connections (e.g., admin monitoring state-wide feeds)
        self.global_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, centre_id: str = "global"):
        await websocket.accept()
        if centre_id == "global":
            self.global_connections.add(websocket)
        else:
            if centre_id not in self.active_centre_connections:
                self.active_centre_connections[centre_id] = set()
            self.active_centre_connections[centre_id].add(websocket)
        logger.info(f"WebSocket client connected to centre channel: {centre_id}")

    def disconnect(self, websocket: WebSocket, centre_id: str = "global"):
        if centre_id == "global":
            self.global_connections.discard(websocket)
        elif centre_id in self.active_centre_connections:
            self.active_centre_connections[centre_id].discard(websocket)
            if not self.active_centre_connections[centre_id]:
                del self.active_centre_connections[centre_id]
        logger.info(f"WebSocket client disconnected from centre channel: {centre_id}")

    async def broadcast_to_centre(self, centre_id: str, message: Dict[str, Any]):
        """
        Broadcasts an event message to all clients connected to a particular centre,
        as well as global administrative listeners.
        """
        payload = json.dumps(message)
        dead_connections = set()
        
        # 1. Centre-specific listeners
        if centre_id in self.active_centre_connections:
            for connection in list(self.active_centre_connections[centre_id]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    dead_connections.add(connection)
                    
            for dead in dead_connections:
                self.active_centre_connections[centre_id].discard(dead)
                
        # 2. Global listeners
        dead_globals = set()
        for connection in list(self.global_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                dead_globals.add(connection)
        for dead in dead_globals:
            self.global_connections.discard(dead)

    async def broadcast_global(self, message: Dict[str, Any]):
        payload = json.dumps(message)
        for conn in list(self.global_connections):
            try:
                await conn.send_text(payload)
            except Exception:
                self.global_connections.discard(conn)

manager = ConnectionManager()
