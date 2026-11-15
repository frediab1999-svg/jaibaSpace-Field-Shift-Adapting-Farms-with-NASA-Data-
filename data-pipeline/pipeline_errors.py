"""Domain-specific exceptions used by pipeline stages and the command line."""


class PipelineError(Exception):
    """Base error that can be reported without exposing a Python traceback."""


class ConfigurationError(PipelineError):
    """Raised when required pipeline settings or input files are invalid."""


class SourceError(PipelineError):
    """Raised when a source cannot be retrieved or parsed."""


class DataValidationError(PipelineError):
    """Raised when a dataset fails its declared validation rules."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__("; ".join(errors))


class PublicationError(PipelineError):
    """Raised when a validated dataset cannot be written safely."""
