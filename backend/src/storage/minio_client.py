from minio import Minio
from minio.error import S3Error
from .config import settings
import io

class MinIOClient:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist"""
        try:
            if not self.client.bucket_exists(settings.MINIO_BUCKET_NAME):
                self.client.make_bucket(settings.MINIO_BUCKET_NAME)
                print(f"Bucket '{settings.MINIO_BUCKET_NAME}' created")
        except S3Error as e:
            print(f"Error creating bucket: {e}")

    def upload_file(self, file_data: bytes, object_name: str, content_type: str):
        """Upload file to MinIO"""
        try:
            file_stream = io.BytesIO(file_data)
            file_size = len(file_data)
            
            self.client.put_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name,
                data=file_stream,
                length=file_size,
                content_type=content_type
            )
            
            return {
                "bucket": settings.MINIO_BUCKET_NAME,
                "object_name": object_name,
                "url": f"{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET_NAME}/{object_name}",
                "message": "File upload successfully"
            }
        except S3Error as e:
            raise Exception(f"MinIO upload error: {e}")   
        

    def upload_process_file(self, file_data: bytes, object_name: str, content_type: str, bucket_name: str):
        """Upload file to MinIO"""
        try:
            file_stream = io.BytesIO(file_data)
            file_size = len(file_data)
            
            self.client.put_object(
                bucket_name=bucket_name,
                object_name=object_name,
                data=file_stream,
                length=file_size,
                content_type=content_type
            )
            
            return {
                "bucket": bucket_name,
                "object_name": object_name,
                "url": f"{settings.MINIO_ENDPOINT}/{bucket_name}/{object_name}",
                "message": "File upload successfully"
            }
        except S3Error as e:
            raise Exception(f"MinIO upload error: {e}")   

    def get_file_raw(self, object_name: str):
        """Download file from MinIO (default bucket)"""
        try:
            response = self.client.get_object(
                settings.MINIO_BUCKET_NAME,
                object_name
            )
            return response.read()
        except S3Error as e:
            raise Exception(f"MinIO download error: {e}")

    def get_object(self, bucket_name: str, object_name: str):
        """
        Download object from MinIO (any bucket).
        Returns a response object with .stream() method for chunked reading.

        Args:
            bucket_name: Name of the bucket
            object_name: Path to the object

        Returns:
            MinIO response object with .stream() method
        """
        try:
            response = self.client.get_object(
                bucket_name,
                object_name
            )
            return response
        except S3Error as e:
            raise Exception(f"MinIO download error from {bucket_name}/{object_name}: {e}")

    def get_file_url(self, object_name: str, expires: int = 3600):
        """Get presigned URL for file"""
        try:
            url = self.client.presigned_get_object(
                settings.MINIO_BUCKET_NAME,
                object_name,
                expires=expires
            )
            return url
        except S3Error as e:
            raise Exception(f"MinIO presigned URL error: {e}")
        
    

minio_client = MinIOClient()  