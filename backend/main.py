from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.chat_routes import router as chat_router

app = FastAPI(
    title="NaviX AI Tourism Assistant API",
    version="1.0.0",
    description="Multi-agent Sri Lankan tourism assistant backend.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/")
async def root():
    return {
        "service": "NaviX AI Tourism Assistant",
        "status": "online",
        "docs": "/docs",
    }
