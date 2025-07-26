from flask import Flask, request, jsonify
from flask_cors import CORS
import mercadopago
import os
import json

app = Flask(__name__)
CORS(app)

app.logger.info("=== INICIO APP.PY ACTUALIZADO ===")

ACCESS_TOKEN = os.getenv(
    "MP_ACCESS_TOKEN",
    "APP_USR-2170782507035435-072523-516eabfbbb88e5caaa73c1f17f2b821a-79573563",
)

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
    data = request.get_json(force=True) or {}
    preference_data = {
        "items": [{
            "title": data.get('title', 'Producto'),
            "quantity": int(data.get('quantity', 1)),
            "unit_price": float(data.get('price', 0) or 0)
        }],
        "back_urls": {
            "success": data.get("back_url_success", "http://localhost:5500/detalle.html?ok=1"),
            "failure": data.get("back_url_failure", "http://localhost:5500/detalle.html?fail=1")
        },
        "auto_return": "approved",
    }
    notif_url = data.get("webhook_url")
    if notif_url:
        preference_data["notification_url"] = notif_url
    try:
        preference_response = sdk.preference().create(preference_data)
        app.logger.info("=== RESPUESTA MP RAW === %s", preference_response)
        app.logger.info("=== MP SUBRESPONSE === %s", preference_response.get('response'))
        if preference_response.get('status') != 201:
            app.logger.error("=== ERROR MP BODY === %s", preference_response.get('body'))
    except Exception as e:
        app.logger.error(f"Error creando preferencia: {e}")
        return jsonify({"error": "No se pudo crear la preferencia de pago."}), 500
    response = preference_response.get('response', {})
    if ACCESS_TOKEN.startswith('TEST-'):
        init_point = response.get('sandbox_init_point') or response.get('init_point')
    else:
        init_point = response.get('init_point') or response.get('sandbox_init_point')
    preference_id = response.get('id')
    if preference_id:
        save_pago(preference_id, {"status": "pending", "metodo": "mp"})
    return jsonify({"init_point": init_point, "pago_id": preference_id})

@app.route('/webhook_mp', methods=['POST'])
def webhook_mp():
    data = request.json
    if "data" in data and "id" in data["data"]:
        payment_id = data["data"]["id"]
        payment = sdk.payment().get(payment_id)
        status = payment["response"]["status"]
        order = payment["response"].get("order", {})
        preference_id = order.get("id")
        if preference_id and status == "approved":
            save_pago(preference_id, {"status": "approved", "metodo": "mp"})
        with open("pagos_aprobados.txt", "a") as f:
            json.dump(payment, f)
            f.write("\n")
    return "OK", 200

@app.route('/estado_pago/<pago_id>')
def estado_pago(pago_id):
    pago = get_pago(pago_id)
    if pago:
        return jsonify(pago)
    return jsonify({"status": "not_found"})

@app.route('/')
def home():
    return 'API OK', 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    app.run(host=host, port=port, debug=True)
