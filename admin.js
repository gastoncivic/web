// admin.js - HP Cars Admin PRO

function mostrarLinksPago(correo, producto) {
  // Tasa de conversión ARS a USD (ajustá manualmente según cotización)
  const tasa_ars_usd = 1000;
  const precioUSD = (parseFloat(producto.precio) / tasa_ars_usd).toFixed(2);

  // Modal completo con botón MercadoPago y botón PayPal real
  let html = `
    <div style="background:#21213d;padding:28px 22px 17px 22px;border-radius:2rem;box-shadow:0 3px 22px #ffbe4b44;max-width:330px;margin:30px auto;text-align:center;">
      <h3 style="color:#ffdc7c;font-size:1.21rem;margin-bottom:12px;">Finalizar compra</h3>
      <div style="color:#ffe4b0;margin-bottom:10px;font-size:1.09rem;">
        ¡Gracias!<br>
        Le enviaremos el comprobante y la descarga a: <b>${correo}</b>
      </div>
      <div style="margin:18px 0 13px 0;">
        ${producto.mercadopago ? `<a href="${producto.mercadopago}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#ffdc7c;color:#232342;text-decoration:none;font-weight:700;border-radius:10px;padding:9px 18px;font-size:1.06rem;box-shadow:0 1px 6px #ffbe4b33;margin:4px 0;">${typeof ICON_MERCADOPAGO!=="undefined"?ICON_MERCADOPAGO:""} Pagar con MercadoPago</a><br>` : ''}
        <div id="paypal-button-container" style="margin:12px 0;"></div>
        ${producto.whatsapp ? `<a href="${producto.whatsapp}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#25d366;color:#fff;text-decoration:none;font-weight:700;border-radius:10px;padding:9px 18px;font-size:1.06rem;box-shadow:0 1px 6px #25d36633;margin:4px 0;">${typeof ICON_WHATSAPP!=="undefined"?ICON_WHATSAPP:""} Consultar por WhatsApp</a>` : ''}
      </div>
      <div style="margin-top:15px;color:#ffdc7c;font-size:1rem;">Pagos 100% protegidos.<br>Soporte real al instante.</div>
      <div style="margin-top:9px;"><a href="mailto:angelgastoncalvo@gmail.com" style="color:#ffdc7c;text-decoration:underline;font-size:0.97rem;">¿Duda? Escríbanos</a></div>
      <button onclick="document.getElementById('links-pago-modal').remove();" style="margin-top:17px;background:#ffbe4b;border:none;color:#232342;font-size:1rem;padding:8px 24px;border-radius:11px;cursor:pointer;">Cerrar</button>
    </div>
  `;

  // Crear modal
  let modal = document.createElement('div');
  modal.id = "links-pago-modal";
  modal.style.position = "fixed";
  modal.style.zIndex = 400;
  modal.style.left = 0; modal.style.top = 0;
  modal.style.width = "100vw"; modal.style.height = "100vh";
  modal.style.background = "rgba(32,32,60,0.92)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.innerHTML = html;

  // Agrega el modal
  document.body.appendChild(modal);

  // Inyecta el script PayPal Smart Button cuando el modal está creado
  setTimeout(() => {
    // Remueve script anterior si existe
    let oldScript = document.getElementById('paypal-sdk');
    if (oldScript) oldScript.remove();

    // Crea el script PayPal (TU CLIENT ID REAL AQUÍ)
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
          // Acá podés activar descarga, contacto o lo que prefieras
        }
      }).render('#paypal-button-container');
    };
    document.head.appendChild(script);
  }, 150);
}


const EMAIL_AUTORIZADO = "angelgastoncalvo@gmail.com";
const firebaseConfig = {
  apiKey: "AIzaSyDCJWM_PZjRis_f3p9NzmtMXib45cUTNvg",
  authDomain: "hp-cars.firebaseapp.com",
  projectId: "hp-cars",
  storageBucket: "hp-cars.appspot.com",
  messagingSenderId: "286656208008",
  appId: "1:286656208008:web:f3cee48f7637f16fbe933d"
};
firebase.initializeApp(firebaseConfig);

// Referencia al storage de Firebase para subir imágenes. Con esto podremos
// cargar fotos directamente desde el panel de administración y obtener
// sus URLs públicas.
const storage = firebase.storage();

let productos = [];
const BANNER_KEY = "bannerPublico";
let editando = null;

// ====== Carga de imágenes a Firebase Storage ======
// Esta función recibe una colección de archivos (FileList) provenientes
// del input de tipo file y los sube a una carpeta "productos" en el
// bucket de Firebase. Devuelve un array con las URLs de descarga
// pública de cada imagen subida. Si no hay archivos, devuelve un
// array vacío. Se genera un nombre único utilizando la fecha y el
// nombre original del archivo para evitar colisiones.
async function subirImagenes(files) {
  const urls = [];
  if (!files || files.length === 0) return urls;
  for (const file of files) {
    try {
      const ref = storage.ref().child(`productos/${Date.now()}_${file.name}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      urls.push(url);
    } catch (error) {
      console.error('Error al subir imagen', file.name, error);
    }
  }
  return urls;
}

const loginBox = document.getElementById("login-box");
const adminBox = document.getElementById("admin-box");
loginBox.style.display = "block";
adminBox.style.display = "none";

firebase.auth().onAuthStateChanged(user => {
  if (user && user.email === EMAIL_AUTORIZADO) {
    loginBox.style.display = "none";
    adminBox.style.display = "block";
    cargarBannerAdmin();
    cargarProductosAdmin();
    cargarSolicitudes();
  } else if (user) {
    loginBox.innerHTML = "<div style='padding:2em;'><b>Acceso denegado.</b><br>Solo el usuario autorizado puede entrar.</div>";
    adminBox.style.display = "none";
  } else {
    loginBox.style.display = "block";
    adminBox.style.display = "none";
  }
});

document.getElementById("btn-google-login").onclick = function() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
};

function cargarBannerAdmin() {
  const bannerData = localStorage.getItem(BANNER_KEY);
  if (bannerData) {
    document.getElementById("banner-input").value = bannerData;
    document.getElementById("preview-banner").innerHTML = bannerData;
  }
}
document.getElementById("banner-input").addEventListener("input", function() {
  document.getElementById("preview-banner").innerHTML = this.value;
});
document.getElementById("guardar-banner").onclick = function() {
  const val = document.getElementById("banner-input").value;
  localStorage.setItem(BANNER_KEY, val);
  alert("Banner guardado correctamente. Visible en la tienda.");
}

async function cargarProductosAdmin() {
  try {
    const res = await fetch("productos.json?v=" + Date.now());
    productos = await res.json();
  } catch {
    productos = [];
  }
  renderTablaProductos();
}

function renderTablaProductos() {
  const cont = document.getElementById("tabla-productos");
  if (!productos.length) {
    cont.innerHTML = "<p style='color:#ffbe4b'>No hay productos cargados aún.</p>";
    return;
  }
  let html = `<table class="tabla-admin">
    <tr>
      <th>Nombre</th>
      <th>Precio</th>
      <th>Ventas</th>
      <th>Reputación</th>
      <th>Destacado</th>
      <th>Imagen</th>
      <th>Acciones</th>
    </tr>`;
  productos.forEach((p, i) => {
    let thumb = Array.isArray(p.imagen) ? p.imagen[0] : p.imagen;
    html += `<tr>
      <td>${p.nombre}</td>
      <td>$${p.precio}</td>
      <td>${p.ventas !== undefined ? p.ventas : ''}</td>
      <td>${p.estrellas !== undefined ? p.estrellas : ''}</td>
      <td style="text-align:center;">${p.destacado ? "★" : ""}</td>
      <td><img src="${thumb || "logo.png"}" alt="img" style="width:46px;border-radius:8px"></td>
      <td>
        <button onclick="editarProducto(${i})">Editar</button>
        <button onclick="eliminarProducto(${i})">Eliminar</button>
      </td>
    </tr>`;
  });
  html += `</table>
    <button onclick="descargarProductosJSON()" style="margin-top:14px;">Descargar productos.json</button>`;
  cont.innerHTML = html;
}

document.getElementById("form-producto").onsubmit = async function(e) {
  e.preventDefault();

  // Obtener manualmente las imágenes ingresadas como texto. Puede ser
  // una sola URL/nombre o una lista separada por comas o punto y coma.
  let imagenesTexto = document.getElementById("imagen").value.trim();
  let imagenesArray = [];
  if (imagenesTexto) {
    if (imagenesTexto.includes(',') || imagenesTexto.includes(';')) {
      imagenesArray = imagenesTexto.split(/[,;]+/).map(x => x.trim()).filter(x => x);
    } else {
      imagenesArray = [imagenesTexto];
    }
  }

  // Subir archivos seleccionados en el input de tipo file a Firebase Storage
  const fileInput = document.getElementById('imagenUpload');
  let urlsSubidas = [];
  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    urlsSubidas = await subirImagenes(fileInput.files);
  }

  // Combinar URLs de imágenes manuales y las subidas; si sólo hay una,
  // mantén el tipo de dato original (string) para compatibilidad.
  let imagenesFinal = [];
  imagenesFinal = imagenesArray.concat(urlsSubidas);
  let imagenProp;
  if (imagenesFinal.length === 0) {
    imagenProp = "";
  } else if (imagenesFinal.length === 1) {
    imagenProp = imagenesFinal[0];
  } else {
    imagenProp = imagenesFinal;
  }

  // A partir de esta versión eliminamos la carga manual de links de pago (MercadoPago, PayPal, WhatsApp).
  // Las integraciones de pago oficiales se gestionan en el sitio mediante las APIs integradas.

  // Nuevos campos
  const ventas = document.getElementById("ventas").value;
  const estrellas = document.getElementById("estrellas").value;

  const p = {
    nombre: document.getElementById("nombre").value,
    descripcion: document.getElementById("descripcion").value,
    precio: document.getElementById("precio").value,
    imagen: imagenProp,
    video: document.getElementById("video").value,
    destacado: document.getElementById("destacado").checked,
    ventas: ventas !== "" ? Number(ventas) : undefined,
    estrellas: estrellas !== "" ? Number(estrellas) : undefined
  };
  if (editando !== null) {
    productos[editando] = p;
    editando = null;
  } else {
    productos.push(p);
  }
  renderTablaProductos();
  this.reset();
  alert("Producto guardado. No olvides descargar el productos.json y subirlo al hosting.");
};

window.eliminarProducto = function(idx) {
  if (!confirm("¿Eliminar este producto?")) return;
  productos.splice(idx, 1);
  renderTablaProductos();
};

window.editarProducto = function(idx) {
  const p = productos[idx];
  document.getElementById("nombre").value = p.nombre;
  document.getElementById("descripcion").value = p.descripcion;
  document.getElementById("precio").value = p.precio;
  document.getElementById("imagen").value = Array.isArray(p.imagen) ? p.imagen.join(", ") : p.imagen;
  document.getElementById("video").value = p.video;
  document.getElementById("destacado").checked = !!p.destacado;
  document.getElementById("ventas").value = p.ventas !== undefined ? p.ventas : '';
  document.getElementById("estrellas").value = p.estrellas !== undefined ? p.estrellas : '';
  editando = idx;
  renderTablaProductos();
};

window.descargarProductosJSON = function() {
  const blob = new Blob([JSON.stringify(productos, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "productos.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
};

// ========== FIRESTORE: Solicitudes ==========
const db = firebase.firestore();
const tablaSolicitudes = document.getElementById("tabla-solicitudes");
const btnDescargarSolicitudes = document.getElementById("descargar-solicitudes");

async function cargarSolicitudes() {
  tablaSolicitudes.innerHTML = `<div style="color:#aaa;">Cargando solicitudes...</div>`;
  btnDescargarSolicitudes.style.display = "none";
  let solicitudes = [];
  let snap;
  try {
    snap = await db.collection("solicitudes").orderBy("fecha", "desc").get();
    solicitudes = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
  } catch {
    tablaSolicitudes.innerHTML = `<div style="color:#e17;">No se pudo cargar solicitudes.</div>`;
    return;
  }
  if (!solicitudes.length) {
    tablaSolicitudes.innerHTML = `<div style="color:#ffc;">Aún no hay solicitudes nuevas.</div>`;
    return;
  }
  let html = `<table class="tabla-admin">
    <tr>
      <th>Fecha</th>
      <th>Email</th>
      <th>Producto</th>
      <th>Precio</th>
      <th>Medio</th>
      <th>Acción</th>
    </tr>`;
  solicitudes.forEach((s, idx) => {
    html += `<tr>
      <td>${new Date(s.fecha).toLocaleString()}</td>
      <td>${s.email}</td>
      <td>${s.producto || ''}</td>
      <td>${s.precio || ''}</td>
      <td>${(s.mercadopago ? 'MercadoPago ' : '') + (s.paypal ? 'PayPal ' : '') + (s.whatsapp ? 'WhatsApp' : '')}</td>
      <td><button onclick="eliminarSolicitud('${s._id}')">Eliminar</button></td>
    </tr>`;
  });
  html += `</table>`;
  tablaSolicitudes.innerHTML = html;
  btnDescargarSolicitudes.style.display = "inline-block";

  btnDescargarSolicitudes.onclick = function() {
    let txt = '';
    solicitudes.forEach(s => {
      txt += `Fecha: ${new Date(s.fecha).toLocaleString()}
Email: ${s.email}
Producto: ${s.producto || ''}
Precio: ${s.precio || ''}
MercadoPago: ${s.mercadopago || ''}
PayPal: ${s.paypal || ''}
WhatsApp: ${s.whatsapp || ''}
-------------------------------
`;
    });
    const blob = new Blob([txt], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solicitudes_${Date.now()}.txt`;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 1000);
  };
}

window.eliminarSolicitud = async function(id) {
  if (!confirm("¿Eliminar esta solicitud?")) return;
  try {
    await db.collection("solicitudes").doc(id).delete();
    cargarSolicitudes();
  } catch {
    alert("No se pudo eliminar la solicitud.");
  }
};

if (firebase.auth().currentUser && firebase.auth().currentUser.email === EMAIL_AUTORIZADO) {
  cargarBannerAdmin();
  cargarProductosAdmin();
  cargarSolicitudes();
}
