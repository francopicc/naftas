import { NextResponse } from "next/server";
import Papa from "papaparse";

interface City {
  nombre: string;
  latitud: number;
  longitud: number;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const revalidate = 60; // Revalida cada 60 segundos (ajústalo si es necesario)

// URL del CSV
const csvUrl =
  "http://datos.energia.gob.ar/dataset/1c181390-5045-475e-94dc-410429be4b17/resource/80ac25de-a44a-4445-9215-090cf55cfda5/download/precios-en-surtidor-resolucin-3142016.csv";

// Función para parsear el CSV y filtrar las ciudades que coincidan con la búsqueda
const processCSVResponse = (csvText: string, query: string) => {
  // Parsear el CSV asumiendo que la primera fila contiene encabezados
  const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const records = parseResult.data;

  // Filtrar registros por el campo "localidad" que incluya la consulta (q)
  const matchingCities = records
    .filter((record: any) =>
      record.localidad &&
      record.localidad.toLowerCase().includes(query.toLowerCase())
    )
    .map((record: any) => ({
      nombre: record.localidad,
      latitud: record.latitud,
      longitud: record.longitud,
    }));

  // Eliminar duplicados usando el nombre de la ciudad como clave
  const uniqueCities = Array.from(
    new Map(matchingCities.map((city: City) => [city.nombre, city])).values()
  );

  return { cities: uniqueCities };
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";

  if (!query || query.length < 3) {
    return NextResponse.json(
      { error: "El parámetro 'q' es requerido y debe tener al menos 3 caracteres" },
      { status: 400 }
    );
  }

  try {
    // Se desactiva la caché para evitar problemas con respuestas grandes
    const response = await fetch(csvUrl, { cache: "no-store" });
    const csvText = await response.text();
    const result = processCSVResponse(csvText, query);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error al procesar los datos:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
