from flask import Flask, request, jsonify
from flask_cors import CORS
import mercadopago
import os
import json
import datetime
import traceback

app = Flask(__name__)
CORS(app)

DEBUG_FILE = "debug_mp.log"

def log_debug(info):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{now}] {info}\n"
    print(line)
    with open(DEBUG_FILE, "a", encoding="utf8") as f:
        f.write(line)

# Token de Mercado Pago (producción)
ACCESS_TOKEN = os.getenv(
    "MP_ACCESS_TOKEN",
    "APP_USR-2170782507035435-072523-516eabfbbb88e5caaa73c1f17f2b821a-79573563"
)
log_debug(f"=== INICIO APP.PY (token ending: ...{ACCESS_TOKEN[-8:]}) ===")

sdk = mercadopago.SDK(ACCESS_TOKEN)

PAGOS_FILE = "pagos.json"
if not os.path.exists(PAGOS_FILE):
    with open(PAGOS_FILE, "w") as f:
        json.dump({}, f)

def save_pago(pago_id, datos):
    with open(PAGOS_FILE, "r") as f:
        pagos = json.load(f)
    pagos[pago_id] = datos
    with open(PAGOS_FILE, "w") as f:
        json.dump(pagos, f)

def get_pago(pago_id):
    with open(PAGOS_FILE, "r") as f:
        pagos = json.load(f)
    return pagos.get(pago_id, None)

@app.route('/crear_preference', methods=['POST'])
def crear_preference():
    try:
        data = request.get_json(force=True) or {}
        log_debug(f"==> /crear_preference | DATA RECIBIDA: {data}")

        # Permite ambos formatos: directo o items
        if "items" in data:
            items = data["items"]
        else:
            title = data.get('title') or 'Producto'
            quantity = int(data.get('quantity', 1))
            price = float(data.get('price', 0) or 0)
            currency_id = data.get("currency_id", "ARS")
            items = [{
                "title": title,
                "quantity": quantity,
                "currency_id": currency_id,
                "unit_price": price
            }]
        # Validación
        if not items or float(items[0].get("unit_price", 0)) <= 0:
            log_debug("==> /crear_preference | ERROR: Precio menor o igual a 0")
            return jsonify({"error": "El precio debe ser mayor a cero."}), 400

        preference_data = {
            "items": items,
            "back_urls": {
                "success": data.get("back_url_success", "http://localhost:5500/detalle.html?ok=1"),
                "failure": data.get("back_url_failure", "http://localhost:5500/detalle.html?fail=1")
            },
            "auto_return": "approved",
        }
        notif_url = data.get("webhook_url")
        if notif_url:
            preference_data["notification_url"] = notif_url

        log_debug(f"==> /crear_preference | DATA A MP: {preference_data}")
        preference_response = sdk.preference().create(preference_data)
        log_debug(f"==> /crear_preference | RESPUESTA MP RAW: {preference_response}")

        if preference_response.get('status') != 201:
            log_debug(f"==> /crear_preference | ERROR MP STATUS: {preference_response.get('status')}")
            log_debug(f"==> /crear_preference | ERROR MP BODY: {preference_response.get('body')}")
            return jsonify({
                "error": "MP status error",
                "mp_status": preference_response.get('status'),
                "mp_body": preference_response.get('body')
            }), 500

        response = preference_response.get('response', {})
        if not response:
            log_debug("==> /crear_preference | ERROR: RESPONSE VACIO")
        if ACCESS_TOKEN.startswith('TEST-'):
            init_point = response.get('sandbox_init_point') or response.get('init_point')
        else:
            init_point = response.get('init_point') or response.get('sandbox_init_point')
        preference_id = response.get('id')
        if preference_id:
            save_pago(preference_id, {"status": "pending", "metodo": "mp"})
        log_debug(f"==> /crear_preference | FINAL: {init_point=}, {preference_id=}")
        return jsonify({"init_point": init_point, "pago_id": preference_id})
    except Exception as e:
        tb = traceback.format_exc()
        log_debug(f"==> /crear_preference | EXCEPTION: {e}\n{tb}")
        return jsonify({"error": "Error interno en el servidor."}), 500

@app.route('/webhook_mp', methods=['POST'])
def webhook_mp():
    try:
        data = request.json
        log_debug(f"==> /webhook_mp | DATA: {data}")
        if "data" in data and "id" in data["data"]:
            payment_id = data["data"]["id"]
            payment = sdk.payment().get(payment_id)
            log_debug(f"==> /webhook_mp | PAYMENT MP: {payment}")
            status = payment["response"]["status"]
            order = payment["response"].get("order", {})
            preference_id = order.get("id")
            if preference_id and status == "approved":
                save_pago(preference_id, {"status": "approved", "metodo": "mp"})
            with open("pagos_aprobados.txt", "a") as f:
                json.dump(payment, f)
                f.write("\n")
        return "OK", 200
    except Exception as e:
        tb = traceback.format_exc()
        log_debug(f"==> /webhook_mp | EXCEPTION: {e}\n{tb}")
        return "ERROR", 500

@app.route('/estado_pago/<pago_id>')
def estado_pago(pago_id):
    pago = get_pago(pago_id)
    log_debug(f"==> /estado_pago | {pago_id=} | {pago=}")
    if pago:
        return jsonify(pago)
    return jsonify({"status": "not_found"})

@app.route('/')
def home():
    log_debug("==> / | API OK")
    return 'API OK', 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    app.run(host=host, port=port, debug=True)
