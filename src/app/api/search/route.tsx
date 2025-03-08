import { promises as fs } from "fs";
import path from "path";
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
    // Obtener la ruta absoluta del archivo
    const filePath = path.join(process.cwd(), "public/assets/cities.json");
    const fileContents = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(fileContents);

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
