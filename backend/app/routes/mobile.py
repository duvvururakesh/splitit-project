"""
Mobile-facing endpoints — no auth required (accessed via QR code link).
"""
import io
import os
import uuid

import pillow_heif
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse
from PIL import Image
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.receipt import Receipt
from app.routes.ws import notify_desktop

pillow_heif.register_heif_opener()

router = APIRouter(prefix="/mobile", tags=["mobile"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "heic", "heif"}


@router.post("/upload/{session_id}")
async def mobile_upload(
    session_id: str,
    uploader_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    ext = (file.filename or "").split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP, and HEIC allowed")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    # Convert HEIC/HEIF → JPEG
    if ext in {"heic", "heif"}:
        try:
            img = Image.open(io.BytesIO(contents))
            buf = io.BytesIO()
            img.convert("RGB").save(buf, format="JPEG", quality=92)
            contents = buf.getvalue()
            ext = "jpg"
        except Exception:
            raise HTTPException(status_code=400, detail="Could not convert HEIC image")

    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    from app.models.user import User
    user = db.query(User).filter(User.id == uploader_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    receipt = Receipt(uploader_id=uploader_id, image_path=file_path, ocr_status="pending")
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    await notify_desktop(session_id, str(receipt.id))

    return {"receipt_id": str(receipt.id), "status": "uploaded"}


@router.get("/scan/{session_id}")
def mobile_scan_page(request: Request, session_id: str, uploader_id: str):
    """Returns an HTML page for the phone camera — uses absolute backend URL."""
    # Build the upload URL from the incoming request so it works on any network
    base_url = str(request.base_url).rstrip("/")
    upload_url = f"{base_url}/api/mobile/upload/{session_id}"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scan Receipt — Splitit</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: system-ui, sans-serif; background: #f0fdf4; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }}
    .card {{ background: white; border-radius: 20px; padding: 36px 24px; max-width: 360px; width: 100%; text-align: center; box-shadow: 0 4px 32px rgba(0,0,0,0.10); }}
    h1 {{ font-size: 22px; font-weight: 700; color: #111; margin-bottom: 8px; }}
    p {{ font-size: 14px; color: #6b7280; margin-bottom: 28px; line-height: 1.5; }}
    label {{ display: block; background: #0d9488; color: white; padding: 16px 24px; border-radius: 14px; font-size: 17px; font-weight: 600; cursor: pointer; margin-bottom: 12px; }}
    input[type=file] {{ display: none; }}
    #preview {{ width: 100%; border-radius: 12px; margin-bottom: 16px; display: none; max-height: 300px; object-fit: cover; }}
    button {{ width: 100%; background: #0d9488; color: white; border: none; padding: 16px; border-radius: 14px; font-size: 17px; font-weight: 600; cursor: pointer; display: none; }}
    button:disabled {{ opacity: 0.6; cursor: not-allowed; }}
    #status {{ font-size: 14px; color: #6b7280; margin-top: 14px; line-height: 1.5; }}
    .success {{ color: #0d9488; font-weight: 600; font-size: 16px; }}
    .error {{ color: #dc2626; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>📷 Scan Receipt</h1>
    <p>Take a photo of your receipt and we'll automatically split the items.</p>
    <img id="preview" alt="Preview" />
    <label for="camera">Take Photo</label>
    <input type="file" id="camera" accept="image/*,.heic,.heif" capture="environment" />
    <button id="uploadBtn">Upload Receipt →</button>
    <div id="status"></div>
  </div>
  <script>
    const input = document.getElementById('camera');
    const preview = document.getElementById('preview');
    const btn = document.getElementById('uploadBtn');
    const status = document.getElementById('status');
    let selectedFile = null;

    input.addEventListener('change', (e) => {{
      selectedFile = e.target.files[0];
      if (selectedFile) {{
        preview.src = URL.createObjectURL(selectedFile);
        preview.style.display = 'block';
        btn.style.display = 'block';
        status.textContent = '';
      }}
    }});

    btn.addEventListener('click', async () => {{
      if (!selectedFile) return;
      btn.disabled = true;
      status.textContent = 'Uploading...';

      const form = new FormData();
      form.append('file', selectedFile);
      form.append('uploader_id', '{uploader_id}');

      try {{
        const res = await fetch('{upload_url}', {{ method: 'POST', body: form }});
        if (res.ok) {{
          status.innerHTML = '<span class="success">✓ Receipt sent!<br>Go back to your computer.</span>';
          btn.style.display = 'none';
          input.disabled = true;
        }} else {{
          const err = await res.json().catch(() => ({{}}));
          status.innerHTML = '<span class="error">Upload failed: ' + (err.detail || 'please try again') + '</span>';
          btn.disabled = false;
        }}
      }} catch (e) {{
        status.innerHTML = '<span class="error">Network error — make sure you are on the same WiFi.</span>';
        btn.disabled = false;
      }}
    }});
  </script>
</body>
</html>"""
    return HTMLResponse(content=html)
