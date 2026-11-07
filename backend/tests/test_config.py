"""The Anthropic key must come from the environment or a .env file, never from code."""

from app.config import Settings


def test_key_defaults_to_empty_without_env(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert Settings(_env_file=None).anthropic_api_key == ""


def test_key_read_from_environment(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-from-env")
    assert Settings(_env_file=None).anthropic_api_key == "sk-ant-from-env"


def test_key_read_from_env_file(monkeypatch, tmp_path):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text("ANTHROPIC_API_KEY=sk-ant-from-file\n")
    assert Settings(_env_file=env_file).anthropic_api_key == "sk-ant-from-file"
