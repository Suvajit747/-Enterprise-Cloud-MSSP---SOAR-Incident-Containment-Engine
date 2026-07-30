import json
import logging
import unittest

from app.logging_config import JsonLogFormatter, configure_logging


class StructuredLoggingTests(unittest.TestCase):
    def test_json_log_formatter_includes_structured_fields(self):
        record = logging.LogRecord(
            name="app.main",
            level=logging.INFO,
            pathname=__file__,
            lineno=10,
            msg="request_completed",
            args=(),
            exc_info=None,
        )
        record.event = "request_completed"
        record.request_id = "test-request-id"
        record.method = "GET"
        record.path = "/health"
        record.status_code = 200
        record.duration_ms = 12.34
        record.client_ip = "127.0.0.1"

        payload = json.loads(JsonLogFormatter().format(record))

        self.assertEqual(payload["message"], "request_completed")
        self.assertEqual(payload["event"], "request_completed")
        self.assertEqual(payload["request_id"], "test-request-id")
        self.assertEqual(payload["method"], "GET")
        self.assertEqual(payload["path"], "/health")
        self.assertEqual(payload["status_code"], 200)
        self.assertEqual(payload["duration_ms"], 12.34)
        self.assertEqual(payload["client_ip"], "127.0.0.1")
        self.assertEqual(payload["level"], "INFO")
        self.assertEqual(payload["logger"], "app.main")
        self.assertIn("timestamp", payload)

    def test_configure_logging_does_not_duplicate_structured_handler(self):
        configure_logging()
        configure_logging()

        structured_handlers = [
            handler
            for handler in logging.getLogger().handlers
            if handler.get_name() == "soar_json_console"
        ]

        self.assertEqual(len(structured_handlers), 1)
        self.assertIsInstance(structured_handlers[0].formatter, JsonLogFormatter)


if __name__ == "__main__":
    unittest.main()
