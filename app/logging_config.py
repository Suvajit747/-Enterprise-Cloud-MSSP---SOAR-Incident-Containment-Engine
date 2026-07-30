import json
import logging
import sys
from datetime import datetime, timezone

from .config import LOG_LEVEL


_STANDARD_LOG_ATTRIBUTES = {
    "args",
    "asctime",
    "created",
    "exc_info",
    "exc_text",
    "filename",
    "funcName",
    "levelname",
    "levelno",
    "lineno",
    "module",
    "msecs",
    "message",
    "msg",
    "name",
    "pathname",
    "process",
    "processName",
    "relativeCreated",
    "stack_info",
    "taskName",
    "thread",
    "threadName",
}
_STRUCTURED_HANDLER_NAME = "soar_json_console"


class JsonLogFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc)
            .isoformat()
            .replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        for key, value in record.__dict__.items():
            if key in _STANDARD_LOG_ATTRIBUTES or key.startswith("_"):
                continue
            payload[key] = self._json_safe(value)

        return json.dumps(payload, separators=(",", ":"), sort_keys=True)

    def _json_safe(self, value):
        try:
            json.dumps(value)
        except (TypeError, ValueError):
            return str(value)
        return value


def configure_logging():
    log_level = getattr(logging, LOG_LEVEL, logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.set_name(_STRUCTURED_HANDLER_NAME)
    handler.setFormatter(JsonLogFormatter())
    handler.setLevel(log_level)

    root_logger = logging.getLogger()
    root_logger.handlers = [
        existing
        for existing in root_logger.handlers
        if existing.get_name() != _STRUCTURED_HANDLER_NAME
    ]
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level)
