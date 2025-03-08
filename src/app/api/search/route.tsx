import { NextResponse } from "next/server";

interface City {
  nombre: string;
  latitud?: number;
  longitud?: number;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const revalidate = 60;

// Ruta al archivo cities.json en public/assets
const citiesFilePath = "/assets/cities.json"; // Ruta relativa en public

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") || ""; // Obtener el parámetro `q`

  try {
    // Construir URL absoluta al archivo usando la URL de la request
    const fileUrl = new URL(citiesFilePath, req.url);
    
    const response = await fetch(fileUrl.toString());
    if (!response.ok) {
      throw new Error("No se pudo cargar el archivo cities.json");
    }

    // La estructura del JSON es { cities: City[] }
    const data = await response.json();
    const cities: City[] = data.cities;

    // Filtrar las ciudades según el parámetro `q`
    const filteredCities = cities.filter((city) =>
      city.nombre.toLowerCase().includes(query.toLowerCase())
    );

    // Si se pasa un parámetro y no se encuentran coincidencias, devolver error 404
    if (query && filteredCities.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron ciudades que coincidan con la búsqueda" },
        { status: 404 }
      );
    }

    // Devolver las ciudades filtradas (o todas si query está vacío)
    return NextResponse.json({ cities: filteredCities });
  } catch (error) {
    console.error("Error al procesar el archivo JSON:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
