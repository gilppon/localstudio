import os
import sqlite3
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("HistoryDB")

DB_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(DB_DIR, "history.db")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """SQLite 데이터베이스 테이블 초기화"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS generation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_type TEXT NOT NULL,
            prompt TEXT NOT NULL,
            negative_prompt TEXT DEFAULT '',
            width INTEGER DEFAULT 1024,
            height INTEGER DEFAULT 1024,
            seed INTEGER DEFAULT 42,
            steps INTEGER DEFAULT 20,
            cfg REAL DEFAULT 7.0,
            model_name TEXT NOT NULL,
            image_url TEXT NOT NULL,
            thumbnail_url TEXT DEFAULT '',
            is_favorite INTEGER DEFAULT 0,
            metadata_json TEXT DEFAULT '{}',
            created_at TEXT NOT NULL
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_task_type ON generation_history(task_type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_created_at ON generation_history(created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_is_favorite ON generation_history(is_favorite)")
    conn.commit()
    conn.close()
    logger.info(f"SQLite History DB가 초기화되었습니다: {DB_PATH}")

def add_history_entry(
    task_type: str,
    prompt: str,
    negative_prompt: str = "",
    width: int = 1024,
    height: int = 1024,
    seed: int = 42,
    steps: int = 20,
    cfg: float = 7.0,
    model_name: str = "FLUX.1-schnell",
    image_url: str = "",
    thumbnail_url: str = "",
    metadata_dict: Optional[Dict[str, Any]] = None
) -> int:
    """새로운 생성 이력 레코드를 추가하고 생성된 id를 반환합니다."""
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now().isoformat()
    meta_json = json.dumps(metadata_dict or {}, ensure_ascii=False)
    
    cursor.execute("""
        INSERT INTO generation_history (
            task_type, prompt, negative_prompt, width, height, seed, steps, cfg, 
            model_name, image_url, thumbnail_url, is_favorite, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    """, (
        task_type, prompt, negative_prompt, width, height, seed, steps, cfg,
        model_name, image_url, thumbnail_url or image_url, meta_json, now_iso
    ))
    entry_id = cursor.lastrowid
    conn.commit()
    conn.close()
    logger.info(f"생성 이력 저장 완료 [ID: {entry_id}]")
    return entry_id

def get_history_entries(
    limit: int = 50,
    offset: int = 0,
    task_type: Optional[str] = None,
    only_favorites: bool = False,
    search_query: Optional[str] = None
) -> List[Dict[str, Any]]:
    """생성 이력 목록을 검색 및 페이징하여 반환합니다."""
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM generation_history WHERE 1=1"
    params = []
    
    if task_type and task_type != "all":
        query += " AND task_type = ?"
        params.append(task_type)
        
    if only_favorites:
        query += " AND is_favorite = 1"
        
    if search_query:
        query += " AND (prompt LIKE ? OR model_name LIKE ?)"
        wildcard = f"%{search_query}%"
        params.extend([wildcard, wildcard])
        
    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "task_type": r["task_type"],
            "prompt": r["prompt"],
            "negative_prompt": r["negative_prompt"],
            "width": r["width"],
            "height": r["height"],
            "seed": r["seed"],
            "steps": r["steps"],
            "cfg": r["cfg"],
            "model_name": r["model_name"],
            "image_url": r["image_url"],
            "thumbnail_url": r["thumbnail_url"],
            "is_favorite": bool(r["is_favorite"]),
            "metadata": json.loads(r["metadata_json"]) if r["metadata_json"] else {},
            "created_at": r["created_at"]
        })
    conn.close()
    return results

def get_history_entry_by_id(entry_id: int) -> Optional[Dict[str, Any]]:
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM generation_history WHERE id = ?", (entry_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        return None
    return {
        "id": r["id"],
        "task_type": r["task_type"],
        "prompt": r["prompt"],
        "negative_prompt": r["negative_prompt"],
        "width": r["width"],
        "height": r["height"],
        "seed": r["seed"],
        "steps": r["steps"],
        "cfg": r["cfg"],
        "model_name": r["model_name"],
        "image_url": r["image_url"],
        "thumbnail_url": r["thumbnail_url"],
        "is_favorite": bool(r["is_favorite"]),
        "metadata": json.loads(r["metadata_json"]) if r["metadata_json"] else {},
        "created_at": r["created_at"]
    }

def toggle_favorite(entry_id: int) -> bool:
    """즐겨찾기 상태 토글"""
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_favorite FROM generation_history WHERE id = ?", (entry_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    
    new_fav = 0 if row["is_favorite"] else 1
    cursor.execute("UPDATE generation_history SET is_favorite = ? WHERE id = ?", (new_fav, entry_id))
    conn.commit()
    conn.close()
    return bool(new_fav)

def delete_history_entry(entry_id: int) -> bool:
    """이력 삭제 (실제 파일 삭제는 호출부에서 처리 가능)"""
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM generation_history WHERE id = ?", (entry_id,))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected

# 자동 초기화
init_db()
