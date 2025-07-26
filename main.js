// main.js - HP Cars PRO v2 (PayPal real + Scroll modal)

const firebaseConfig = {
  apiKey: "AIzaSyDCJWM_PZjRis_f3p9NzmtMXib45cUTNvg",
  authDomain: "hp-cars.firebaseapp.com",
  projectId: "hp-cars",
  storageBucket: "hp-cars.appspot.com",
  messagingSenderId: "286656208008",
  appId: "1:286656208008:web:f3cee48f7637f16fbe933d"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const URL_PRODUCTOS = "productos.json";

const ICON_MERCADOPAGO = `<img src="mercadopago.png" alt="MercadoPago" style="height:22px;">`;
const ICON_PAYPAL = `<img src="paypal.png" alt="PayPal" style="height:22px;">`;
const ICON_WHATSAPP = `<img src="whatsapp.png" alt="WhatsApp" style="height:22px;">`;

// URL base de la API para MercadoPago. Durante el desarrollo puede ser 'http://localhost:5000'.
// En producción deberás sustituirla por la URL donde tengas desplegado tu backend Flask.
const MP_API_BASE = 'https://web-1-k0os.onrender.com';

// === Funciones de pago integradas ===
// Convierte una cadena de precio ARS con separadores de miles (p.ej. "120000" o "199.000") en número
function parsePrecioARS(str) {
  if (!str) return 0;
  return parseFloat(str.toString().replace(/\./g, '').replace(',', '.')) || 0;
}

// Inicia un pago vía la API de MercadoPago (backend Flask). Recibe nombre del producto y precio en ARS
async function pagarMP(nombre, precio) {
  // Si precio viene como string, convertirlo a número
  const precioNum = typeof precio === 'string' ? parsePrecioARS(precio) : precio;
  try {
    const resp = await fetch(`${MP_API_BASE}/crear_preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: nombre,
        unit_price: precioNum
      })
    });
    const data = await resp.json();
    // Si el servidor devuelve un mensaje de error, mostramos la razón al usuario
    if (data.error) {
      console.error('Error al crear preferencia MP:', data.error);
      alert('No se pudo iniciar el pago con Mercado Pago: ' + data.error);
      return;
    }
    // Redirecciona al init_point de MercadoPago
    if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      alert('No se pudo iniciar el pago con Mercado Pago (init_point vacío)');
    }
  } catch (error) {
    console.error('Error iniciando pago MP', error);
    alert('Ocurrió un error al contactar el servicio de Mercado Pago. Revisa tu conexión o intenta de nuevo.');
  }
}

// ========= CARRUSEL DE DESTACADOS ==============
let productos = [];
let destacados = [];
let carruselIndex = 0;

async function cargarProductos() {
  try {
    const res = await fetch(URL_PRODUCTOS + "?v=" + Date.now());
    productos = await res.json();
  } catch (e) {
    document.getElementById('catalogo-productos').innerHTML = '<p style="color:#ffbe4b;font-size:1.14rem">No se pudieron cargar los productos.</p>';
    return;
  }

  mostrarCatalogo();
  destacados = productos.filter(p => p.destacado);
  if (destacados.length) {
    carruselIndex = 0;
    mostrarCarruselDestacados();
  } else {
    document.getElementById('carrusel-items').innerHTML = '<div style="color:#ffe4b0;font-size:1.07rem;padding:24px;">No hay productos destacados aún.</div>';
  }
}

function mostrarCatalogo() {
  const cont = document.getElementById('catalogo-productos');
  cont.innerHTML = '';
  if (!productos.length) {
    cont.innerHTML = '<p style="color:#ffbe4b;font-size:1.14rem">No hay productos publicados aún.</p>';
    return;
  }
  productos.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'card-producto';
    card.setAttribute('tabindex', '0');

    // Imagen
    let imagenes = p.imagen;
    if (typeof imagenes === "string") imagenes = [imagenes];
    const img = document.createElement('img');
    img.src = imagenes[0] || 'logo.png';
    img.alt = p.nombre || 'Producto';
    card.appendChild(img);

    // Nombre
    const nombre = document.createElement('div');
    nombre.className = 'nombre';
    nombre.textContent = p.nombre || 'Producto sin nombre';
    card.appendChild(nombre);

    // Precio
    const precio = document.createElement('div');
    precio.className = 'precio';
    precio.textContent = p.precio ? `$${p.precio}` : 'Consultar';
    card.appendChild(precio);

    // Botón comprar
    const btn = document.createElement('button');
    btn.className = 'btn-comprar';
    btn.textContent = 'Ver más / Comprar';
    btn.onclick = (ev) => { ev.stopPropagation(); mostrarFichaProducto(p); };
    card.appendChild(btn);

    // Reputación ficticia
    const repu = document.createElement('div');
    repu.className = 'reputacion';
    repu.innerHTML = '★ 4.9 | 25 ventas';
    card.appendChild(repu);

    card.onclick = (ev) => {
      if (ev.target === btn) return;
      mostrarFichaProducto(p);
    };
    cont.appendChild(card);
  });
}

// ==== CARRUSEL =======
function mostrarCarruselDestacados() {
  const items = document.getElementById('carrusel-items');
  items.innerHTML = '';
  if (!destacados.length) return;
  let idx = carruselIndex;
  const p = destacados[idx];
  const card = document.createElement('div');
  card.className = 'carrusel-card activa';

  // Imagen
  let imagenes = p.imagen;
  if (typeof imagenes === "string") imagenes = [imagenes];
  const img = document.createElement('img');
  img.src = imagenes[0] || 'logo.png';
  img.alt = p.nombre || 'Producto';
  card.appendChild(img);

  // Nombre
  const nombre = document.createElement('div');
  nombre.className = 'nombre';
  nombre.textContent = p.nombre || 'Producto sin nombre';
  card.appendChild(nombre);

  // Precio
  const precio = document.createElement('div');
  precio.className = 'precio';
  precio.textContent = p.precio ? `$${p.precio}` : 'Consultar';
  card.appendChild(precio);

  // Descripción
  if (p.descripcion) {
    const desc = document.createElement('div');
    desc.className = 'descripcion';
    desc.textContent = p.descripcion;
    card.appendChild(desc);
  }

  // Botón ver más/comprar
  const btn = document.createElement('button');
  btn.className = 'btn-vermas';
  btn.textContent = 'Ver más / Comprar';
  btn.onclick = (ev) => { ev.stopPropagation(); mostrarFichaProducto(p); };
  card.appendChild(btn);

  items.appendChild(card);
}
document.getElementById('prev-destacado').onclick = function() {
  if (!destacados.length) return;
  carruselIndex = (carruselIndex - 1 + destacados.length) % destacados.length;
  mostrarCarruselDestacados();
};
document.getElementById('next-destacado').onclick = function() {
  if (!destacados.length) return;
  carruselIndex = (carruselIndex + 1) % destacados.length;
  mostrarCarruselDestacados();
};

// ======= MODAL FICHA PRODUCTO ==========
function mostrarFichaProducto(p) {
  const modal = document.getElementById('modal-producto');
  const ficha = document.getElementById('ficha-producto');
  ficha.innerHTML = '';

  // Imagen (carrusel si hay varias)
  let imagenes = p.imagen;
  if (typeof imagenes === "string") imagenes = [imagenes];
  const img = document.createElement('img');
  img.className = 'ficha-producto-imagen';
  img.src = imagenes[0] || 'logo.png';
  img.style.cursor = "pointer";
  img.title = "Maximizar";
  img.onclick = function() {
    abrirGaleriaImagenes(imagenes, 0);
  };
  ficha.appendChild(img);

  // Nombre
  const nombre = document.createElement('div');
  nombre.className = 'ficha-nombre';
  nombre.textContent = p.nombre || 'Producto sin nombre';
  ficha.appendChild(nombre);

  // Precio
  const precio = document.createElement('div');
  precio.className = 'ficha-precio';
  precio.textContent = p.precio ? `$${p.precio}` : 'Consultar';
  ficha.appendChild(precio);

  // Descripción
  if (p.descripcion) {
    const desc = document.createElement('div');
    desc.className = 'ficha-descripcion';
    desc.textContent = p.descripcion;
    ficha.appendChild(desc);
  }

  // Video (YouTube button)
  if (p.video) {
    const ytBtn = document.createElement('a');
    ytBtn.href = p.video;
    ytBtn.target = "_blank";
    ytBtn.rel = "noopener";
    ytBtn.textContent = "Ver en YouTube";
    ytBtn.style.display = "inline-block";
    ytBtn.style.background = "#ff2222";
    ytBtn.style.color = "#fff";
    ytBtn.style.fontWeight = "700";
    ytBtn.style.borderRadius = "12px";
    ytBtn.style.padding = "9px 25px";
    ytBtn.style.margin = "15px 0 12px 0";
    ytBtn.style.textDecoration = "none";
    ytBtn.style.fontSize = "1.06rem";
    ytBtn.style.boxShadow = "0 1px 6px #96000033";
    ytBtn.style.transition = "background 0.17s";
    ytBtn.onmouseover = function(){ ytBtn.style.background="#c40e0e"; };
    ytBtn.onmouseout = function(){ ytBtn.style.background="#ff2222"; };
    ficha.appendChild(ytBtn);
  }

  // Reputación y opiniones
  const repu = document.createElement('div');
  repu.className = 'ficha-reputacion';
  repu.innerHTML = '★ ★ ★ ★ ★ <span style="color:#ffe4b0;">Calificado por clientes reales</span>';
  ficha.appendChild(repu);

  // Botones de pago (se muestra tras ingresar email)
  const pagos = document.createElement('div');
  pagos.className = 'ficha-pagos';

  pagos.innerHTML = `<button class="btn-comprar" onclick="iniciarCompra('${encodeURIComponent(JSON.stringify(p))}')">Comprar ahora</button>`;
  ficha.appendChild(pagos);

  // Botón volver a inicio (cierra modal)
  const volver = document.createElement('button');
  volver.className = 'ficha-volver-inicio';
  volver.textContent = 'Volver al inicio';
  volver.onclick = function() {
    modal.classList.remove('abierto');
  };
  ficha.appendChild(volver);

  modal.classList.add('abierto');
}

// =======================
// GALERÍA DE IMÁGENES
// =======================
function abrirGaleriaImagenes(imagenes, indexInicial = 0) {
  if (!imagenes || !imagenes.length) return;
  if (typeof imagenes === 'string') imagenes = [imagenes];

  let idx = indexInicial;

  const galeria = document.createElement('div');
  galeria.id = "modal-galeria-img";
  galeria.style.position = "fixed";
  galeria.style.left = 0;
  galeria.style.top = 0;
  galeria.style.width = "100vw";
  galeria.style.height = "100vh";
  galeria.style.background = "rgba(24,24,42,0.98)";
  galeria.style.zIndex = 1100;
  galeria.style.display = "flex";
  galeria.style.alignItems = "center";
  galeria.style.justifyContent = "center";
  galeria.style.flexDirection = "column";

  const img = document.createElement('img');
  img.src = imagenes[idx];
  img.style.maxWidth = "90vw";
  img.style.maxHeight = "82vh";
  img.style.borderRadius = "2.1rem";
  img.style.boxShadow = "0 10px 60px #000a";
  img.style.margin = "8px 0";
  galeria.appendChild(img);

  if (imagenes.length > 1) {
    const prev = document.createElement('button');
    prev.innerHTML = "&#8592;";
    prev.style.position = "absolute";
    prev.style.left = "3vw";
    prev.style.top = "50%";
    prev.style.transform = "translateY(-50%)";
    prev.style.fontSize = "2.5rem";
    prev.style.background = "#18182ac9";
    prev.style.color = "#ffdc7c";
    prev.style.border = "none";
    prev.style.borderRadius = "50%";
    prev.style.cursor = "pointer";
    prev.style.width = "58px";
    prev.style.height = "58px";
    prev.style.boxShadow = "0 1px 8px #0006";
    prev.onclick = function(e){
      e.stopPropagation();
      idx = (idx - 1 + imagenes.length) % imagenes.length;
      img.src = imagenes[idx];
    };
    galeria.appendChild(prev);

    const next = document.createElement('button');
    next.innerHTML = "&#8594;";
    next.style.position = "absolute";
    next.style.right = "3vw";
    next.style.top = "50%";
    next.style.transform = "translateY(-50%)";
    next.style.fontSize = "2.5rem";
    next.style.background = "#18182ac9";
    next.style.color = "#ffdc7c";
    next.style.border = "none";
    next.style.borderRadius = "50%";
    next.style.cursor = "pointer";
    next.style.width = "58px";
    next.style.height = "58px";
    next.style.boxShadow = "0 1px 8px #0006";
    next.onclick = function(e){
      e.stopPropagation();
      idx = (idx + 1) % imagenes.length;
      img.src = imagenes[idx];
    };
    galeria.appendChild(next);
  }

  const cerrar = document.createElement('button');
  cerrar.innerHTML = "&times;";
  cerrar.style.position = "absolute";
  cerrar.style.top = "3vh";
  cerrar.style.right = "3vw";
  cerrar.style.fontSize = "2.3rem";
  cerrar.style.background = "#232342f2";
  cerrar.style.color = "#ffdc7c";
  cerrar.style.border = "none";
  cerrar.style.borderRadius = "50%";
  cerrar.style.cursor = "pointer";
  cerrar.style.width = "54px";
  cerrar.style.height = "54px";
  cerrar.style.boxShadow = "0 1px 8px #0006";
  cerrar.onclick = function(e){
    e.stopPropagation();
    galeria.remove();
  };
  galeria.appendChild(cerrar);

  galeria.onclick = function(e){
    if (e.target === galeria) galeria.remove();
  };

  document.body.appendChild(galeria);
}

// Cerrar modal de ficha producto
document.getElementById('cerrar-modal').onclick = function() {
  document.getElementById('modal-producto').classList.remove('abierto');
};
document.getElementById('modal-producto').onclick = function(ev) {
  if (ev.target === this) this.classList.remove('abierto');
};

// ========= MODAL DE COMPRA =========
let productoSeleccionado = null;

window.iniciarCompra = function(pstr) {
  productoSeleccionado = JSON.parse(decodeURIComponent(pstr));
  document.getElementById('modal-producto').classList.remove('abierto');
  document.getElementById('modal-compra').classList.add('abierto');
  document.getElementById('correo-cliente').value = "";
  document.getElementById('correo-cliente').focus();
};

document.getElementById('cerrar-compra').onclick = function() {
  document.getElementById('modal-compra').classList.remove('abierto');
};
document.getElementById('modal-compra').onclick = function(ev) {
  if (ev.target === this) this.classList.remove('abierto');
};

// ========== GUARDAR SOLICITUD EN FIRESTORE ==========
function guardarSolicitudEnFirestore(correo, producto) {
  try {
    db.collection("solicitudes").add({
      email: correo,
      fecha: Date.now(),
      producto: producto.nombre || '',
      precio: producto.precio || ''
      // Los datos de enlaces de pago personalizados (mercadopago, paypal, whatsapp) se eliminan en esta versión
    });
  } catch(e) {}
}

// Formulario correo
document.getElementById('form-correo').onsubmit = function(e) {
  e.preventDefault();
  const correo = document.getElementById('correo-cliente').value.trim();
  if (!correo || !correo.includes("@")) {
    alert("Por favor, ingrese un correo válido.");
    return false;
  }
  mostrarLinksPago(correo, productoSeleccionado);
  guardarSolicitudEnFirestore(correo, productoSeleccionado);
  document.getElementById('modal-compra').classList.remove('abierto');
  return false;
};

// ====== MODAL LINKS DE PAGO MEJORADO (SMART BUTTON + SCROLL) =======
function mostrarLinksPago(correo, producto) {
  const tasa_ars_usd = 1000;
  const precioUSD = (parseFloat(producto.precio) / tasa_ars_usd).toFixed(2);

  let html = `
  <div style="background:#21213d;max-height:95vh;overflow-y:auto;padding:28px 22px 17px 22px;border-radius:2rem;box-shadow:0 3px 22px #ffbe4b44;max-width:330px;margin:30px auto;text-align:center;">
    <h3 style="color:#ffdc7c;font-size:1.21rem;margin-bottom:12px;">Finalizar compra</h3>
    <div style="color:#ffe4b0;margin-bottom:10px;font-size:1.09rem;">
      ¡Gracias!<br>
      Le enviaremos el comprobante y la descarga a: <b>${correo}</b>
    </div>
    <div style="margin:18px 0 13px 0;">
      <!-- Botón oficial de MercadoPago: inicia el flujo de pago mediante la API del servidor -->
      <button id="btn-pagar-mp" style="display:inline-flex;align-items:center;gap:6px;background:#ffdc7c;color:#232342;text-decoration:none;font-weight:700;border-radius:10px;padding:9px 18px;font-size:1.06rem;box-shadow:0 1px 6px #ffbe4b33;margin:4px 0;border:none;cursor:pointer;">${ICON_MERCADOPAGO} Pagar con MercadoPago</button><br>
      <!-- Botón PayPal Smart Button -->
      <div id="paypal-button-container" style="margin:12px 0;"></div>
    </div>
    <div style="margin-top:15px;color:#ffdc7c;font-size:1rem;">Pagos 100% protegidos.<br>Soporte real al instante.</div>
    <div style="margin-top:9px;"><a href="mailto:angelgastoncalvo@gmail.com" style="color:#ffdc7c;text-decoration:underline;font-size:0.97rem;">¿Duda? Escríbanos</a></div>
    <button onclick="document.getElementById('links-pago-modal').remove();" style="margin-top:17px;background:#232342;color:#ffdc7c;border-radius:12px;padding:8px 22px;font-size:1rem;font-weight:600;border:none;cursor:pointer;">Cerrar</button>
  </div>
  `;
  const modalPago = document.createElement('div');
  modalPago.id = 'links-pago-modal';
  modalPago.style.position = "fixed";
  modalPago.style.left = "0";
  modalPago.style.top = "0";
  modalPago.style.width = "100vw";
  modalPago.style.height = "100vh";
  modalPago.style.background = "rgba(24,20,34,0.80)";
  modalPago.style.zIndex = 999;
  modalPago.style.display = "flex";
  modalPago.style.alignItems = "center";
  modalPago.style.justifyContent = "center";
  modalPago.style.overflowY = "auto"; // <-- clave para el scroll exterior
  modalPago.innerHTML = html;
  document.body.appendChild(modalPago);

  // Asignar evento al botón de MercadoPago. Cuando se haga clic,
  // llamará a la función que crea una preferencia mediante la API y
  // redireccionará al usuario.
  const btnMP = document.getElementById('btn-pagar-mp');
  if (btnMP) {
    btnMP.onclick = function() {
      pagarMP(producto.nombre, producto.precio);
    };
  }

  // ==== INTEGRAR PAYPAL SMART BUTTON REAL ====
  setTimeout(() => {
    let oldScript = document.getElementById('paypal-sdk');
    if (oldScript) oldScript.remove();
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = "https://www.paypal.com/sdk/js?client-id=AV_PNokFR83SDYonm1HWsblWdo1EkkMrdUt-_lb-f7f5k-unX8TjK7red9NDLs6uV7h902aJ6zaRZw0I&currency=USD";
    script.onload = function() {
      paypal.Buttons({
        createOrder: function(data, actions) {
          return actions.order.create({
            purchase_units: [{
              amount: { value: precioUSD },
              description: producto.nombre
            }]
          });
        },
        onApprove: function(data, actions) {
          alert("¡Pago PayPal realizado y aprobado!\nTe contactaremos por correo y WhatsApp.");
        }
      }).render('#paypal-button-container');
    };
    document.head.appendChild(script);
  }, 150);
}

// ==== Banner público editable desde admin
function cargarBanner() {
  try {
    const bannerData = localStorage.getItem("bannerPublico");
    if (bannerData) {
      document.getElementById("banner-publico").innerHTML = bannerData;
    }
  } catch {}
}

// Navegación activa
document.querySelectorAll('.nav-link').forEach(link => {
  link.onclick = function() {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    this.classList.add('active');
  };
});

// INICIALIZAR
window.onload = function() {
  cargarBanner();
  cargarProductos();
};
