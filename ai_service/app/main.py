from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil, subprocess, uuid
from pathlib import Path
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("output")

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

@app.post("/separate/")
async def separate(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    input_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
    output_path = OUTPUT_DIR / file_id

    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = subprocess.run(
        ["demucs", "-n", "htdemucs", "-o", str(output_path), str(input_path)],
        capture_output=True, text=True
    )

    if result.returncode != 0:
        return {"error": result.stderr}

    # Map stems
    stems = {}
    stem_dir = output_path / "htdemucs" / input_path.stem
    for stem_name in ["vocals", "drums", "bass", "other"]:
        stem_path = stem_dir / f"{stem_name}.wav"
        if stem_path.exists():
            stems[stem_name] = f"http://127.0.0.1:8000/stems/{file_id}/{input_path.stem}/{stem_name}.wav"

    return {"message": "Separation completed", "stems": stems}

@app.get("/stems/{file_id}/{stem_folder}/{stem_name}")
async def get_stem(file_id: str, stem_folder: str, stem_name: str):
    file_path = OUTPUT_DIR / file_id / "htdemucs" / stem_folder / stem_name
    if file_path.exists():
        return FileResponse(file_path, media_type="audio/wav", filename=stem_name)
    return {"error": "Stem not found"}
