import { NextResponse } from "next/server";
import { getNombreCombustible } from "@/utils/getNombreCombustible";
import Papa from "papaparse";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Función para ordenar los combustibles según un orden predefinido
const sortFuels = (fuels: { [key: string]: any }, empresa: string): { [key: string]: any } => {
  const fuelOrder = [
    getNombreCombustible(2, empresa),  // SUPER
    getNombreCombustible(3, empresa),  // INFINIA
    getNombreCombustible(6, empresa),  // GNC
    getNombreCombustible(19, empresa), // DIESEL500
    getNombreCombustible(21, empresa), // INFINIA DIESEL
  ];

  return Object.keys(fuels)
    .sort((a, b) => {
      const indexA = fuelOrder.indexOf(a);
      const indexB = fuelOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    })
    .reduce((obj: { [key: string]: any }, key) => {
      obj[key] = fuels[key];
      return obj;
    }, {});
};

// Función para obtener los precios actualizados por ciudad (filtrando por el campo "localidad")
const obtenerPreciosActualizadosPorCiudad = async (ciudad: string) => {
  try {
    const csvUrl =
      "http://datos.energia.gob.ar/dataset/1c181390-5045-475e-94dc-410429be4b17/resource/80ac25de-a44a-4445-9215-090cf55cfda5/download/precios-en-surtidor-resolucin-3142016.csv";
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    // Parsear el CSV (se asume que la primera fila contiene los encabezados)
    const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const records = parseResult.data;

    // Filtrar los registros según el valor de "ciudad" (comparación case-insensitive)
    const filteredRecords = records.filter((record: any) => {
      return (
        record.localidad &&
        record.localidad.trim().toLowerCase() === ciudad.trim().toLowerCase()
      );
    });

    // Agrupar los datos por "localidad" y procesarlos
    const groupedData = filteredRecords.reduce(
      (acc: { [localidad: string]: any }, record: any) => {
        // Se asume que el CSV contiene: localidad, empresabandera, producto, precio, fecha_vigencia, latitud, longitud, idproducto
        const { localidad, empresabandera, producto, precio, fecha_vigencia, latitud, longitud, idproducto } = record;
        const nombreCombustible = getNombreCombustible(idproducto, empresabandera);

        if (!acc[localidad]) {
          acc[localidad] = {
            empresas: {},
            coordenadas: { latitud: latitud || null, longitud: longitud || null },
          };
        }

        const empresasPermitidas = ["YPF", "SHELL C.A.P.S.A.", "AXION", "PUMA"];
        if (!empresasPermitidas.includes(empresabandera)) return acc;

        if (!acc[localidad].empresas[empresabandera]) {
          acc[localidad].empresas[empresabandera] = {};
        }

        if (!acc[localidad].empresas[empresabandera][nombreCombustible]) {
          acc[localidad].empresas[empresabandera][nombreCombustible] = [];
        }

        acc[localidad].empresas[empresabandera][nombreCombustible].push({
          precio: Number(precio),
          fecha_vigencia,
        });

        return acc;
      },
      {}
    );

    // Procesar cada grupo para obtener el precio más reciente por combustible
    const latestPrices = Object.keys(groupedData).reduce(
      (result: { [localidad: string]: any }, localidad: string) => {
        result[localidad] = {
          coordenadas: groupedData[localidad].coordenadas,
          empresas: Object.keys(groupedData[localidad].empresas).reduce(
            (empresas: { [empresabandera: string]: any }, empresabandera: string) => {
              empresas[empresabandera] = sortFuels(
                Object.keys(groupedData[localidad].empresas[empresabandera]).reduce(
                  (productos: { [producto: string]: any }, producto: string) => {
                    const precios = groupedData[localidad].empresas[empresabandera][producto];
                    // Seleccionar el registro con la fecha de vigencia más reciente
                    const latestPrice = precios.reduce((latest: any, current: any) => {
                      const currentDate = new Date(current.fecha_vigencia);
                      const latestDate = new Date(latest.fecha_vigencia);
                      return currentDate > latestDate ? current : latest;
                    });
                    productos[producto] = {
                      precio: latestPrice.precio,
                      fecha_vigencia: latestPrice.fecha_vigencia,
                    };
                    return productos;
                  },
                  {}
                ),
                empresabandera
              );
              return empresas;
            },
            {}
          ),
        };
        return result;
      },
      {}
    );

    return latestPrices;
  } catch (error) {
    console.error("Error al procesar los datos:", error);
    return { error: String(error) };
  }
};

// Export GET handler para la ruta
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ciudad = url.searchParams.get("ciudad");

  if (!ciudad) {
    return NextResponse.json({ error: "Parámetro 'ciudad' es requerido" }, { status: 400 });
  }

  const result = await obtenerPreciosActualizadosPorCiudad(ciudad);
  return NextResponse.json(result);
}
