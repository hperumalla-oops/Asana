import logging
import os
import sys

import torch
import pytesseract
import tiktoken
from dotenv import load_dotenv
from google.cloud import storage
from supabase import create_client, Client
from transformers import AutoTokenizer, AutoModel

logger = logging.getLogger(__name__)

# --- Basic Setup ---
load_dotenv()

# --- Configuration ---
CHUNK_SIZE = 300
OVERLAP_SIZE = 50
TOP_K = 6
EMBEDDING_MODEL_NAME = "intfloat/e5-large-v2"
hf_token = os.getenv("HF_TOKEN").strip()   
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".pptx", ".ppt", ".html"}
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME").strip()
GCS_DOCS_PREFIX = "testing/"
GROQ_API_KEY = os.getenv("GROQ_API_KEY").strip()
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"
OPENAI_CHAT_MODEL = "gpt-4o-search-preview"
BASE_URL = os.getenv("BASE_URL", "https://spikedai-production-application-822359826336.us-central1.run.app").strip()
CHUNK_INSERT_BATCH_SIZE = 100
DEFAULT_TEST_USER_ID = "fd3ff615-b248-4e8f-84f1-ff458bf30d48"
APP_ENV = os.getenv("APP_ENV", "production")


# --- Global State & Clients ---
g_vars = {
    "supabase": None,
    "gcs_client": None,
    "embedding_tokenizer": None,
    "embedding_model": None,
    "tokenizer": tiktoken.get_encoding("cl100k_base"),
    "device": torch.device("cuda" if torch.cuda.is_available() else "cpu")
}


def get_g_vars():
    return g_vars

# def init_supabase_client():
#     """Initializes the Supabase client."""
#     supabase_url = os.getenv("SUPABASE_URL")
#     supabase_key = os.getenv("SUPABASE_KEY")
#     if not supabase_url or not supabase_key:
#         raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set.")
#     g_vars["supabase"] = create_client(supabase_url, supabase_key)
#     logger.info("Supabase client initialized.")

# def init_gcs_client():
#     """Initializes the Google Cloud Storage client."""
#     if not GCS_BUCKET_NAME:
#         raise ValueError("GCS_BUCKET_NAME must be set.")
#     g_vars["gcs_client"] = storage.Client()
#     logger.info("Google Cloud Storage client initialized.")

# async def init_embedding_model():
#     """Loads the embedding model and tokenizer."""
#     device = g_vars["device"]
#     logger.info(f"Loading embedding model '{EMBEDDING_MODEL_NAME}' onto device '{device}'")
#     g_vars["embedding_tokenizer"] = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME, token=hf_token)
#     g_vars["embedding_model"] = AutoModel.from_pretrained(EMBEDDING_MODEL_NAME, token=hf_token).to(device).eval()
#     logger.info("Embedding model loaded successfully.")

# def init_tesseract():
#     """Sets the Tesseract executable path if provided."""
#     tesseract_cmd = os.getenv("TESSERT_CMD")
#     if tesseract_cmd:
#         pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
#         logger.info(f"Tesseract executable path set to: {tesseract_cmd}")

# def close_clients():
#     """Placeholder for any client cleanup logic."""
#     pass