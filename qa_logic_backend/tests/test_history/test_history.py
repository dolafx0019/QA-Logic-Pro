import pytest
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.response import GenerationResponse
from app.db.database import AsyncSessionLocal, engine, Base
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.history import repository
from app.schemas.request import GenerationRequest

client = TestClient(app)

# Note: MVP relies on shared testing database instance handled implicitly,
# but we mock or construct isolated calls explicitly here natively.

# Simple asynchronous helper setting up memory state
@pytest.fixture(autouse=True)
async def db_setup_teardown():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

async def add_mock_history() -> str:
    """Helper injecting one valid map natively"""
    async with AsyncSessionLocal() as session:
        # Mock minimal Request
        request = GenerationRequest(user_story="Generate test mock.")
        # Mock minimal response (not valid against strict schema conceptually unless bypassed natively, 
        # so relying on Pydantic's construct if failing, but actual endpoint uses GenerationResponse)
        from app.schemas.response import ResponseMetadata
        response = GenerationResponse(
            metadata=ResponseMetadata(truncated=False, original_count=0),
            test_cases=[],
            clarification_questions=[],
            assumptions=[]
        )
        return await repository.save_history(session, request, response)

@pytest.mark.asyncio
async def test_history_save_and_retrieve():
    """Verifies internal repository stores safely and extracts successfully."""
    record_id = await add_mock_history()
    
    async with AsyncSessionLocal() as session:
        record = await repository.get_history_record(session, record_id)
        assert record is not None
        assert record.id == record_id
        assert record.request_payload.user_story == "Generate test mock."

@pytest.mark.asyncio
async def test_get_history_list_api():
    """Validates paginated summary structures"""
    await add_mock_history()
    await add_mock_history()
    
    # We must use AsyncClient with the lifespan event for standard async integration tests
    # However since we are testing thin read-endpoints, standard TestClient may work synchronously 
    # if it's not strictly tied to lifespan inside the request processing.
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/history?limit=10&offset=0")
        
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2

@pytest.mark.asyncio
async def test_get_history_missing_404():
    """Verify standard unknown ID mapping"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/history/fake-id")
        
    assert response.status_code == 404
    assert response.json()["code"] == "HISTORY_NOT_FOUND"

@pytest.mark.asyncio
async def test_export_by_history_id():
    """Assert successful export route mapping via history DB pipe natively."""
    record_id = await add_mock_history()
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/export", json={"history_id": record_id})
        
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

@pytest.mark.asyncio
async def test_get_history_malformed_500():
    """Verify corrupted history returns 500 HISTORY_PAYLOAD_INVALID"""
    record_id = await add_mock_history()
    
    # Corrupt the record directly in the DB
    async with AsyncSessionLocal() as session:
        from sqlalchemy import update
        from app.db.models import HistoryRecordORM
        await session.execute(
            update(HistoryRecordORM)
            .where(HistoryRecordORM.id == record_id)
            .values(response_payload_json="{corrupted_json")
        )
        await session.commit()
        
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/v1/history/{record_id}")
        
    assert response.status_code == 500
    assert response.json()["code"] == "HISTORY_PAYLOAD_INVALID"

@pytest.mark.asyncio
async def test_generate_succeeds_even_if_history_fails():
    """If history persistence fails, /generate still returns a successful response."""
    # Mock the save_history function to raise an exception
    with patch("app.api.v1.endpoints.generate.repository.save_history", side_effect=Exception("DB Failure")):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            
            # Note: /generate actually calls the gemini adapter. 
            # To test the endpoint properly without hitting real Gemini in a unit test, we should mock the gemini adapter too.
            with patch("app.api.v1.endpoints.generate.generate_test_cases", return_value=GenerationResponse(
                metadata={"truncated": False, "original_count": 1},
                test_cases=[{"id": "TC-1", "linked_requirement": "1", "title": "T", "preconditions": "", "steps": [], "expected_result": "", "priority": "High", "category": "Positive", "severity": 1, "probability": 1, "risk_score": 1, "risk_level": "Low", "notes": ""}],
                clarification_questions=[],
                assumptions=[]
            )):
                
                payload = {
                    "user_story": "As a user, I want to login.",
                    "acceptance_criteria": [],
                    "business_rules": []
                }
                
                response = await ac.post("/api/v1/generate", json=payload)
                
        # The main endpoint must succeed 200 despite the DB Failure
        assert response.status_code == 200
        assert len(response.json()["test_cases"]) == 1
