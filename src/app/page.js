"use client"
import axios from "axios";
import { useEffect, useState } from "react";
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const Home = () => {
  const [coordinates, setCoordinates] = useState(null);
  const [responseData, setResponseData] = useState(null);

  useEffect(() => {
    const obtenerUbicacion = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCoordinates({ lat: latitude, lng: longitude });
          },
          (error) => {
            console.error('Error al obtener la ubicación:', error.message);
          }
        );
      } else {
        console.error('La geolocalización no está soportada por el navegador.');
      }
    };

    obtenerUbicacion();
  }, []);

  const fetchData = async () => {
    const apiUrl = 'https://preciosensurtidor.minem.gob.ar/ws/rest/rest/server.php';

    const fetchCombustible = async (combustibleId) => {
      const formDataCombustible = new FormData();
      formDataCombustible.append('method', 'getEmpresasAgrupadasBanderasCombustible');
      formDataCombustible.append('banderas', JSON.stringify(["28", "2", "26", "4"]));
      formDataCombustible.append('combustible', combustibleId.toString());
      formDataCombustible.append('bounds', JSON.stringify({
        so: { lat: coordinates?.lat - 0.045, lng: coordinates?.lng - 0.045 },
        ne: { lat: coordinates?.lat + 0.045, lng: coordinates?.lng + 0.045 },
      }));

      const responseCombustible = await axios.post(apiUrl, formDataCombustible, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        tipoCombustible: combustibleId,
        estaciones: responseCombustible.data,
      };
    };

    try {
      // Realizar fetches de combustibles en paralelo
      const combustiblePromises = [19, 21, 6, 2, 3].map(fetchCombustible);
      const resultadoFinal = await Promise.all(combustiblePromises);
  
      // Mapear nombres de combustible según el nuevo orden
      const nombresCombustibles = [ "Gasoil", "Gasoil Premium", "GNC", "Nafta Premium", "Nafta Super"];
  
      // Agregar la clave nombreCombustible a cada objeto resultado
      const resultadoConNombres = resultadoFinal.map((combustibleData) => {
        const nombreCombustible = nombresCombustibles[combustibleData.tipoCombustible - 1];
        const estacionesConNombres = combustibleData.estaciones.resultado.map((estacion) => ({
          ...estacion,
          nombreCombustible,
        }));
        return {
          ...combustibleData,
          estaciones: {
            ...combustibleData.estaciones,
            resultado: estacionesConNombres,
          },
        };
      });
  
      console.log('Resultado Final con Nombres:', resultadoConNombres);
      setResponseData(resultadoConNombres); // Guardar la respuesta en el estado
  
    } catch (error) {
      console.error('Error:', error.message);
    }
  };

  
  const formatDateDistance = (dateString) => {
    const date = parseISO(dateString);
    const distance = formatDistanceToNow(date, { addSuffix: true, locale: es });
    return distance;
  };
  

  useEffect(() => {
    if (coordinates) {
      // Realizar la solicitud cuando se obtienen las coordenadas
      fetchData();
    }
  }, [coordinates]);

  return (
    <main className="flex flex-col items-center justify-between bg-gray-50 text-gray-900">
      <h1 className="font-extrabold text-2xl md:text-xl mt-2">naftas</h1>
      {responseData && (
        <div>
          <div className="flex justify-center">
            <h1 className="text-xs text-stone-400 -mb-8 mt-5 text-start w-[250px] md:w-full">Teniendo en cuenta tu ubicación, estas son las estaciones mas cercanas (4,5km):</h1>
          </div>
          {responseData.map((combustibleData) => (
            <div key={combustibleData.tipoCombustible}>
              <div className="flex justify-center">
                <h2 className="text-xl font-extrabold mt-10 w-[285px] md:text-2xl md:w-full">Estaciones de servicio que cargan <span className="text-[#0063be]">{getNombreCombustible(combustibleData.tipoCombustible)}</span></h2>
              </div>
              {Array.isArray(combustibleData.estaciones.resultado) && combustibleData.estaciones.resultado.length > 0 ? (
                combustibleData.estaciones.resultado.map((estacion) => (

                  <div key={estacion.idempresa} className="py-3 px-5 bg-white shadow rounded-lg mt-5">
                      <img
                        src={`https://preciosensurtidor.minem.gob.ar/img/logos/${estacion.empresabandera.toLowerCase()}.png`}
                        alt={estacion.empresabandera}
                        className="w-10 h-30 p-1 rounded object-cover"
                        style={{ backgroundColor: 'white' }}
                      />
                    <h3 className="text-xl font-bold">{estacion.empresabandera}</h3>
                    <p className="text-stone-400 text-xs">{estacion.direccion}, {estacion.localidad}</p>
                    <div className="flex flex-row space-x-3">
                      <p className="text-2xl font-bold text-stone-800 mt-3">{estacion.precios[combustibleData.tipoCombustible]?.precio}$</p>
                      <p className="text-stone-400 text-xs mt-6">/ litro</p>
                    </div>
                    <p className="text-stone-300 text-xs">Ultima actualización: {formatDateDistance(estacion.precios[combustibleData.tipoCombustible]?.fechavigencia)}</p>
                  </div>
                ))
              ) : (
                <p>No hay estaciones de servicio disponibles para este tipo de combustible. 😢</p>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-5 text-stone-500 text-xs">Todos los datos son extraidos de la pagina del Ministerio de Energía</p>
    </main>
  );
};

// Función para obtener el nombre del combustible según el tipo
const getNombreCombustible = (tipoCombustible) => {
  const nombresCombustibles = {
    19: "Gas Oil",
    21: "Gas Oil Premium",
    6: "GNC",
    2: "Nafta Premium",
    3: "Nafta Super",
  };
  
  return nombresCombustibles[tipoCombustible] || "Tipo de Combustible Desconocido";
};

export default Home;
