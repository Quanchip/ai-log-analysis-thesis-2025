import os
import shutil
from datetime import datetime
from fastapi import UploadFile

UPLOAD_DIR = "uploaded_file"

os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_log_file(file: UploadFile, user_id: int):

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Lưu file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "filename": file.filename,
        "file_path": file_path,
        "message": "File uploaded successfully"
    }