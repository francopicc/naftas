// Importa los módulos necesarios
import axios from "axios";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Coordinates {
  lat: number;
  lng: number;
}

interface Precio {
  tipoCombustible: number;
  precio: number;
  fechaVigencia: string;
  confiabilidad: string;
  nombre: string;
}

interface Precios {
  [key: string]: Precio;
}

interface Empresa {
  idempresa: string;
  cuit: string;
  nombre: string;
  direccion: string;
  lat: string;
  lon: string;
  razonSocial: string;
  localidad: string;
  precios: Precios;
}

interface EstacionResponse {
  idempresa: string;
  cuit: string;
  empresabandera: string;
  direccion: string;
  lat: string;
  lon: string;
  razonsocial: string;
  localidad: string;
  precios: {
    [key: string]: {
      precio: number;
      fechavigencia: string;
    }
  }
}

interface CombustibleData {
  tipoCombustible: number;
  estaciones: {
    resultado: EstacionResponse[];
  }
}

const fetchData = async (lat: number, long: number) => {
  const apiUrl = 'https://preciosensurtidor.energia.gob.ar/ws/rest/rest/server.php';
  const coordinates: Coordinates = {
    lat: parseFloat(lat.toString()),
    lng: parseFloat(long.toString()),
  }

  const fetchCombustible = async (combustibleId: number): Promise<CombustibleData> => {
    const formDataCombustible = new FormData();
    formDataCombustible.append('method', 'getEmpresasAgrupadasBanderasCombustible');
    // Incluir todas las banderas posibles para obtener precios globales
    formDataCombustible.append('banderas', JSON.stringify(["28", "2", "26", "4"]));
    formDataCombustible.append('combustible', combustibleId.toString());
    formDataCombustible.append('bounds', JSON.stringify({
      so: {
        lat: coordinates.lat - 2, // Ampliamos el radio de búsqueda
        lng: coordinates.lng - 2
      },
      ne: {
        lat: coordinates.lat + 2,
        lng: coordinates.lng + 2
      }
    }));

    const responseCombustible = await axios.post(apiUrl, formDataCombustible, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return { tipoCombustible: combustibleId, estaciones: responseCombustible.data };
  };

  try {
    // Realizar fetches de todos los tipos de combustibles en paralelo
    const combustiblePromises: Promise<CombustibleData>[] = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21
    ].map(fetchCombustible);
    const resultadoFinal = await Promise.all(combustiblePromises);

    // Organizar la información por empresa
    const empresasData: Empresa[] = [];

    // Iterar sobre los resultados de cada tipo de combustible
    resultadoFinal.forEach((combustibleData: CombustibleData) => {
      const tipoCombustible = combustibleData.tipoCombustible;
      combustibleData.estaciones.resultado.forEach((estacion: EstacionResponse) => {
        const idEmpresa = estacion.idempresa;
        let empresaExistente = empresasData.find((empresa) => empresa.idempresa === idEmpresa);
    
        if (!empresaExistente) {
          empresaExistente = {
            idempresa: idEmpresa,
            cuit: estacion.cuit,
            nombre: estacion.empresabandera,
            direccion: estacion.direccion,
            lat: estacion.lat,
            lon: estacion.lon,
            razonSocial: estacion.razonsocial,
            localidad: estacion.localidad,
            precios: {}
          };
          empresasData.push(empresaExistente);
        }
    
        // Solo agregar precios si existen y son válidos
        if (estacion.precios[tipoCombustible]?.precio > 0) {
          const precio = estacion.precios[tipoCombustible]?.precio;
          const fechaVigencia = estacion.precios[tipoCombustible]?.fechavigencia;
          const nombreCombustible = getNombreCombustible(tipoCombustible, estacion.empresabandera);
          
          // Actualizar solo si el precio es más reciente
          if (!empresaExistente.precios[tipoCombustible] || 
              new Date(fechaVigencia) > new Date(empresaExistente.precios[tipoCombustible].fechaVigencia)) {
            empresaExistente.precios[tipoCombustible] = {
              tipoCombustible,
              precio,
              fechaVigencia,
              confiabilidad: calcularNivelConfiabilidad(fechaVigencia),
              nombre: nombreCombustible,
            };
          }
        }
      });
    });

    const estacionesFiltradas = obtenerEstacionesFiltradas(empresasData);

    const estacionesConDistancia = estacionesFiltradas.map((estacion) => {
      const distancia = calcularDistancia({
        lat: parseFloat(estacion.lat),
        lng: parseFloat(estacion.lon)
      }, coordinates);
      return {
        ...estacion,
        distancia
      };
    });

    // Ordenar por fecha de actualización más reciente y distancia
    const estacionesOrdenadas = estacionesConDistancia.sort((a, b) => {
      const fechaA = Math.max(...Object.values(a.precios).map(p => new Date(p.fechaVigencia).getTime()));
      const fechaB = Math.max(...Object.values(b.precios).map(p => new Date(p.fechaVigencia).getTime()));
      if (fechaA !== fechaB) return fechaB - fechaA;
      return a.distancia - b.distancia;
    });

    return estacionesOrdenadas;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
      return { error: error.message };
    }
    return { error: 'An unknown error occurred' };
  }
};

const obtenerEstacionesFiltradas = (estaciones: Empresa[]): Empresa[] => {
    const estacionesFiltradas: Empresa[] = [];
  
    estaciones.forEach((estacion) => {
      let preciosActualizados: Precios = {};
  
      Object.entries(estacion.precios).forEach(([key, precio]) => {
        if (precio.confiabilidad === 'Alta confiabilidad') {
          preciosActualizados[key] = precio;
        }
      });
  
      // Buscar otra estación de la misma empresa con precios más actualizados
      const estacionesMismaEmpresa = estaciones.filter((e) => e.nombre === estacion.nombre && e.idempresa !== estacion.idempresa);
  
      estacionesMismaEmpresa.forEach((estacionMismaEmpresa) => {
        Object.entries(estacionMismaEmpresa.precios).forEach(([key, precio]) => {
          if (precio.confiabilidad === 'Alta confiabilidad' && precio.precio < Infinity && precio.precio > 0) {
            preciosActualizados[key] = precio;
          }
        });
      });
  
      estacionesFiltradas.push({
        idempresa: estacion.idempresa,
        cuit: estacion.cuit,
        nombre: estacion.nombre,
        direccion: estacion.direccion,
        lat: estacion.lat,
        lon: estacion.lon,
        razonSocial: estacion.razonSocial,
        localidad: estacion.localidad,
        precios: preciosActualizados
      });
    });
  
    // Eliminar duplicados por empresa, conservando solo el primero encontrado
    const uniqueCompanies = new Set<string>();
    const filteredStations: Empresa[] = [];
    for (const station of estacionesFiltradas) {
      if (!uniqueCompanies.has(station.nombre)) {
        filteredStations.push(station);
        uniqueCompanies.add(station.nombre);
      }
    }
  
    return filteredStations;
  };
  
interface NombresCombustibles {
  [key: string]: {
    [key: string]: string;
  } | string;
}

const getNombreCombustible = (tipoCombustible: number, empresa: string): string => {
  const nombresCombustibles: NombresCombustibles = {
    19: {
      YPF: "DIESEL500",
      "SHELL C.A.P.S.A.": "Shell Evolux Diesel",
      AXION: "AXION Diesel X10",
      PUMA: "PUMA Diesel"
    },
    21: {
      YPF: "INFINIA DIESEL",
      "SHELL C.A.P.S.A.": "Shell V-Power Diesel",
      AXION: "QUANTIUM Diesel X10",
      PUMA: "ION PUMA Diesel"
    },
    6: "GNC",
    2: {
      YPF: "SUPER",
      "SHELL C.A.P.S.A.": "Shell Super",
      AXION: "Axion SUPER",
      PUMA: "PUMA Super"
    },
    3: {
      YPF: "INFINIA",
      "SHELL C.A.P.S.A.": "Shell V-Power",
      AXION: "QUANTIUM",
      PUMA: "MAX Premium"
    }
  };
  const tipoCombustibleKey = tipoCombustible.toString();
  const combustible = nombresCombustibles[tipoCombustibleKey];

  if (typeof combustible === "string") {
    return combustible;
  } else if (combustible && typeof combustible === "object") {
    return combustible[empresa] || "Tipo de Combustible Desconocido";
  }
  return "Tipo de Combustible Desconocido";
};

const calcularNivelConfiabilidad = (fecha: string): string => {
  if (!fecha) {
    return 'Baja confiabilidad';
  }
  
  const fechaActual = new Date();
  const fechaUltimaActualizacion = new Date(fecha);

  const diferenciaEnMilisegundos = fechaActual.getTime() - fechaUltimaActualizacion.getTime();
  const diferenciaEnDias = diferenciaEnMilisegundos / (1000 * 60 * 60 * 24);

  if (diferenciaEnDias >= 75) {
    return 'Baja confiabilidad';
  } else if (diferenciaEnDias >= 20) {
    return 'Confiabilidad limitada';
  } else {
    return 'Alta confiabilidad';
  }
};

const calcularDistancia = (coordenadas1: Coordinates, coordenadas2: Coordinates): number => {
  const R = 6371;
  const lat1 = coordenadas1.lat * (Math.PI / 180);
  const lon1 = coordenadas1.lng * (Math.PI / 180);
  const lat2 = coordenadas2.lat * (Math.PI / 180);
  const lon2 = coordenadas2.lng * (Math.PI / 180);

  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;

  const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distancia = R * c;

  return distancia;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const zona = searchParams.get('zona') || 'este';

    let lat: number;
    let lng: number;

    switch(zona.toLowerCase()) {
      case 'sur':
        lat = -39.02496820106367;
        lng = -67.57594084801558;
        break;
      case 'oeste':
        lat = -41.13760192273125;
        lng = -71.30180540523081;
        break;
      case 'norte':
        lat = -24.790997533553384;
        lng = -65.42015037222895;
        break;
      case 'este':
      default:
        lat = -34.573060;
        lng = -58.422024;
        break;
    }

    const datos = await fetchData(lat, lng);
    return NextResponse.json(datos);
  } catch (e) {
    if (e instanceof Error) {
      console.error('Error:', e.message);
    }
    return NextResponse.json({ message: "Error when fetching." });
  }
}
