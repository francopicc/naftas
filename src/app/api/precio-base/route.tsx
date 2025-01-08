// Importa los módulos necesarios
import { NextResponse } from "next/server";

type NombresCombustibles = {
  [key: number]: { [key: string]: string } | string;
};

const getNombreCombustible = (tipoCombustible: number, empresa: string): string => {
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
  const tipoCombustibleKey = tipoCombustible.toString(); // Asegúrate de que esto sea una cadena

  if (nombresCombustibles[Number(tipoCombustibleKey)]) { // Convertir a número
    if (typeof nombresCombustibles[Number(tipoCombustibleKey)] === "object") {
      const nombreEmpresa = (nombresCombustibles[Number(tipoCombustibleKey)] as { [key: string]: string })[empresa];
      return nombreEmpresa || "Tipo de Combustible Desconocido";
    } else {
      return nombresCombustibles[Number(tipoCombustibleKey)] as string; // Convertir a número
    }
  } else {
    return "Tipo de Combustible Desconocido";
  }
};

// La función que obtiene los parámetros de la URL en Next.js debe hacerse desde el servidor o del lado del cliente.
export async function obtenerPreciosActualizadosPorCiudad(ciudad: string) {
  const config = {
    url: "http://datos.energia.gob.ar/api/3/action/datastore_search",
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        resource_id: "80ac25de-a44a-4445-9215-090cf55cfda5",
        filters: { localidad: ciudad }, // Aplicando el filtro por localidad desde la query string
        limit: 40000,
        offset: 0
      })
    },
    processResponse: (data: { success: boolean; result: { records: any[] } }) => {
      if (!data.success) {
        throw new Error("Error al obtener los datos");
      }

      const records = data.result.records;

      // Agrupar los datos por localidad, empresa bandera y producto, seleccionando el precio más reciente
      const groupedData = records.reduce((acc: { [localidad: string]: { empresas: { [empresabandera: string]: { [producto: string]: { precio: number; fecha_vigencia: string; nombre_combustible: string }[] } }; coordenadas: { latitud: number | null; longitud: number | null } } }, record) => {
        const { localidad, empresabandera, producto, precio, fecha_vigencia, latitud, longitud, idproducto } = record;

        // Obtener el nombre del combustible según la empresa y el id del producto
        const nombreCombustible = getNombreCombustible(idproducto, empresabandera);

        if (!acc[localidad]) {
          acc[localidad] = {
            empresas: {},
            coordenadas: { latitud: latitud || null, longitud: longitud || null } // Asignamos coordenadas si están disponibles
          };
        }

        // Filtrar solo las empresas específicas
        const empresasPermitidas = ["YPF", "SHELL C.A.P.S.A.", "AXION", "PUMA"];
        if (!empresasPermitidas.includes(empresabandera)) return acc;

        if (!acc[localidad].empresas[empresabandera]) {
          acc[localidad].empresas[empresabandera] = {};
        }

        if (!acc[localidad].empresas[empresabandera][producto]) {
          acc[localidad].empresas[empresabandera][producto] = [];
        }

        // Agregar el precio, el nombre del combustible y la fecha
        acc[localidad].empresas[empresabandera][producto].push({ precio, fecha_vigencia, nombre_combustible: nombreCombustible });

        return acc;
      }, {});

      // Seleccionar el precio más reciente por producto dentro de cada empresa bandera y localidad
      const latestPrices = Object.keys(groupedData).reduce((result: { [localidad: string]: { coordenadas: { latitud: number | null; longitud: number | null }; empresas: { [empresabandera: string]: { [producto: string]: { precio: number; fecha_vigencia: string; } } } } }, localidad) => {
        result[localidad] = {
          coordenadas: groupedData[localidad].coordenadas,
          empresas: Object.keys(groupedData[localidad].empresas).reduce((empresas: { [empresabandera: string]: { [producto: string]: { precio: number; fecha_vigencia: string; } } }, empresabandera) => {
            empresas[empresabandera] = Object.keys(groupedData[localidad].empresas[empresabandera]).reduce((productos: { [producto: string]: { precio: number; fecha_vigencia: string; } }, producto) => {
              const precios = groupedData[localidad].empresas[empresabandera][producto];

              // Ordenar los precios por fecha, de más reciente a más antigua
              const latestPrice = precios.reduce((latest: { precio: number; fecha_vigencia: string; nombre_combustible: string }, current: { precio: number; fecha_vigencia: string; nombre_combustible: string }) => {
                const currentDate = new Date(current.fecha_vigencia);
                const latestDate = new Date(latest.fecha_vigencia);
                return currentDate > latestDate ? current : latest;
              });  

              // Reemplazar el nombre del combustible con el precio y asegurar la inclusión de la fecha de vigencia
              productos[latestPrice.nombre_combustible] = {
                precio: latestPrice.precio,
                fecha_vigencia: latestPrice.fecha_vigencia
              };
              return productos;
            }, {});

            return empresas;
          }, {})
        };

        return result;
      }, {});

      return latestPrices;
    },
    handleError: (error: unknown) => {
      console.error("Error al procesar los datos:", error);
      return { error: String(error) }; // Devuelve un JSON con el error
    }
  };

  try {
    const response = await fetch(config.url, config.options);
    const data = await response.json();
    const latestPrices = config.processResponse(data);
    return latestPrices; // Devuelve el JSON resultante
  } catch (error) {
    return config.handleError(error); // Devuelve el error como JSON
  }
}

// Define las funciones GET y POST directamente dentro del archivo de API en Next.js 15

export async function GET(req: Request) {
  // Obtener el parámetro "ciudad" desde la query string en una petición GET
  const url = new URL(req.url);
  const ciudad = url.searchParams.get("ciudad");

  if (!ciudad) {
    return NextResponse.json({ error: "Parámetro 'ciudad' es requerido" }, { status: 400 });
  }

  const result = await obtenerPreciosActualizadosPorCiudad(ciudad);
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  // Obtener el parámetro "ciudad" desde el cuerpo de la solicitud POST
  const { ciudad } = await req.json();

  if (!ciudad) {
    return NextResponse.json({ error: "Parámetro 'ciudad' es requerido" }, { status: 400 });
  }

  const result = await obtenerPreciosActualizadosPorCiudad(ciudad);
  return NextResponse.json(result);
}
