import boto3
from botocore.config import Config
from app.config import get_settings

settings = get_settings()


def get_s3_client():
    kwargs = dict(
        region_name=settings.aws_default_region,
        aws_access_key_id="test",
        aws_secret_access_key="test",
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},  # force path-style URLs
        ),
    )
    if settings.s3_endpoint_url:
        kwargs["endpoint_url"] = settings.s3_endpoint_url
    return boto3.client("s3", **kwargs)

def get_presign_client():
    """
    Client used only for generating presigned URLs.
    In development, uses localhost:4566 directly so the signature
    matches what the browser actually hits.
    In production, same as get_s3_client() — real AWS.
    """
    kwargs = dict(
        region_name=settings.aws_default_region,
        aws_access_key_id="test",
        aws_secret_access_key="test",
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )
    if settings.s3_endpoint_url:
        # Use localhost instead of the internal Docker hostname
        kwargs["endpoint_url"] = "http://localhost:4566"
    return boto3.client("s3", **kwargs)

def generate_presigned_get_url(
    s3_key: str, expires_in: int = 3600
) -> str:
    return get_presign_client().generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.s3_bucket_name,
            "Key": s3_key,
        },
        ExpiresIn=expires_in,
    )
    # return _fix_localstack_url(url)

def generate_presigned_put_url(
    s3_key: str, mime_type: str, expires_in: int = 3600
) -> str:
    return get_presign_client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.s3_bucket_name,
            "Key": s3_key,
            "ContentType": mime_type,
        },
        ExpiresIn=expires_in,
    )
    # return _fix_localstack_url(url)

# def _fix_localstack_url(url: str) -> str:
#     """
#     Presigned URLs are generated using the internal Docker hostname 'localstack'.
#     The client (browser/terminal) can't reach that — it needs 'localhost'.
#     In production this function does nothing (no localstack, real S3 URLs).
#     """
#     if settings.s3_endpoint_url:
#         return url.replace("http://localstack:4566", "http://localhost:4566")
#     return url


def delete_s3_object(s3_key: str) -> None:
    get_s3_client().delete_object(
        Bucket=settings.s3_bucket_name,
        Key=s3_key,
    )


def download_s3_object(s3_key: str, local_path: str) -> None:
    """Download file from S3 to local path — used by Celery worker."""
    get_s3_client().download_file(
        settings.s3_bucket_name,
        s3_key,
        local_path,
    )


def upload_s3_object(local_path: str, s3_key: str, content_type: str) -> None:
    """Upload a local file to S3 — used by Celery for thumbnails."""
    get_s3_client().upload_file(
        local_path,
        settings.s3_bucket_name,
        s3_key,
        ExtraArgs={"ContentType": content_type},
    )

# Why this works: The signature is computed using the endpoint URL hostname. If we generate with localstack:4566 but the browser PUTs to localhost:4566, the hostname in the signature doesn't match → 403. By generating with localhost:4566, the signature matches what the browser actually sends to.
# The _fix_localstack_url approach we had before only changed the URL string but not the signature embedded inside it. This approach generates the correct signature from the start.
# Save the file — FastAPI will reload. Then try the upload again.