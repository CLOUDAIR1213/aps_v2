from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.dashboard import router as dashboard_router
from app.api.machine import router as machine_router
from app.api.order import router as order_router
from app.api.routing import router as routing_router
from app.api.routing_operation import router as routing_operation_router
from app.api.scheduling import router as scheduling_router
from app.database import init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield


app = FastAPI(title="APS Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(machine_router)
app.include_router(order_router)
app.include_router(routing_router)
app.include_router(routing_operation_router)
app.include_router(scheduling_router)
app.include_router(dashboard_router)


@app.get("/")
async def health_check():
    return {"status": "ok"}
