"use client"

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { formatDistanceToNow, parseISO, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Settings, ChevronRight, Navigation, Bookmark, X, Bell, AlertTriangle } from 'lucide-react';
import BottomSheet from "@/components/BottomSheet";
import SettingsModal from "@/components/SettingsModal";
import SkeletonCard from "@/components/SkeletonCard";
import LocationRequestModal from "@/components/LocationRequestModal";
import { calcularIndicadorEmpresa } from "@/utils/calcularIndicador";
import Image from "next/image";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Combustible {
  precio: number;
  fecha_vigencia: string;
  nombre_combustible: string;
}

interface Empresa {
  [combustible: string]: Combustible;
}

interface Ciudad {
  coordenadas: {
    latitud: number;
    longitud: number;
  };
  empresas: {
    [empresa: string]: Empresa;
  };
}

interface APIResponse {
  [ciudad: string]: Ciudad;
}

interface SelectedFuel {
  isOpen: boolean;
  empresa: string;
  combustible: Combustible | null;
  tipoCombustible: string | null;
  ciudad: string;
}

interface Suscripcion {
  id: string;
  empresa: string;
  tipoCombustible: string;
  precio: number;
  fecha: string;
  ciudad: string;
  litros?: number;
  total?: number;
}

interface IncreaseInfo {
  willBeIncrease: boolean;
  increase: number;
  dateOfIncrease: string;
}

interface IncreasesResponse {
  [empresa: string]: IncreaseInfo;
}

const getColorIndicador = (puntaje: number): string => {
  if (puntaje >= 50) return "text-green-400 bg-green-100 py-1 px-2 rounded";
  if (puntaje >= 40) return "text-amber-400 bg-amber-100 py-1 px-2 rounded";
  if (puntaje >= 20) return "text-orange-500 bg-orange-200 py-1 px-2 rounded";
  return "text-red-500";
};

export default function Home() {
  const [responseData, setResponseData] = useState<APIResponse | null>(null);
  const [increasesData, setIncreasesData] = useState<IncreasesResponse | null>(null);
  const [promedioGeneral, setPromedioGeneral] = useState<number>(0);
  const [promedioFechaGeneral, setPromedioFechaGeneral] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedFuel, setSelectedFuel] = useState<SelectedFuel>({
    isOpen: false, 
    empresa: '', 
    combustible: null, 
    tipoCombustible: null, 
    ciudad: ''
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [isSuscripcionesOpen, setIsSuscripcionesOpen] = useState(false);

  const fetchData = async (ciudad: string) => {
    try {
      setIsLoading(true);
      console.log(ciudad);
      const response = await axios.get(`/api/precio-base?ciudad=${ciudad}`);
      setResponseData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIncreases = async () => {
    try {
      const response = await axios.get('https://naftas.vercel.app/api/increases');
      setIncreasesData(response.data);
    } catch (error) {
      console.error("Error fetching increases data:", error);
    }
  };

  const formatDateDistance = (dateString: string): string => {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  };

  useEffect(() => {
    const storedCity = localStorage.getItem('userCity');
    if (storedCity) {
      setSelectedZone(storedCity);
      setIsInitialized(true);
    } else {
      setIsLocationModalOpen(true);
    }

    // Cargar suscripciones guardadas
    const storedSuscripciones = localStorage.getItem('suscripciones');
    if (storedSuscripciones) {
      setSuscripciones(JSON.parse(storedSuscripciones));
    }

    // Cargar datos de aumentos
    fetchIncreases();
  }, []);

  useEffect(() => {
    if (isInitialized && selectedZone) {
      fetchData(selectedZone);
    }
  }, [selectedZone, isInitialized]);

  useEffect(() => {
    // Actualizar precios de suscripciones cuando cambian los datos
    if (responseData && suscripciones.length > 0) {
      const updatedSuscripciones = suscripciones.map(suscripcion => {
        // Buscar el precio actualizado para esta suscripción
        let precioActualizado = suscripcion.precio;
        let fechaActualizada = suscripcion.fecha;
        let encontrado = false;

        Object.entries(responseData).forEach(([ciudad, ciudadData]) => {
          if (ciudadData.empresas[suscripcion.empresa] && 
              ciudadData.empresas[suscripcion.empresa][suscripcion.tipoCombustible]) {
            const combustible = ciudadData.empresas[suscripcion.empresa][suscripcion.tipoCombustible];
            precioActualizado = combustible.precio;
            fechaActualizada = combustible.fecha_vigencia;
            encontrado = true;
          }
        });

        // Calcular el nuevo total basado en el precio actualizado y los litros
        const nuevoTotal = suscripcion.litros ? precioActualizado * suscripcion.litros : undefined;

        return {
          ...suscripcion,
          precio: precioActualizado,
          fecha: fechaActualizada,
          disponible: encontrado,
          total: nuevoTotal
        };
      });

      setSuscripciones(updatedSuscripciones);
      localStorage.setItem('suscripciones', JSON.stringify(updatedSuscripciones));
    }
  }, [responseData]);

  const handleZoneChange = async (zone: string) => {
    if (!zone) return;
    
    setIsLoading(true);
    try {
      await fetchData(zone);
      setSelectedZone(zone);
      localStorage.setItem('userCity', zone);
    } catch (error) {
      console.error("Error al cambiar la zona:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const calcularPromediosGenerales = () => {
    if (!responseData || !Object.keys(responseData).length) return;
    
    let sumaPreciosTotal = 0;
    let cantidadPreciosTotal = 0;
    let sumaFechasTotal = 0;

    Object.values(responseData).forEach((ciudad) => {
      Object.values(ciudad.empresas).forEach((empresa) => {
        Object.values(empresa).forEach((combustible) => {
          sumaPreciosTotal += combustible.precio;
          sumaFechasTotal += new Date(combustible.fecha_vigencia).getTime();
          cantidadPreciosTotal++;
        });
      });
    });

    setPromedioGeneral(sumaPreciosTotal / cantidadPreciosTotal);
    setPromedioFechaGeneral(sumaFechasTotal / cantidadPreciosTotal);
  };

  useEffect(() => {
    if (responseData) {
      calcularPromediosGenerales();
    }
  }, [responseData, selectedZone]);

  const agregarSuscripcion = (empresa: string, tipoCombustible: string, precio: number, fecha: string, ciudad: string, litros?: number, total?: number) => {
    const id = `${empresa}-${tipoCombustible}-${ciudad}`;
    const nuevaSuscripcion = { id, empresa, tipoCombustible, precio, fecha, ciudad, litros, total };
    
    // Verificar si ya existe esta suscripción
    const suscripcionExistente = suscripciones.find(s => s.id === id);
    
    if (!suscripcionExistente) {
      const nuevasSuscripciones = [...suscripciones, nuevaSuscripcion];
      setSuscripciones(nuevasSuscripciones);
      localStorage.setItem('suscripciones', JSON.stringify(nuevasSuscripciones));
    } else {
      // Actualizar la suscripción existente
      const nuevasSuscripciones = suscripciones.map(s => 
        s.id === id ? { ...s, litros, total } : s
      );
      setSuscripciones(nuevasSuscripciones);
      localStorage.setItem('suscripciones', JSON.stringify(nuevasSuscripciones));
    }
  };

  const eliminarSuscripcion = (id: string) => {
    const nuevasSuscripciones = suscripciones.filter(s => s.id !== id);
    setSuscripciones(nuevasSuscripciones);
    localStorage.setItem('suscripciones', JSON.stringify(nuevasSuscripciones));
  };

  const esSuscrito = (empresa: string, tipoCombustible: string, ciudad: string) => {
    const id = `${empresa}-${tipoCombustible}-${ciudad}`;
    return suscripciones.some(s => s.id === id);
  };

  const getTotalSuscripciones = () => {
    return suscripciones.reduce((total, suscripcion) => {
      return total + (suscripcion.total || 0);
    }, 0);
  };

  // Verificar si hay aumentos futuros
  const hayAumentosFuturos = () => {
    if (!increasesData) return false;
    
    const now = new Date();
    return Object.values(increasesData).some(increase => {
      if (!increase.willBeIncrease) return false;
      const increaseDate = parseISO(increase.dateOfIncrease);
      return isAfter(increaseDate, now);
    });
  };

  // Obtener el próximo aumento
  const getProximoAumento = () => {
    if (!increasesData) return null;
    
    const now = new Date();
    let proximoAumento: { empresa: string; info: IncreaseInfo } | null = null;
    let fechaMasCercana = new Date(8640000000000000); // Fecha máxima posible
    
    Object.entries(increasesData).forEach(([empresa, info]) => {
      if (!info.willBeIncrease) return;
      
      const increaseDate = parseISO(info.dateOfIncrease);
      if (isAfter(increaseDate, now) && increaseDate < fechaMasCercana) {
        fechaMasCercana = increaseDate;
        proximoAumento = { empresa, info };
      }
    });
    
    return proximoAumento;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex flex-row space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width={25} className="text-black fill-current -mt-2.5">
                <g>
                  <path d="M13 20H1a1 1 0 0 1-1-1V4a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v9.57a1 1 0 0 1-2 0V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14h10v-.43a1 1 0 0 1 2 0V19a1 1 0 0 1-1 1Z"/>
                  <path d="M7 17a3 3 0 0 1-3-3c0-2.35 2.06-4.47 2.29-4.71a1 1 0 0 1 1.414-.006l.006.006C7.94 9.53 10 11.65 10 14a3 3 0 0 1-3 3Zm0-5.44A4.64 4.64 0 0 0 6 14a1 1 0 0 0 2 0 4.64 4.64 0 0 0-1-2.44ZM15 15h-2a1 1 0 0 1 0-2h2a1 1 0 0 0 1-1V5a3 3 0 0 1 3-3 1 1 0 0 1 0 2 1 1 0 0 0-1 1v7a3 3 0 0 1-3 3Z"/>
                  <rect width="4" height="4" x="16" y="6" rx="1"/>
                  <path d="M9 7H5a1 1 0 0 1 0-2h4a1 1 0 0 1 0 2Z"/>
                </g>
              </svg>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 -tracking-[1.5px]">
                naftas
              </h1>
            </div>
            <div className="flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSuscripcionesOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
              >
                <Bookmark size={24} className="text-gray-600" />
                {suscripciones.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-stone-800 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {suscripciones.length}
                  </span>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Settings size={24} className="text-gray-600" />
              </motion.button>
            </div>
          </div>

          {/* Ubicación seleccionada */}
          <motion.div
            className="flex items-center justify-center mb-6 w-full"
          >
            <motion.button
              className="flex items-center space-x-2 px-4 py-2.5 text-stone-700 rounded-md border border-stone-200 bg-white text-sm border border-stone-200 transition-all"
              onClick={() => setIsSettingsOpen(true)}
              whileHover={{
                scale: 1.02,
                backgroundColor: "#f9fafb",
              }}
              whileTap={{
                scale: 0.98,
              }}
            >
              <Navigation size={18} className="text-stone-500" />
              {selectedZone ? (
                <p className="font-medium">Mostrando precios en <span className="font-bold text-stone-900">{selectedZone}</span></p>
              ) : (
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
              )}
              <ChevronRight size={16} className="text-stone-400 ml-1" />
            </motion.button>
          </motion.div>

          {/* Alerta de próximos aumentos */}
          {increasesData && Object.values(increasesData).some(info => 
            info.willBeIncrease && 
            isAfter(parseISO(info.dateOfIncrease), new Date())
          ) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 shadow-sm"
            >
              <div className="flex flex-col">
                {(() => {
                  // Verificar si todos los aumentos son iguales
                  const aumentos = Object.entries(increasesData)
                    .filter(([_, info]) => info.willBeIncrease)
                    .map(([_, info]) => info.increase);
                  
                  const fechas = Object.entries(increasesData)
                    .filter(([_, info]) => info.willBeIncrease)
                    .map(([_, info]) => info.dateOfIncrease);
                  
                  const todosIguales = aumentos.every(aumento => aumento === aumentos[0]) && 
                                      fechas.every(fecha => fecha === fechas[0]);
                  
                  const empresasConAumento = Object.entries(increasesData)
                    .filter(([_, info]) => info.willBeIncrease);
                  
                  if (todosIguales && empresasConAumento.length > 0) {
                    // Si todos los aumentos son iguales, mostrar un solo bloque
                    const [_, infoComun] = empresasConAumento[0];
                    const fecha = parseISO(infoComun.dateOfIncrease);
                    const formatoFecha = new Intl.DateTimeFormat('es-AR', { 
                      day: 'numeric', 
                      month: 'long'
                    }).format(fecha);
                    
                    return (
                      <>
                        <button 
                          className="flex items-center justify-between w-full p-1 rounded-lg "
                          onClick={() => {
                            const detalles = document.getElementById('detalles-aumento');
                            if (detalles) detalles.classList.toggle('hidden');
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
                            <h3 className="font-semibold text-amber-800">Próximos aumentos de precios</h3>
                          </div>
                          <ChevronRight size={20} className="text-amber-600" />
                        </button>
                        
                        <div id="detalles-aumento" className="hidden mt-3 p-4 bg-white rounded-lg border border-amber-100">
                          <p className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Todas las empresas</span> aumentarán sus precios un 
                            <span className="text-amber-600 font-bold"> +{infoComun.increase.toFixed(1)}%</span>
                          </p>
                          <p className="text-xs text-gray-600">A partir del {formatoFecha}</p>
                          
                          <div className="mt-3 pt-3 border-t border-amber-100">
                            <p className="text-xs text-gray-700 mb-1 font-medium">Empresas afectadas:</p>
                            <div className="flex flex-wrap gap-2">
                              {empresasConAumento.map(([empresa]) => (
                                <span key={empresa} className="text-xs bg-amber-50 px-2 py-1 rounded-full">
                                  {empresa}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  } else {
                    // Si los aumentos son diferentes, mostrar dropdown con detalles
                    return (
                      <>
                        <button 
                          className="flex items-center justify-between w-full p-3 bg-white rounded-lg border border-amber-100 shadow-sm"
                          onClick={() => {
                            const detalles = document.getElementById('detalles-aumento');
                            if (detalles) detalles.classList.toggle('hidden');
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
                            <h3 className="font-semibold text-amber-800">Próximos aumentos de precios</h3>
                          </div>
                          <ChevronRight size={20} className="text-amber-600" />
                        </button>
                        
                        <div id="detalles-aumento" className="hidden mt-3">
                          <div className="md:grid md:grid-cols-2 flex flex-col gap-3">
                            {Object.entries(increasesData).map(([empresa, info]) => {
                              if (!info.willBeIncrease) return null;
                              
                              const fecha = parseISO(info.dateOfIncrease);
                              const formatoFecha = new Intl.DateTimeFormat('es-AR', { 
                                day: 'numeric', 
                                month: 'long'
                              }).format(fecha);
                              
                              return (
                                <div key={empresa} className="bg-white rounded-md p-3 border border-amber-100 shadow-sm">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-gray-800">{empresa}</span>
                                    <span className="text-amber-600 font-bold text-sm">+{info.increase.toFixed(1)}%</span>
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    A partir del {formatoFecha}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  }
                })()}
              </div>
            </motion.div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              responseData && Object.entries(responseData).flatMap(([ciudad, ciudadData]) => {
                // Crear un array de empresas con sus indicadores
                const empresasConIndicador = Object.entries(ciudadData.empresas).map(([empresaNombre, empresa]) => {
                  const indicadorEmpresa = calcularIndicadorEmpresa(empresa, promedioGeneral, promedioFechaGeneral);
                  return { empresaNombre, empresa, indicadorEmpresa };
                });
                
                // Filtrar empresas con indicador menor a 25
                const empresasFiltradas = empresasConIndicador.filter(item => item.indicadorEmpresa >= 25);
                
                // Ordenar empresas por indicador (de mayor a menor)
                const empresasOrdenadas = empresasFiltradas.sort((a, b) => b.indicadorEmpresa - a.indicadorEmpresa);
                
                return empresasOrdenadas.map(({ empresaNombre, empresa, indicadorEmpresa }, i) => {
                  const colorIndicador = getColorIndicador(indicadorEmpresa);
                  
                  return (
                    <div
                      key={`${ciudad}-${empresaNombre}-${i}`}
                      className="bg-white rounded-lg p-6 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                            <Image
                              src={`/assets/${
                                empresaNombre.toLowerCase() === "shell c.a.p.s.a." ? "shell" : empresaNombre.toLowerCase()
                              }.jpg`}
                              alt=""
                              className="h-12 w-12 object-cover"
                              width={64}
                              height={64}
                            />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold text-gray-900">{empresaNombre}</h2>
                          </div>
                        </div>
                        <div className={`flex items-center space-x-1 ${colorIndicador}`}>
                          {indicadorEmpresa > 50 ? (
                            <TrendingUp size={16} />
                          ) : (
                            <TrendingDown size={16} />
                          )}
                          <span className="text-sm font-medium">
                            {indicadorEmpresa.toFixed(0)}
                          </span>
                        </div>
                      </div>

                      {Object.entries(empresa).map(([tipoCombustible, combustible], index) => (
                        <div key={tipoCombustible} className="mb-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">
                                {tipoCombustible}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                Actualizado {formatDateDistance(combustible.fecha_vigencia)}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-4 rounded flex items-center space-x-2 hover:bg-gray-50 transition-colors"
                                onClick={() => setSelectedFuel({
                                  isOpen: true,
                                  empresa: empresaNombre,
                                  combustible,
                                  tipoCombustible,
                                  ciudad
                                })}
                              >
                                <p className="font-medium text-medium text-gray-900 min-w-[5em] max-w-[5em]">${combustible.precio} /l</p>
                                <ChevronRight size={20} className="text-gray-400" />
                              </motion.button>
                            </div>
                          </div>
                          {index < Object.entries(empresa).length - 1 && (
                            <div className="border-t border-gray-100 my-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                });
              })
            )}
          </div>
        </div>
      </div>
      <div className="text-center text-stone-600">
        <p>Made by <Link href={'https://github.com/francopicc'} className="text-blue-500">Franco</Link></p>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onZoneChange={handleZoneChange}
        onData={setResponseData}
      />

      {selectedFuel.isOpen && selectedFuel.combustible && (
        <BottomSheet
          isOpen={selectedFuel.isOpen}
          onClose={() => setSelectedFuel({ 
            isOpen: false, 
            empresa: '', 
            combustible: null, 
            tipoCombustible: null, 
            ciudad: ''
          })}
          empresa={selectedFuel.empresa}
          combustible={selectedFuel.combustible}
          nombreCombustible={selectedFuel.combustible?.nombre_combustible || ''}
          ciudad={selectedFuel.ciudad}
          tipoCombustible={selectedFuel.tipoCombustible || ''}
          onSuscribe={(litros, total) => {
            if (selectedFuel.combustible && selectedFuel.tipoCombustible) {
              agregarSuscripcion(
                selectedFuel.empresa,
                selectedFuel.tipoCombustible,
                selectedFuel.combustible.precio,
                selectedFuel.combustible.fecha_vigencia,
                selectedFuel.ciudad,
                litros,
                total
              );
            }
          }}
          esSuscrito={selectedFuel.tipoCombustible ? 
            esSuscrito(selectedFuel.empresa, selectedFuel.tipoCombustible, selectedFuel.ciudad) : false}
        />
      )}

      <LocationRequestModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSet={(zone: string) => {
          setSelectedZone(zone);
          localStorage.setItem('userCity', zone);
          fetchData(zone);
        }}
        onLoading={setIsLoading}
      />

      {/* Panel de Suscripciones */}
      <AnimatePresence>
        {isSuscripcionesOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full md:w-96 bg-white shadow-lg z-50 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Guardados:</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSuscripcionesOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <X size={24} />
                </motion.button>
              </div>

              {suscripciones.length === 0 ? (
                <div className="text-center py-10">
                  <Bookmark size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No tienes combustibles guardados</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Guarda tus combustibles favoritos para seguir sus precios
                  </p>
                </div>
              ) : (
                <>
                  {getTotalSuscripciones() > 0 && (
                    <div className="mb-6 p-4 bg-stone-100 rounded-lg border border-stone-300">
                      <p className="font-medium text-stone-800 mb-1">Total estimado:</p>
                      <p className="text-2xl font-bold text-stone-900">${getTotalSuscripciones().toFixed(2)}</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {suscripciones.map((suscripcion) => {
                      const disponible = responseData && 
                        Object.values(responseData).some(ciudad => 
                          ciudad.empresas[suscripcion.empresa] && 
                          ciudad.empresas[suscripcion.empresa][suscripcion.tipoCombustible]
                        );
                      
                      return (
                        <motion.div
                          key={suscripcion.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className={`bg-white rounded-lg p-3 border ${disponible ? 'border-gray-200' : 'border-red-200'} relative`}
                        >
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => eliminarSuscripcion(suscripcion.id)}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
                          >
                            <X size={16} className="text-gray-400" />
                          </motion.button>
                          
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                            <Image
                              src={`/assets/${
                                suscripcion.empresa.toLowerCase() === "shell c.a.p.s.a." ? "shell" : suscripcion.empresa.toLowerCase()
                              }.jpg`}
                              alt=""
                              className="h-8 w-8 object-cover"
                              height={64} 
                              width={64} 
                            />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 text-sm">
                                {suscripcion.tipoCombustible}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {suscripcion.empresa}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <p className="text-lg font-semibold">${suscripcion.precio}/l</p>
                            {suscripcion.litros && (
                              <p className="text-sm text-gray-600 font-medium">{suscripcion.litros}L</p>
                            )}
                          </div>
                          
                          {suscripcion.total && (
                            <div className="mt-1 bg-gray-50 p-2 rounded flex justify-between items-center">
                              <span className="text-xs text-gray-500">Total:</span>
                              <span className="font-semibold">${suscripcion.total.toFixed(2)}</span>
                            </div>
                          )}
                          
                          {!disponible && (
                            <p className="text-xs text-red-500 mt-1">
                              No disponible en {selectedZone}
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}