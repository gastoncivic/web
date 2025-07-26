// === Parámetros integración ===
// Tasa fija ARS a USD (ajustá manual o traé de una API si querés)
const tasa_ars_usd = 1000; // $1000 ARS = $1 USD (ajustá según cotización)

// Convierte una cadena de precio en ARS (p.ej. "199.000" o "12.500,50") a número
// Elimina puntos como separadores de miles y reemplaza la coma por punto decimal.
function parsePrecioARS(precioStr) {
  if (!precioStr) return 0;
  return parseFloat(precioStr.replace(/\./g, '').replace(',', '.')) || 0;
}

// --- MercadoPago ---
async function pagarMP(nombre, precio) {
  const resp = await fetch('http://localhost:5000/crear_preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: nombre,
      // unit_price debe ser un número en ARS; si recibimos un string con
      // separadores de miles (p.ej. "199.000"), lo convertimos con parsePrecioARS.
      unit_price: typeof precio === 'string' ? parsePrecioARS(precio) : precio,
      back_url_success: window.location.origin + window.location.pathname + window.location.search + "&pago=ok",
      back_url_failure: window.location.origin + window.location.pathname + window.location.search + "&pago=fail",
      // No incluimos webhook_url de forma predeterminada para evitar errores con URLs locales
    })
  });
  const data = await resp.json();
  if (data.error) {
    console.error('Error al crear preferencia MP:', data.error);
    alert('No se pudo iniciar el pago con Mercado Pago: ' + data.error);
    return;
  }
  // Guardamos el ID del pago para poder consultar su estado más tarde
  if (data.pago_id) localStorage.setItem("ultimo_pago_id", data.pago_id);
  if (data.init_point) {
    window.location.href = data.init_point;
  } else {
    alert('No se pudo iniciar el pago con Mercado Pago (init_point vacío)');
  }
}

async function chequearPagoAcreditado() {
  const pago_id = localStorage.getItem("ultimo_pago_id");
  if (!pago_id) return;
  const resp = await fetch(`http://localhost:5000/estado_pago/${pago_id}`);
  const data = await resp.json();
  if (data.status === "approved") {
    mostrarWhatsapp();
  }
}

function mostrarWhatsapp() {
  document.getElementById("accesoWhatsapp").style.display = "inline-block";
}

// --- PayPal Smart Button (REAL) ---
function integrarPayPal(precioARS, descripcion) {
  // Calcular USD
  // Si el precio viene como string (ej. "199.000") lo convertimos primero
  const precioNumeroARS = typeof precioARS === 'string' ? parsePrecioARS(precioARS) : precioARS;
  const precioUSD = (precioNumeroARS / tasa_ars_usd).toFixed(2);
  // Mostrar el precio convertido
  const precioUSDLabel = document.getElementById("precioUSD");
  if (precioUSDLabel) {
    precioUSDLabel.innerText = `(equiv. USD $${precioUSD})`;
  }
  // Eliminar script previo para evitar recargas dobles
  const oldScript = document.getElementById('paypal-sdk');
  if (oldScript) oldScript.remove();

  // Crear script PayPal (USA TU CLIENT ID LIVE AQUÍ)
  const script = document.createElement('script');
  script.id = 'paypal-sdk';
  script.src = "https://www.paypal.com/sdk/js?client-id=**AQUI_TU_CLIENT_ID_LIVE**&currency=USD";
  script.onload = function() {
    paypal.Buttons({
      createOrder: function(data, actions) {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: precioUSD
            },
            description: descripcion
          }]
        });
      },
      onApprove: function(data, actions) {
        mostrarWhatsapp();
        alert('¡Pago PayPal realizado y aprobado!');
      }
    }).render('#paypal-button-container');
  };
  document.head.appendChild(script);
}

// --- Eventos de la página ---
window.addEventListener('DOMContentLoaded', function () {
  // Oculta WhatsApp hasta que pague
  let whatsappBtn = document.getElementById("accesoWhatsapp");
  if (whatsappBtn) whatsappBtn.style.display = "none";
  // Si vuelve de pago MP, chequea estado
  if (window.location.search.includes("pago=ok")) {
    chequearPagoAcreditado();
  }
  // MercadoPago
  let mpBtn = document.getElementById("btnPagarMP");
  if (mpBtn) {
    mpBtn.addEventListener("click", function () {
      let nombre = document.getElementById("nombreProducto").innerText;
      // Recuperar el precio tal cual aparece en el HTML (p.ej. "199.000")
      let precio = document.getElementById("precioProducto").innerText;
      pagarMP(nombre, precio);
    });
  }
  // PayPal: cargar botón y precio convertido dinámico
  let nombre = document.getElementById("nombreProducto").innerText;
  // Recuperar el precio del DOM; puede tener separadores de miles
  let precioARS = document.getElementById("precioProducto").innerText;
  integrarPayPal(precioARS, nombre);
});

// -- El resto de tu lógica original (preguntas, reputación, etc) --
