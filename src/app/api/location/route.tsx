import { NextResponse } from "next/server";
import { calculateDistance } from "@/utils/calculateDistance";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const config = {
  url: "http://datos.energia.gob.ar/api/3/action/datastore_search",
  options: {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      resource_id: "80ac25de-a44a-4445-9215-090cf55cfda5",
      filters: { empresabandera: "YPF" },
      limit: 40000,
      offset: 0
    })
  },
  processResponse: (data: any, lat: number, lon: number) => {
    if (!data.success) {
      throw new Error("Error al obtener los datos");
    }

    const records = data.result.records;

    // Find the nearest city based on coordinates
    let nearestCity = null;
    let minDistance = Infinity;

    records.forEach((record: any) => {
      if (record.latitud && record.longitud) {
        const distance = calculateDistance(lat, lon, record.latitud, record.longitud);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCity = record.localidad;
        }
      }
    });

    return { zone: nearestCity };
  },
  handleError: (error: unknown) => {
    console.error("Error al procesar los datos:", error);
    return { error: String(error) };
  }
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lon = parseFloat(url.searchParams.get("long") || "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Parámetros 'lat' y 'long' son requeridos y deben ser números válidos" }, { status: 400 });
  }

  try {
    const response = await fetch(config.url, config.options);
    const data = await response.json();
    const result = config.processResponse(data, lat, lon);
    return NextResponse.json(result);
  } catch (error) {
    const errorResult = config.handleError(error);
    return NextResponse.json(errorResult, { status: 500 });
  }
}