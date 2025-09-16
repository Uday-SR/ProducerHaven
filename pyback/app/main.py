from fastapi import FastAPI, UploadFile, File
import shutil
import subprocess
import uuid
from pathlib import Path

app = FastAPI()

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("output")

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

@app.post("/separate/")
async def separate(file: UploadFile = File(...)):
    # Generate unique file names
    file_id = str(uuid.uuid4())
    input_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
    output_path = OUTPUT_DIR / file_id

    # Save uploaded file
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Run Demucs command
    result = subprocess.run(
        ["demucs", str(input_path), "-o", str(output_path)],
        capture_output=True, text=True
    )

    if result.returncode != 0:
        return {"error": result.stderr}

    return {
        "message": "Separation completed",
        "output_folder": str(output_path)
    }
