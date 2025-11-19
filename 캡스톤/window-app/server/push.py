import os, logging
from typing import Optional, Dict, List

_firebase_inited = False
def init_firebase():
    global _firebase_inited
    if _firebase_inited: return
    path = os.getenv("FCM_SERVICE_ACCOUNT_JSON")
    if not path or not os.path.exists(path):
        logging.warning("[FCM] service account json not set; push disabled")
        return
    try:
        import firebase_admin
        from firebase_admin import credentials, messaging  # noqa
        cred = credentials.Certificate(path)
        firebase_admin.initialize_app(cred)
        _firebase_inited = True
        logging.info("[FCM] initialized")
    except Exception as e:
        logging.warning(f"[FCM] init failed: {e}")

def send_push(title: str, body: str, tokens: List[str], data: Optional[Dict]=None):
    if not tokens: return
    try:
        import firebase_admin
        from firebase_admin import messaging
    except Exception:
        print("[FCM] not initialized; skip")
        return
    if not firebase_admin._apps:
        print("[FCM] app not initialized; skip")
        return
    msg = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body),
        data={k:str(v) for k,v in (data or {}).items()},
        tokens=tokens
    )
    resp = messaging.send_multicast(msg)
    print(f"[FCM] sent: success={resp.success_count}, fail={resp.failure_count}")
