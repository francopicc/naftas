import { NextResponse } from "next/server";

interface City {
  nombre: string;
  latitud?: number;
  longitud?: number;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const revalidate = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";

  try {
    // Construir la URL absoluta usando el protocolo y host de la request
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("host");
    if (!host) throw new Error("Falta el header host");

    const fileUrl = `${protocol}://${host}/assets/cities.json`;

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error("No se pudo cargar el archivo cities.json");
    }

    const data = await response.json();
    // Se espera que el JSON tenga la forma { cities: City[] }
    const cities: City[] = data.cities;

    // Filtrar las ciudades según el parámetro `q`
    const filteredCities = cities.filter((city) =>
      city.nombre.toLowerCase().includes(query.toLowerCase())
    );

    if (query && filteredCities.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron ciudades que coincidan con la búsqueda" },
        { status: 404 }
      );
    }

    return NextResponse.json({ cities: filteredCities });
  } catch (error) {
    console.error("Error al procesar el archivo JSON:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
