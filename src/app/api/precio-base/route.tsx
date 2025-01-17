import { NextResponse } from "next/server";
import { getNombreCombustible } from '@/utils/getNombreCombustible'

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Function to sort fuels in the desired order
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

// Function to get updated prices by city
const obtenerPreciosActualizadosPorCiudad = async (ciudad: string) => {
  const config = {
    url: "http://datos.energia.gob.ar/api/3/action/datastore_search",
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resource_id: "80ac25de-a44a-4445-9215-090cf55cfda5",
        filters: { localidad: ciudad },
        limit: 40000,
        offset: 0,
      }),
    },
    processResponse: (data: { success: boolean; result: { records: any[] } }) => {
      if (!data.success) {
        throw new Error("Error al obtener los datos");
      }

      const records = data.result.records;

      const groupedData = records.reduce((acc: { [localidad: string]: { empresas: { [empresabandera: string]: { [producto: string]: { precio: number; fecha_vigencia: string }[] } }; coordenadas: { latitud: number | null; longitud: number | null } } }, record) => {
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

        acc[localidad].empresas[empresabandera][nombreCombustible].push({ precio, fecha_vigencia });

        return acc;
      }, {});

      const latestPrices = Object.keys(groupedData).reduce((result: { [localidad: string]: { coordenadas: { latitud: number | null; longitud: number | null }; empresas: { [empresabandera: string]: { [producto: string]: { precio: number; fecha_vigencia: string; } } } } }, localidad) => {
        result[localidad] = {
          coordenadas: groupedData[localidad].coordenadas,
          empresas: Object.keys(groupedData[localidad].empresas).reduce((empresas: { [empresabandera: string]: { [producto: string]: { precio: number; fecha_vigencia: string; } } }, empresabandera) => {
            empresas[empresabandera] = sortFuels(
              Object.keys(groupedData[localidad].empresas[empresabandera]).reduce((productos: { [producto: string]: { precio: number; fecha_vigencia: string; } }, producto) => {
                const precios = groupedData[localidad].empresas[empresabandera][producto];

                const latestPrice = precios.reduce((latest, current) => {
                  const currentDate = new Date(current.fecha_vigencia);
                  const latestDate = new Date(latest.fecha_vigencia);
                  return currentDate > latestDate ? current : latest;
                });

                productos[producto] = {
                  precio: latestPrice.precio,
                  fecha_vigencia: latestPrice.fecha_vigencia,
                };
                return productos;
              }, {}),
              empresabandera
            );

            return empresas;
          }, {}),
        };

        return result;
      }, {});

      return latestPrices;
    },
    handleError: (error: unknown) => {
      console.error("Error al procesar los datos:", error);
      return { error: String(error) };
    },
  };

  try {
    const response = await fetch(config.url, config.options);
    const data = await response.json();
    return config.processResponse(data);
  } catch (error) {
    return config.handleError(error);
  }
};

// Export GET and POST handlers for the route
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ciudad = url.searchParams.get("ciudad");

  if (!ciudad) {
    return NextResponse.json({ error: "Parámetro 'ciudad' es requerido" }, { status: 400 });
  }

  const result = await obtenerPreciosActualizadosPorCiudad(ciudad);
  return NextResponse.json(result);
}
