import { NextResponse } from "next/server";
import Papa from "papaparse";

interface City {
  nombre: string;
  latitud: number;
  longitud: number;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const revalidate = 60;

// Nueva URL de la API
const apiUrl = "http://datos.energia.gob.ar/api/3/action/datastore_search";

// Función para obtener el mes actual en formato "YYYY-MM"
const getCurrentMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Asegura formato "03" en marzo
  return `${year}-${month}`;
};

// Función para procesar la respuesta de la API y filtrar por ciudad
const processAPIResponse = (data: { success: boolean; result: { records: any[] } }, query: string) => {
  if (!data.success) {
    throw new Error("Error al obtener los datos");
  }

  const records = data.result.records;

  const matchingCities = records
    .filter((record: any) =>
      record.localidad && record.localidad.toLowerCase().includes(query.toLowerCase())
    )
    .map((record: any) => ({
      nombre: record.localidad,
      latitud: record.latitud || null,
      longitud: record.longitud || null,
    }));

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
    const response = await fetch(apiUrl, {
      method: "POST",
      cache: 'no-store',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resource_id: "80ac25de-a44a-4445-9215-090cf55cfda5",
        filters: { empresabandera: "YPF", "indice_tiempo": getCurrentMonth() }, // Se usa el mes actual dinámicamente
        limit: 20000,
        offset: 0
      }),
    });

    const data = await response.json();
    const result = processAPIResponse(data, query);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error al procesar los datos:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
