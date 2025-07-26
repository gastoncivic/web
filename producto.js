document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = parseInt(urlParams.get("id"));
  const contenedor = document.getElementById("ficha-producto");

  fetch("producto.js")
    .then(res => res.text())
    .then(texto => {
      // Extraer JSON desde el JS
      const jsonInicio = texto.indexOf("[");
      const jsonFinal = texto.lastIndexOf("]") + 1;
      const jsonTexto = texto.substring(jsonInicio, jsonFinal);
      const productos = JSON.parse(jsonTexto);

      const prod = productos[id];
      if (!prod) {
        contenedor.innerHTML = "<h2>Producto no encontrado.</h2>";
        return;
      }

      let html = `
        <img src="${prod.imagen}" class="prod-ficha-img" alt="${prod.nombre}" />
        <div class="prod-ficha-nombre">${prod.nombre}</div>
        <div class="prod-ficha-precio">$${parseInt(prod.precio).toLocaleString()}</div>
        <div class="prod-ficha-desc">${prod.descripcion}</div>
      `;

      if (prod.video) {
        html += `
          <div style="margin:20px auto;max-width:100%;text-align:center;">
            <iframe width="100%" height="215" src="${prod.video}" 
              title="Video de producto" frameborder="0" allowfullscreen></iframe>
          </div>`;
      }

      html += `
        <div class="prod-btns">
          <a href="${prod.mercadopago}" class="tn-btn tn-btn-success" target="_blank">💳 Comprar con MercadoPago</a>
          <a href="${prod.paypal}" class="tn-btn tn-btn-primary" target="_blank">💲 Comprar con PayPal</a>
        </div>
        <div class="prod-contacto">
          <a href="${prod.whatsapp}" class="tn-btn tn-btn-wsp" target="_blank">📲 Consultar por WhatsApp</a>
        </div>
      `;

      contenedor.innerHTML = html;
    })
    .catch(err => {
      console.error("Error al cargar productos:", err);
      contenedor.innerHTML = "<h2>Error al cargar el producto.</h2>";
    });
});
