"""
WebSocket endpoint for the QR code receipt scanning flow.

Flow:
1. Desktop opens WS connection with a session_id
2. Desktop displays QR code containing the mobile upload URL with session_id
3. Phone scans QR, opens mobile page, takes photo
4. Phone uploads photo via REST, backend notifies desktop via WS
5. Desktop receives receipt_id and proceeds to review
"""

import asyncio
from typing import Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# Active desktop WebSocket connections keyed by session_id
active_connections: Dict[str, WebSocket] = {}


@router.websocket("/ws/receipt-session/{session_id}")
async def receipt_session(websocket: WebSocket, session_id: str):
    await websocket.accept()
    active_connections[session_id] = websocket
    try:
        # Keep connection alive, waiting for phone upload notification
        while True:
            # Ping every 30s to keep the connection alive
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    finally:
        active_connections.pop(session_id, None)


async def notify_desktop(session_id: str, receipt_id: str):
    """Called by the mobile upload endpoint to notify the waiting desktop."""
    ws = active_connections.get(session_id)
    if ws:
        await ws.send_json({"type": "receipt_ready", "receipt_id": receipt_id})
