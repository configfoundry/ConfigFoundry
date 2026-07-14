"""
Datadog's rendering step. Delegates to the shared YAML renderer -- Datadog
config today is plain YAML, so there's no Datadog-specific rendering logic
to add. This file exists so the platform package's rendering entry point
lives alongside its adapter/mapper, per the package layout in ADR-0008,
even though the actual work is shared, reusable logic.
"""
from core.platforms.datadog.models import DatadogPlatformModel
from core.platforms.rendering.yaml_renderer import render_yaml_files


def render(platform_model: DatadogPlatformModel) -> dict:
    """DatadogPlatformModel -> {filename: yaml_text}."""
    return render_yaml_files(platform_model.files)
