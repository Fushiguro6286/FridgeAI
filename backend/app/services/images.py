"""Validate uploaded images by their actual bytes, then re-encode for the AI call."""

import io
import warnings

from PIL import Image, UnidentifiedImageError

from app.errors import AppError

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_PIXELS = 40_000_000
MAX_SIDE_FOR_AI = 2048


def validate_and_prepare(data: bytes, max_bytes: int) -> bytes:
    """Return a JPEG copy of the image, downscaled and with all metadata (incl. GPS EXIF) stripped."""
    if not data:
        raise AppError(400, "empty_file", "The uploaded file is empty.")
    if len(data) > max_bytes:
        raise AppError(413, "file_too_large", f"Images must be {max_bytes // (1024 * 1024)} MB or smaller.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as probe:
                fmt = probe.format
                probe.verify()
            if fmt not in ALLOWED_FORMATS:
                raise AppError(415, "unsupported_format", "Please upload a JPG, PNG or WEBP image.")
            with Image.open(io.BytesIO(data)) as img:
                if img.width * img.height > MAX_PIXELS:
                    raise AppError(413, "image_too_large", "The image dimensions are too large.")
                if getattr(img, "is_animated", False):
                    raise AppError(415, "unsupported_format", "Animated images are not supported.")
                img.load()
                rgb = img.convert("RGB")
    except AppError:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise AppError(415, "invalid_image", "This file is not a valid JPG, PNG or WEBP image.") from None
    except (OSError, SyntaxError, ValueError):
        raise AppError(400, "corrupt_image", "The image appears to be corrupted. Please try another photo.") from None

    rgb.thumbnail((MAX_SIDE_FOR_AI, MAX_SIDE_FOR_AI))
    out = io.BytesIO()
    rgb.save(out, format="JPEG", quality=85)
    return out.getvalue()
