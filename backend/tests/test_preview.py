import io
import uuid
from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.utils.preview import generate_preview
from app.utils.storage import local_metadata_store
from app.config import settings


def test_generate_preview_for_image_file(tmp_path):
    image_path = tmp_path / "test_image.png"
    Image.new("RGB", (180, 180), color=(20, 140, 220)).save(image_path, "PNG")

    preview_path = generate_preview(image_path)

    assert preview_path is not None
    assert preview_path.exists()
    assert preview_path.suffix == ".png"
    assert preview_path.stat().st_size > 0


def test_generate_preview_placeholder_for_text_file(tmp_path):
    text_path = tmp_path / "test_note.txt"
    text_path.write_text("This is a preview placeholder test.", encoding="utf-8")

    preview_path = generate_preview(text_path)

    assert preview_path is not None
    assert preview_path.exists()
    assert preview_path.suffix == ".png"

    with Image.open(preview_path) as preview_img:
        assert preview_img.format == "PNG"
        assert preview_img.size == (300, 300)


def test_upload_endpoint_returns_preview_url():
    client = TestClient(app)

    image_bytes = io.BytesIO()
    Image.new("RGB", (90, 90), color=(120, 30, 210)).save(image_bytes, "PNG")
    image_bytes.seek(0)

    response = client.post(
        "/api/v1/upload",
        data={"job_id": str(uuid.uuid4())},
        files={"files": ("upload_test.png", image_bytes, "image/png")}
    )

    assert response.status_code == 200
    payload = response.json()
    assert "files" in payload
    assert len(payload["files"]) == 1
    assert payload["files"][0]["preview_url"] is not None


def test_preview_endpoint_serves_generated_png(tmp_path):
    image_path = tmp_path / "test_image.png"
    Image.new("RGB", (120, 120), color=(23, 75, 162)).save(image_path, "PNG")

    preview_path = generate_preview(image_path)
    assert preview_path is not None and preview_path.exists()

    job_id = str(uuid.uuid4())
    temp_filename = image_path.name
    local_metadata_store.clear()
    local_metadata_store[job_id] = {
        "job_id": job_id,
        "uploaded_meta": [
            {
                "temp_filename": temp_filename,
                "temp_path": str(image_path)
            }
        ]
    }

    client = TestClient(app)
    response = client.get(f"/api/v1/preview/{job_id}/{temp_filename}")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert len(response.content) > 0
