import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Helper function to get fuel name
type NombresCombustibles = {
  [key: number]: { [key: string]: string } | string;
};

const nombresCombustibles: NombresCombustibles = {
  19: {
    YPF: "DIESEL500",
    "SHELL C.A.P.S.A.": "Shell Evolux Diesel",
    AXION: "AXION Diesel X10",
    PUMA: "PUMA Diesel",
  },
  21: {
    YPF: "INFINIA DIESEL",
    "SHELL C.A.P.S.A.": "Shell V-Power Diesel",
    AXION: "QUANTIUM Diesel X10",
    PUMA: "ION PUMA Diesel",
  },
  6: "GNC",
  2: {
    YPF: "SUPER",
    "SHELL C.A.P.S.A.": "Shell Super",
    AXION: "Axion SUPER",
    PUMA: "PUMA Super",
  },
  3: {
    YPF: "INFINIA",
    "SHELL C.A.P.S.A.": "Shell V-Power",
    AXION: "QUANTIUM",
    PUMA: "MAX Premium",
  },
};

const getNombreCombustible = (tipoCombustible: number, empresa: string): string => {
  const tipoCombustibleKey = tipoCombustible.toString();

  if (nombresCombustibles[Number(tipoCombustibleKey)]) {
    if (typeof nombresCombustibles[Number(tipoCombustibleKey)] === "object") {
      const nombreEmpresa = (nombresCombustibles[Number(tipoCombustibleKey)] as { [key: string]: string })[empresa];
      return nombreEmpresa || "Tipo de Combustible Desconocido";
    } else {
      return nombresCombustibles[Number(tipoCombustibleKey)] as string;
    }
  } else {
    return "Tipo de Combustible Desconocido";
  }
};

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

export async function POST(req: Request) {
  const { ciudad } = await req.json();

  if (!ciudad) {
    return NextResponse.json({ error: "Parámetro 'ciudad' es requerido" }, { status: 400 });
  }

  const result = await obtenerPreciosActualizadosPorCiudad(ciudad);
  return NextResponse.json(result);
}

