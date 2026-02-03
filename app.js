// app.js
// Aplicación BI educativa sin frameworks

let rawData = [];
let cleanData = [];

// Cargar el CSV
fetch("ventas_raw.csv")
  .then(response => response.text())
  .then(text => init(text));

function init(csvText) {
  rawData = parseCSV(csvText);
  const filasAntes = rawData.length;

  cleanData = cleanRows(rawData);
  const filasDespues = cleanData.length;

  document.getElementById("infoFilas").innerHTML =
    `<strong>Filas antes de limpieza:</strong> ${filasAntes} |
     <strong>Filas después de limpieza:</strong> ${filasDespues}`;

  mostrarKPIs(cleanData);
  mostrarTablas(rawData, cleanData);
  crearGraficos(cleanData);
  prepararDescarga(cleanData);
}

// Parseo simple de CSV
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    return obj;
  });
}

// Limpieza de datos
function cleanRows(data) {
  const seen = new Set();
  const familiasValidas = ["Bebida", "Entrante", "Principal", "Postre"];
  const franjasValidas = ["Desayuno", "Comida"];

  return data
    .map(r => {
      // Fecha válida
      const fecha = new Date(r.fecha);
      if (isNaN(fecha)) return null;

      // Normalizar texto
      const producto = (r.producto || "").trim();
      if (!producto) return null;

      let franja = (r.franja || "").trim();
      franja = franja.charAt(0).toUpperCase() + franja.slice(1).toLowerCase();
      if (!franjasValidas.includes(franja)) return null;

      let familia = (r.familia || "").trim();
      familia = familia.charAt(0).toUpperCase() + familia.slice(1).toLowerCase();
      if (!familiasValidas.includes(familia)) return null;

      const unidades = Number(r.unidades);
      const precio = Number(r.precio_unitario);
      if (unidades <= 0 || precio <= 0) return null;

      const importe = unidades * precio;

      const cleaned = {
        fecha: fecha.toISOString().slice(0, 10),
        franja,
        producto,
        familia,
        unidades,
        precio_unitario: precio,
        importe
      };

      const key = JSON.stringify(cleaned);
      if (seen.has(key)) return null;
      seen.add(key);

      return cleaned;
    })
    .filter(r => r !== null);
}

// KPIs
function mostrarKPIs(data) {
  const ventasTotales = data.reduce((s, r) => s + r.importe, 0);
  const unidadesTotales = data.reduce((s, r) => s + r.unidades, 0);

  const kpisDiv = document.getElementById("kpis");
  kpisDiv.innerHTML = `
    <div class="kpi">Ventas totales: €${ventasTotales.toFixed(2)}</div>
    <div class="kpi">Unidades totales: ${unidadesTotales}</div>
  `;
}

// Gráficos
function crearGraficos(data) {
  // Top 5 productos
  const porProducto = {};
  data.forEach(r => {
    porProducto[r.producto] = (porProducto[r.producto] || 0) + r.importe;
  });

  const topProductos = Object.entries(porProducto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  new Chart(document.getElementById("chartTopProductos"), {
    type: "bar",
    data: {
      labels: topProductos.map(p => p[0]),
      datasets: [{ data: topProductos.map(p => p[1]) }]
    }
  });

  // Ventas por franja
  crearChartSimple(
    data,
    "franja",
    "chartFranja",
    "pie"
  );

  // Ventas por familia
  crearChartSimple(
    data,
    "familia",
    "chartFamilia",
    "pie"
  );
}

function crearChartSimple(data, campo, canvasId, tipo) {
  const agg = {};
  data.forEach(r => {
    agg[r[campo]] = (agg[r[campo]] || 0) + r.importe;
  });

  new Chart(document.getElementById(canvasId), {
    type: tipo,
    data: {
      labels: Object.keys(agg),
      datasets: [{ data: Object.values(agg) }]
    }
  });
}

// Tablas
function mostrarTablas(raw, clean) {
  document.getElementById("tablaRaw").innerHTML =
    crearTablaHTML(raw.slice(0, 10));

  document.getElementById("tablaClean").innerHTML =
    crearTablaHTML(clean.slice(0, 10));
}

function crearTablaHTML(data) {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  let html = "<table><tr>";
  headers.forEach(h => html += `<th>${h}</th>`);
  html += "</tr>";

  data.forEach(r => {
    html += "<tr>";
    headers.forEach(h => html += `<td>${r[h]}</td>`);
    html += "</tr>";
  });

  html += "</table>";
  return html;
}

// Descargar CSV limpio
function prepararDescarga(data) {
  document.getElementById("downloadBtn").onclick = () => {
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map(r => headers.map(h => r[h]).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "ventas_clean.csv";
    a.click();

    URL.revokeObjectURL(url);
  };
}
