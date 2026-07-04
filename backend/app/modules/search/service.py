# app/modules/search/service.py
# Re-exports from users service — search lives in its own module
# so it can later be swapped to Meilisearch without touching users/

from app.modules.users.service import search_users  # noqa: F401