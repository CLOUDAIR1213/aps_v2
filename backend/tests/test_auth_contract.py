from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_login_returns_frontend_user_contract() -> None:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})

    assert response.status_code == 200
    assert response.json() == {
        "username": "admin",
        "role": "admin",
        "token": "local-admin-admin",
    }


def test_login_rejects_invalid_password() -> None:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})

    assert response.status_code == 401


def test_me_keeps_simple_frontend_contract() -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json() == {"username": "admin", "role": "admin"}
