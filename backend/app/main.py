import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routes import auth, friends, groups
from app.routes.expenses import router as expenses_router, settlements_router
from app.routes.receipts import router as receipts_router
from app.routes.mobile import router as mobile_router
from app.routes.ws import router as ws_router
from app.routes.bill_splits import router as bill_splits_router

app = FastAPI(title="Splitit API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.APP_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(friends.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(expenses_router, prefix="/api")
app.include_router(settlements_router, prefix="/api")
app.include_router(receipts_router, prefix="/api")
app.include_router(mobile_router, prefix="/api")
app.include_router(bill_splits_router, prefix="/api")
app.include_router(ws_router)

# Serve uploaded receipt images
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"message": "Splitit API is running"}
