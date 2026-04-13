import asyncio
import json
import logging
import os
import uuid
from collections import defaultdict
from typing import Any

import httpx
import websockets
from fastapi import FastAPI, File, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger("app")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Audio Learning Pipeline")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

ML_WS_URL = os.getenv("ML_WS_URL", "ws://178.253.39.234")
TRANSCRIBER_BASE_URL = os.getenv("TRANSCRIBER_BASE_URL", "http://178.253.39.234")
SUMMARY_BASE_URL = os.getenv("SUMMARY_BASE_URL", "http://178.253.39.234")
TEST_BASE_URL = os.getenv("TEST_BASE_URL", "http://178.253.39.234")

ML_INIT_TIMEOUT_SECONDS = 12
ML_RECV_TIMEOUT_SECONDS = 65
SUMMARY_TIMEOUT_SECONDS = 60
TEST_TIMEOUT_SECONDS = 180
POSTPROCESS_STAGE_TOTAL_TIMEOUT_SECONDS = 120
POSTPROCESS_MAX_ATTEMPTS = 3

TASK_LOCK = asyncio.Lock()
TASKS: dict[str, dict[str, Any]] = {}
TASK_SUBSCRIBERS: dict[str, set[WebSocket]] = defaultdict(set)


class MLUnavailableError(Exception):
    pass


class MLTimeoutError(Exception):
    pass


class MLDisconnectedError(Exception):
    pass


def build_transcriber_ws_url() -> str:
    base = ML_WS_URL.strip()
    if base.endswith("/transcriber/ws/transcribe"):
        return base
    return base.rstrip("/") + "/transcriber/ws/transcribe"


def build_summary_url(path: str) -> str:
    return SUMMARY_BASE_URL.rstrip("/") + f"/summary/{path.lstrip('/')}"


def build_test_url(path: str) -> str:
    return TEST_BASE_URL.rstrip("/") + f"/test/{path.lstrip('/')}"


def build_transcriber_health_url() -> str:
    return TRANSCRIBER_BASE_URL.rstrip("/") + "/transcriber/health"


def create_task() -> dict[str, Any]:
    task_id = str(uuid.uuid4())
    task = {
        "id": task_id,
        "status": "processing",
        "transcript": [],
        "summary": [],
        "test": [],
        "error": None,
        "errors": {
            "transcript": None,
            "summary": None,
            "test": None,
        },
    }
    TASKS[task_id] = task
    return task


def reset_task(task_id: str) -> None:
    task = TASKS[task_id]
    task["status"] = "processing"
    task["transcript"] = []
    task["summary"] = []
    task["test"] = []
    task["error"] = None
    task["errors"] = {
        "transcript": None,
        "summary": None,
        "test": None,
    }


def snapshot_task(task_id: str) -> dict[str, Any]:
    task = TASKS[task_id]
    return {
        "id": task["id"],
        "status": task["status"],
        "transcript": list(task["transcript"]),
        "summary": list(task["summary"]),
        "test": list(task["test"]),
        "error": task["error"],
        "errors": dict(task.get("errors", {})),
    }


async def push_task_update(task_id: str) -> None:
    async with TASK_LOCK:
        if task_id not in TASKS:
            return
        payload = snapshot_task(task_id)
        subscribers = list(TASK_SUBSCRIBERS.get(task_id, set()))

    stale: list[WebSocket] = []
    for ws in subscribers:
        try:
            await ws.send_json(payload)
        except Exception:
            stale.append(ws)

    if stale:
        async with TASK_LOCK:
            for ws in stale:
                TASK_SUBSCRIBERS[task_id].discard(ws)


async def fail_task(task_id: str, error_message: str) -> None:
    async with TASK_LOCK:
        if task_id not in TASKS:
            return
        TASKS[task_id]["status"] = "failed"
        TASKS[task_id]["error"] = error_message
        TASKS[task_id].setdefault("errors", {})
        TASKS[task_id]["errors"]["transcript"] = error_message
    await push_task_update(task_id)


async def receive_frontend_init(websocket: WebSocket) -> dict[str, Any] | None:
    raw = await websocket.receive()
    if raw.get("type") == "websocket.disconnect":
        return None

    text = raw.get("text")
    if not text:
        await websocket.send_json({"type": "error", "code": "INVALID_INIT"})
        await websocket.close(code=1003)
        return None

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        await websocket.send_json({"type": "error", "code": "INVALID_INIT"})
        await websocket.close(code=1003)
        return None

    if not isinstance(payload, dict) or payload.get("type") != "init":
        await websocket.send_json({"type": "error", "code": "INVALID_INIT"})
        await websocket.close(code=1003)
        return None

    payload.setdefault("config", {})
    payload["config"].setdefault("language", None)
    return payload


async def check_ml_available() -> bool:
    ws_url = build_transcriber_ws_url()
    init_payload = {"type": "init", "config": {"language": None}}
    try:
        async with websockets.connect(ws_url, open_timeout=5, close_timeout=2, max_size=None) as ml_ws:
            await ml_ws.send(json.dumps(init_payload))
            raw = await asyncio.wait_for(ml_ws.recv(), timeout=ML_INIT_TIMEOUT_SECONDS)
            if isinstance(raw, (bytes, bytearray)):
                return False
            parsed = json.loads(raw)
            return isinstance(parsed, dict) and parsed.get("type") == "init_ack"
    except Exception:
        return False


async def check_transcriber_health_available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(build_transcriber_health_url())
            if resp.status_code != 200:
                return False
            body = resp.json()
            return body.get("status") == "healthy"
    except Exception:
        return False


async def check_summary_available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(build_summary_url("health"))
            if resp.status_code != 200:
                return False
            data = resp.json()
            return bool(data.get("llm_available"))
    except Exception:
        return False


async def check_test_available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(build_test_url("health"))
            if resp.status_code != 200:
                return False
            data = resp.json()
            return bool(data.get("llm_available"))
    except Exception:
        return False


async def generate_summary(transcript: list[dict[str, Any]]) -> tuple[list[dict[str, Any]] | None, str | None]:
    try:
        started_at = asyncio.get_running_loop().time()

        async with httpx.AsyncClient() as client:
            remaining = POSTPROCESS_STAGE_TOTAL_TIMEOUT_SECONDS - (asyncio.get_running_loop().time() - started_at)
            if remaining <= 0:
                return None, "Summary generation timeout"

            health_resp = await client.get(build_summary_url("health"), timeout=min(10.0, remaining))
            health_resp.raise_for_status()
            if not health_resp.json().get("llm_available"):
                return None, "LLM service unavailable"

            payload = {
                "transcript": [
                    {"start_ms": item.get("start_ms", 0), "text": item.get("text", "")}
                    for item in transcript
                ]
            }
            resp = None
            for attempt in range(1, POSTPROCESS_MAX_ATTEMPTS + 1):
                remaining = POSTPROCESS_STAGE_TOTAL_TIMEOUT_SECONDS - (asyncio.get_running_loop().time() - started_at)
                if remaining <= 0:
                    return None, "Summary generation timeout"
                resp = await client.post(
                    build_summary_url("summarize"),
                    json=payload,
                    timeout=min(SUMMARY_TIMEOUT_SECONDS, remaining),
                )
                if resp.status_code not in {502, 503, 504}:
                    break
                logger.warning("Summary API transient error (attempt %s): %s", attempt, resp.status_code)
                if attempt < POSTPROCESS_MAX_ATTEMPTS:
                    await asyncio.sleep(1.2 * attempt)
            if resp.status_code >= 400:
                message = resp.text
                try:
                    message = resp.json().get("message", message)
                except Exception:
                    pass
                if resp.status_code in {502, 503, 504}:
                    return None, "Summary generation timeout"
                return None, str(message)

            body = resp.json()
            if isinstance(body, dict) and body.get("status") == "error":
                return None, str(body.get("message") or "Summary generation failed")
            if isinstance(body, dict) and body.get("status") == "success" and isinstance(body.get("summary"), list):
                return body["summary"], None
            if isinstance(body, dict) and isinstance(body.get("summary"), list):
                return body["summary"], None
            return None, "Invalid summary response"
    except httpx.TimeoutException:
        return None, "Summary generation timeout"
    except Exception as exc:
        return None, str(exc)


async def generate_test(transcript: list[dict[str, Any]]) -> tuple[list[dict[str, Any]] | None, str | None]:
    try:
        started_at = asyncio.get_running_loop().time()

        async with httpx.AsyncClient() as client:
            remaining = POSTPROCESS_STAGE_TOTAL_TIMEOUT_SECONDS - (asyncio.get_running_loop().time() - started_at)
            if remaining <= 0:
                return None, "Test generation timeout"

            health_resp = await client.get(build_test_url("health"), timeout=min(10.0, remaining))
            health_resp.raise_for_status()
            if not health_resp.json().get("llm_available"):
                return None, "Test generation unavailable"

            payload = {
                "transcript": [
                    {"start_ms": item.get("start_ms", 0), "text": item.get("text", "")}
                    for item in transcript
                ],
                "num_questions": 10,
            }
            resp = None
            for attempt in range(1, POSTPROCESS_MAX_ATTEMPTS + 1):
                remaining = POSTPROCESS_STAGE_TOTAL_TIMEOUT_SECONDS - (asyncio.get_running_loop().time() - started_at)
                if remaining <= 0:
                    return None, "Test generation timeout"
                resp = await client.post(
                    build_test_url("generate"),
                    json=payload,
                    timeout=min(TEST_TIMEOUT_SECONDS, remaining),
                )
                if resp.status_code not in {502, 503, 504}:
                    break
                logger.warning("Test API transient error (attempt %s): %s", attempt, resp.status_code)
                if attempt < POSTPROCESS_MAX_ATTEMPTS:
                    await asyncio.sleep(1.5 * attempt)
            if resp.status_code >= 400:
                message = resp.text
                try:
                    message = resp.json().get("message", message)
                except Exception:
                    pass
                if resp.status_code in {502, 503, 504}:
                    return None, "Test generation timeout"
                return None, str(message)

            body = resp.json()
            if isinstance(body, dict) and body.get("status") == "error":
                return None, str(body.get("message") or "Test generation failed")
            if isinstance(body, dict) and body.get("status") == "success" and isinstance(body.get("test"), list):
                return body["test"], None
            if isinstance(body, dict) and isinstance(body.get("test"), list):
                return body["test"], None
            return None, "Invalid test response"
    except httpx.TimeoutException:
        return None, "Test generation timeout"
    except Exception as exc:
        return None, str(exc)


async def run_postprocessing(task_id: str, transcript: list[dict[str, Any]]) -> None:
    pending: dict[asyncio.Task[tuple[list[dict[str, Any]] | None, str | None]], str] = {
        asyncio.create_task(generate_summary(transcript)): "summary",
        asyncio.create_task(generate_test(transcript)): "test",
    }

    while pending:
        done, _ = await asyncio.wait(set(pending.keys()), return_when=asyncio.FIRST_COMPLETED)
        for completed in done:
            section = pending.pop(completed)
            data, err = await completed

            async with TASK_LOCK:
                if task_id not in TASKS:
                    return
                task = TASKS[task_id]
                task.setdefault("errors", {})
                if data is not None:
                    task[section] = data
                task["errors"][section] = err

            await push_task_update(task_id)

    async with TASK_LOCK:
        if task_id not in TASKS:
            return
        task = TASKS[task_id]
        errors = task.get("errors", {})
        final_errors = [errors.get("summary"), errors.get("test")]
        if any(final_errors):
            task["status"] = "failed"
            task["error"] = next((item for item in final_errors if item), "Generation failed")
        else:
            task["status"] = "done"
            task["error"] = None

    await push_task_update(task_id)


async def relay_stream(websocket: WebSocket, task_id: str) -> None:
    init_payload = await receive_frontend_init(websocket)
    if init_payload is None:
        return

    ws_url = build_transcriber_ws_url()
    try:
        ml_ws = await websockets.connect(ws_url, open_timeout=8, close_timeout=2, max_size=None)
    except Exception:
        await websocket.send_json({"type": "error", "code": "ML_UNAVAILABLE"})
        await fail_task(task_id, "ML service unavailable")
        await websocket.close(code=1011)
        return

    transcript: list[dict[str, Any]] = []
    sent_end_or_cancel = False
    close_with_error: str | None = None

    try:
        await ml_ws.send(json.dumps(init_payload))

        try:
            init_reply = await asyncio.wait_for(ml_ws.recv(), timeout=ML_INIT_TIMEOUT_SECONDS)
        except asyncio.TimeoutError as exc:
            raise MLTimeoutError from exc

        if isinstance(init_reply, (bytes, bytearray)):
            raise MLDisconnectedError

        parsed_init = json.loads(init_reply)
        if not isinstance(parsed_init, dict) or parsed_init.get("type") != "init_ack":
            raise MLDisconnectedError

        await websocket.send_text(init_reply)

        async def frontend_to_ml() -> None:
            nonlocal sent_end_or_cancel
            while True:
                incoming = await websocket.receive()
                if incoming.get("type") == "websocket.disconnect":
                    break

                data = incoming.get("bytes")
                if data is not None:
                    await ml_ws.send(data)
                    continue

                text = incoming.get("text")
                if text is None:
                    continue

                try:
                    cmd = json.loads(text)
                except json.JSONDecodeError:
                    logger.warning("Ignored non-JSON text from frontend")
                    continue

                if not isinstance(cmd, dict):
                    logger.warning("Ignored unsupported JSON payload from frontend")
                    continue

                msg_type = cmd.get("type")
                if msg_type in {"end", "ping", "cancel"}:
                    if msg_type in {"end", "cancel"}:
                        sent_end_or_cancel = True
                    await ml_ws.send(text)
                else:
                    logger.warning("Ignored unsupported JSON command from frontend: %s", msg_type)

        async def ml_to_frontend() -> None:
            nonlocal close_with_error
            while True:
                try:
                    message = await asyncio.wait_for(ml_ws.recv(), timeout=ML_RECV_TIMEOUT_SECONDS)
                except asyncio.TimeoutError:
                    close_with_error = "TIMEOUT"
                    return

                if isinstance(message, (bytes, bytearray)):
                    continue

                try:
                    parsed = json.loads(message)
                except json.JSONDecodeError:
                    logger.warning("Ignored malformed JSON from ML")
                    continue

                if isinstance(parsed, dict) and parsed.get("type") == "transcript":
                    transcript.append(
                        {
                            "start_ms": parsed.get("start_ms", 0),
                            "end_ms": parsed.get("end_ms"),
                            "text": parsed.get("text", ""),
                            "is_final": parsed.get("is_final", False),
                        }
                    )

                await websocket.send_text(message)

        forward_task = asyncio.create_task(frontend_to_ml())
        backward_task = asyncio.create_task(ml_to_frontend())

        done, pending = await asyncio.wait(
            {forward_task, backward_task},
            return_when=asyncio.FIRST_COMPLETED,
        )

        for finished in done:
            err = finished.exception()
            if isinstance(err, WebSocketDisconnect):
                continue
            if isinstance(err, ConnectionClosed):
                if not sent_end_or_cancel:
                    close_with_error = "ML_DISCONNECTED"
            elif err:
                raise err

        for pending_task in pending:
            pending_task.cancel()

    except MLTimeoutError:
        close_with_error = "TIMEOUT"
    except (MLDisconnectedError, ConnectionClosed):
        if not sent_end_or_cancel:
            close_with_error = "ML_DISCONNECTED"
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Unexpected relay error")
        close_with_error = close_with_error or "ML_DISCONNECTED"
    finally:
        try:
            await ml_ws.close()
        except Exception:
            pass

    if close_with_error:
        try:
            await websocket.send_json({"type": "error", "code": close_with_error})
        except Exception:
            pass
        await fail_task(task_id, close_with_error)
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
        return

    async with TASK_LOCK:
        if task_id in TASKS:
            TASKS[task_id]["transcript"] = transcript
    await push_task_update(task_id)

    asyncio.create_task(run_postprocessing(task_id, transcript))

    try:
        await websocket.close(code=1000)
    except Exception:
        pass


@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.post("/api/upload")
async def upload_audio(file: UploadFile = File(...)):
    if not file.filename:
        return JSONResponse(status_code=400, content={"error": "Empty filename"})

    await file.read(1)

    async with TASK_LOCK:
        task = create_task()

    return {"task_id": task["id"], "status": task["status"]}


@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    async with TASK_LOCK:
        if task_id not in TASKS:
            return JSONResponse(status_code=404, content={"error": "Task not found"})
        return snapshot_task(task_id)


@app.websocket("/ws/tasks/{task_id}")
async def ws_task_updates(websocket: WebSocket, task_id: str):
    await websocket.accept()

    async with TASK_LOCK:
        if task_id not in TASKS:
            await websocket.send_json({"type": "error", "code": "TASK_NOT_FOUND"})
            await websocket.close(code=1008)
            return
        TASK_SUBSCRIBERS[task_id].add(websocket)
        payload = snapshot_task(task_id)

    await websocket.send_json(payload)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        async with TASK_LOCK:
            TASK_SUBSCRIBERS[task_id].discard(websocket)


@app.websocket("/ws/stream")
async def ws_stream(websocket: WebSocket):
    await websocket.accept()
    task_id = websocket.query_params.get("task_id") or str(uuid.uuid4())

    async with TASK_LOCK:
        if task_id not in TASKS:
            TASKS[task_id] = {
                "id": task_id,
                "status": "processing",
                "transcript": [],
                "summary": [],
                "test": [],
                "error": None,
                "errors": {
                    "transcript": None,
                    "summary": None,
                    "test": None,
                },
            }
        else:
            reset_task(task_id)

    await push_task_update(task_id)
    await relay_stream(websocket, task_id)


@app.get("/check-ml")
async def check_ml():
    return {"ml_available": await check_ml_available()}


@app.get("/health")
async def health():
    transcriber_http_available, transcriber_ws_available, summary_available, test_available = await asyncio.gather(
        check_transcriber_health_available(),
        check_ml_available(),
        check_summary_available(),
        check_test_available(),
    )
    ml_available = transcriber_http_available and transcriber_ws_available
    overall = ml_available and summary_available and test_available
    return {
        "status": "ok" if overall else "degraded",
        "ml_available": ml_available,
        "transcriber_http_available": transcriber_http_available,
        "transcriber_ws_available": transcriber_ws_available,
        "summary_available": summary_available,
        "test_available": test_available,
    }
