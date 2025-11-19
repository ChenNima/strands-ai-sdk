"""
Middleware package.
"""
from .auth import authenticate_requests

__all__ = ["authenticate_requests"]
