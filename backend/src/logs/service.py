import os
import shutil
from datetime import datetime
from fastapi import UploadFile
import uuid
from ..storage.minio_client import minio_client


UPLOAD_DIR = "uploaded_file"

os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_log_file(file: UploadFile, user_id: int):

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    object_name = f"logs/{user_id}/{timestamp}_{unique_id}_{file.filename}"
    unique_filename = f"{timestamp}_{file.filename}"
    file_content = file.file.read()
    file_size = len(file_content)
    # file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Lưu file vào minio
    # with open(file_path, "wb") as buffer:
    #     shutil.copyfileobj(file.file, buffer)

    minio_result = minio_client.upload_file(
        file_data=file_content,
        object_name=object_name,
        content_type=file.content_type or "text/plain"
    )

    # url = minio_client

    return minio_result
        