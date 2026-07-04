from fastapi import HTTPException, status

# Strictly separated — no mixing documents with media
MEDIA_MIME_TYPES: set[str] = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/quicktime", "video/webm",
}

DOCUMENT_MIME_TYPES: set[str] = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

IMAGE_MIME_TYPES: set[str] = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
}

VIDEO_MIME_TYPES: set[str] = {
    "video/mp4", "video/quicktime", "video/webm",
}

MAX_SIZE_BYTES: dict[str, int] = {
    "image":    20  * 1024 * 1024,   #  20MB
    "video":    500 * 1024 * 1024,   # 500MB
    "pdf":      50  * 1024 * 1024,   #  50MB
    "document": 50  * 1024 * 1024,   #  50MB
}

MAX_VIDEO_DURATION_SECS = 5 * 60  # 5 minutes


def get_file_type(mime_type: str) -> str:
    """Returns file_type category or raises 415."""
    if mime_type in IMAGE_MIME_TYPES:
        return "image"
    if mime_type in VIDEO_MIME_TYPES:
        return "video"
    if mime_type == "application/pdf":
        return "pdf"
    if mime_type in DOCUMENT_MIME_TYPES:
        return "document"
    raise HTTPException(
        status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        f"File type '{mime_type}' is not supported",
    )


def validate_upload(mime_type: str, size_bytes: int) -> str:
    """Validate mime type and size. Returns file_type string."""
    file_type = get_file_type(mime_type)
    max_size = MAX_SIZE_BYTES[file_type]

    if size_bytes > max_size:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"{file_type.capitalize()} files must be under "
            f"{max_size // (1024 * 1024)}MB",
        )

    return file_type


def is_media_type(mime_type: str) -> bool:
    return mime_type in MEDIA_MIME_TYPES


def is_document_type(mime_type: str) -> bool:
    return mime_type in DOCUMENT_MIME_TYPES