import { NextResponse } from "next/server";
import { calculateDistance } from "@/utils/calculateDistance";
import Papa from "papaparse";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const csvUrl =
  "http://datos.energia.gob.ar/dataset/1c181390-5045-475e-94dc-410429be4b17/resource/80ac25de-a44a-4445-9215-090cf55cfda5/download/precios-en-surtidor-resolucin-3142016.csv";

// Función para parsear el CSV y determinar la localidad más cercana
const processCSVResponse = (csvText: string, lat: number, lon: number) => {
  // Parsear el CSV (se asume que la primera fila contiene encabezados)
  const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const records = parseResult.data;

  // Determinar la ciudad (localidad) más cercana
  let nearestCity: string | null = null;
  let minDistance = Infinity;

  records.forEach((record: any) => {
    // Verificar que el registro tenga valores de latitud y longitud
    if (record.latitud && record.longitud) {
      const recordLat = Number(record.latitud);
      const recordLon = Number(record.longitud);
      if (!isNaN(recordLat) && !isNaN(recordLon)) {
        const distance = calculateDistance(lat, lon, recordLat, recordLon);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCity = record.localidad; // Se asume que "localidad" es el campo que contiene el nombre de la ciudad
        }
      }
    }
  });

  return { zone: nearestCity };
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lon = parseFloat(url.searchParams.get("long") || "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "Parámetros 'lat' y 'long' son requeridos y deben ser números válidos" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(csvUrl);
    const csvText = await response.text();
    const result = processCSVResponse(csvText, lat, lon);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error al procesar los datos:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
