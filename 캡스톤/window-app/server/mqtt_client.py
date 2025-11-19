import os, json, threading, logging
from typing import Callable, List
from paho.mqtt import client as mqtt

MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))

TOPIC_CMD   = "window/cmd"
TOPIC_STATE = "window/state"
TOPIC_RAIN  = "sensors/rain"

class WindowMqtt:
    def __init__(self):
        # v3.1.1로 고정해 콜백 혼동 방지
        self.client = mqtt.Client(protocol=mqtt.MQTTv311)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.last_state: dict = {"pos": "unknown"}
        self.listeners: List[Callable[[str, dict], None]] = []

    def start(self):
        try:
            self.client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, keepalive=30)
        except Exception as exc:
            logging.error("MQTT 연결 실패: %s", exc)
            return
        t = threading.Thread(target=self.client.loop_forever, daemon=True)
        t.start()

    def add_listener(self, fn: Callable[[str, dict], None]):
        self.listeners.append(fn)

    def publish_cmd(self, action: str):
        payload = json.dumps({"action": action})
        self.client.publish(TOPIC_CMD, payload, qos=1)

    # ---- callbacks ----
    def _on_connect(self, client, userdata, flags, rc, *args):
        client.subscribe([(TOPIC_STATE, 1), (TOPIC_RAIN, 1)])

    def _on_message(self, client, userdata, msg):
        try:
            data = json.loads(msg.payload.decode("utf-8") or "{}")
        except Exception:
            data = {}
        if msg.topic == TOPIC_STATE and isinstance(data, dict):
            self.last_state = data or {"pos": "unknown"}
        for fn in self.listeners:
            try: fn(msg.topic, data)
            except Exception as e: print("[MQTT listener error]", e)

mqtt = WindowMqtt()
