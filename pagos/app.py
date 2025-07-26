from flask import Flask, request, jsonify
from flask_cors import CORS
import mercadopago
import os
import json

app = Flask(__name__)
CORS(app)

"""
Configuración del SDK de MercadoPago
------------------------------------

Para utilizar el SDK de MercadoPago se necesita un token de acceso válido. En
ambiente de desarrollo puedes utilizar un token de prueba (prefijo "TEST-"),
mientras que en producción deberás colocar un token de producción (prefijo
"APP_USR-").  

Este token se puede obtener desde tu panel de MercadoPago Developers, en la
sección **Credenciales** de la aplicación.  Por seguridad, en lugar de
escribirlo directamente en el código, es recomendable leerlo de una
variable de entorno llamada `MP_ACCESS_TOKEN`.  Si la variable no está
definida, el SDK utilizará el valor por defecto definido a continuación.
"""

# Lee el token de acceso desde la variable de entorno MP_ACCESS_TOKEN. Si no está
# definido, utiliza el token de producción proporcionado por el usuario. Este
# valor comienza con "APP_USR-" y se usará como valor por defecto sólo si no
# existe la variable de entorno.
ACCESS_TOKEN = os.getenv(
    "MP_ACCESS_TOKEN",
    "APP_USR-2170782507035435-072523-516eabfbbb88e5caaa73c1f17f2b821a-79573563",
)

# Inicializa el SDK con el token. Si recibes un error de autenticación
# significa que debes configurar tu token real.
sdk = mercadopago.SDK(ACCESS_TOKEN)

# Base local de pagos (archivo JSON)
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
    """
    Crea una preferencia de pago en Mercado Pago.

    Este endpoint espera un JSON con los campos mínimos necesarios para generar
    una preferencia (título del artículo y precio unitario). Opcionalmente
    también puede recibir URLs de retorno y la URL de notificación.  Si se
    produce un error al comunicarse con la API de Mercado Pago, la excepción
    será capturada y retornaremos un mensaje de error con código 500 para que
    el frontend pueda mostrar una alerta amigable al usuario.

    Además, dependiendo del tipo de credencial (token de prueba o de
    producción), seleccionaremos el `init_point` adecuado. Con credenciales
    de prueba (prefijo ``TEST-``) es obligatorio usar ``sandbox_init_point``,
    mientras que con credenciales productivas usamos ``init_point``.  Este
    comportamiento evita errores típicos en los que se intenta ingresar al
    checkout real con credenciales de sandbox.
    """
    data = request.get_json(force=True) or {}
    # Construir la preferencia con los datos recibidos. Si el cliente no envía
    # alguna URL, aplicamos valores por defecto seguros. Evitamos incluir
    # ``notification_url`` si el cliente no lo pidió explícitamente ya que
    # Mercado Pago rechaza URLs que no sean accesibles desde internet (p. ej.
    # ``localhost`` o ``127.0.0.1``). En entornos de desarrollo es mejor
    # omitirla por completo.
    preference_data = {
        "items": [{
            "title": data.get('title', 'Producto'),
            "quantity": 1,
            # Aseguramos que ``unit_price`` sea un número flotante. Si viene
            # inválido, usamos 0 para evitar lanzar una excepción.
            "unit_price": float(data.get('unit_price', 0) or 0)
        }],
        "back_urls": {
            "success": data.get("back_url_success", "http://localhost:5500/detalle.html?ok=1"),
            "failure": data.get("back_url_failure", "http://localhost:5500/detalle.html?fail=1")
        },
        # Permitir que Mercado Pago redirija automáticamente una vez aprobado
        "auto_return": "approved",
    }
    # Incluimos ``notification_url`` sólo si se proporciona y parece ser una
    # dirección pública. La API de Mercado Pago puede rechazar una URL local.
    notif_url = data.get("webhook_url")
    if notif_url:
        preference_data["notification_url"] = notif_url
    try:
        preference_response = sdk.preference().create(preference_data)
    except Exception as e:
        # Registrar el error en la salida del servidor para depuración
        app.logger.error(f"Error creando preferencia: {e}")
        return jsonify({"error": "No se pudo crear la preferencia de pago."}), 500
    response = preference_response.get('response', {})
    # Determinar el enlace de inicio adecuado según el tipo de token
    if ACCESS_TOKEN.startswith('TEST-'):
        init_point = response.get('sandbox_init_point') or response.get('init_point')
    else:
        init_point = response.get('init_point') or response.get('sandbox_init_point')
    preference_id = response.get('id')
    # Guardar el estado inicial del pago en nuestra base local
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
    return "OK", 200

@app.route('/estado_pago/<pago_id>')
def estado_pago(pago_id):
    pago = get_pago(pago_id)
    if pago:
        return jsonify(pago)
    return jsonify({"status": "not_found"})

if __name__ == "__main__":
    # Al ejecutar desde línea de comandos, permite configurar el host y el puerto
    # mediante variables de entorno. Por defecto, escucha en todas las
    # interfaces (0.0.0.0) y en el puerto 5000 para que pueda ser accedido
    # externamente si el entorno lo permite.
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    app.run(host=host, port=port, debug=True)
