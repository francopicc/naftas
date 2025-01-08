"use client"

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Settings, ChevronRight } from 'lucide-react';
import BottomSheet from "@/components/BottomSheet";
import SettingsModal from "@/components/SettingsModal";
import SkeletonCard from "@/components/SkeletonCard";

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

const calcularIndicadorEmpresa = (empresa: Empresa, promedioGeneral: number, promedioFechaGeneral: number): number => {
  let sumaPreciosEmpresa = 0;
  let cantidadPrecios = 0;
  let sumaFechasActualizacion = 0;

  Object.entries(empresa).forEach(([_, combustible]) => {
    sumaPreciosEmpresa += combustible.precio;
    sumaFechasActualizacion += new Date(combustible.fecha_vigencia).getTime();
    cantidadPrecios++;
  });

  const precioPromedioEmpresa = sumaPreciosEmpresa / cantidadPrecios;
  const fechaPromedioEmpresa = sumaFechasActualizacion / cantidadPrecios;

  const diferenciaPrecio = ((promedioGeneral - precioPromedioEmpresa) / promedioGeneral) * 100;
  const puntajePrecio = 50 + (diferenciaPrecio * 2.5);
  const puntajePrecioAjustado = Math.max(0, Math.min(100, puntajePrecio)) * 0.6;

  const diferenciaFecha = (fechaPromedioEmpresa - promedioFechaGeneral) / (1000 * 60 * 60 * 24);
  const puntajeFecha = 50 + (diferenciaFecha * 3);
  const puntajeFechaAjustado = Math.max(0, Math.min(100, puntajeFecha)) * 0.5;

  return puntajePrecioAjustado + puntajeFechaAjustado;
};

const getColorIndicador = (puntaje: number): string => {
  if (puntaje >= 50) return "text-green-400 bg-green-100 py-1 px-2 rounded";
  if (puntaje >= 40) return "text-yellow-500 bg-yellow-200 py-1 px-2 rounded";
  if (puntaje >= 20) return "text-orange-500 bg-orange-200 py-1 px-2 rounded";
  return "text-red-500";
};

export default function Home() {
  const [responseData, setResponseData] = useState<APIResponse | null>(null);
  const [promedioGeneral, setPromedioGeneral] = useState<number>(0);
  const [promedioFechaGeneral, setPromedioFechaGeneral] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState("BERISSO");
  const [selectedFuel, setSelectedFuel] = useState<SelectedFuel>({
    isOpen: false, 
    empresa: '', 
    combustible: null, 
    tipoCombustible: null, 
    ciudad: '' // Asegúrate de que esta propiedad esté incluida
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/precio-base?ciudad=${selectedZone}`);
      setResponseData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateDistance = (dateString: string): string => {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  };

  useEffect(() => {
    fetchData();
  }, [selectedZone]);

  const calcularPromediosGenerales = () => {
    if (!responseData || !Object.keys(responseData).length) return;
    
    let sumaPreciosTotal = 0;
    let cantidadPreciosTotal = 0;
    let sumaFechasTotal = 0;

    // Iteramos sobre todas las ciudades en la zona
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
  }, [responseData]);

  const handleZoneChange = (zone: string) => {
    setSelectedZone("BERISSO");
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
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Settings size={24} className="text-gray-600" />
            </motion.button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              responseData && Object.entries(responseData).flatMap(([ciudad, ciudadData]) =>
                Object.entries(ciudadData.empresas).map(([empresaNombre, empresa], i) => {
                  const indicadorEmpresa = calcularIndicadorEmpresa(empresa, promedioGeneral, promedioFechaGeneral);
                  const colorIndicador = getColorIndicador(indicadorEmpresa);
                  
                  return (
                    <div
                      key={`${ciudad}-${empresaNombre}-${i}`}
                      className="bg-white rounded-lg p-6 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                            <img
                              src={`/assets/${
                                empresaNombre.toLowerCase() === "shell c.a.p.s.a." ? "shell" : empresaNombre.toLowerCase()
                              }.jpg`}
                              alt=""
                              className="h-12 w-12 object-cover"
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
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="px-4 rounded flex items-center space-x-2 hover:bg-gray-50 transition-colors"
                              onClick={() => setSelectedFuel({
                                isOpen: true,
                                empresa: empresaNombre, // Asegúrate de que esta variable esté definida
                                combustible,
                                tipoCombustible,
                                ciudad: selectedFuel.ciudad || '' // Asegúrate de que esta propiedad esté incluida
                              })}
                            >
                              <p className="font-medium text-medium text-gray-900 min-w-[5em] max-w-[5em]">${combustible.precio} /l</p>
                              <ChevronRight size={20} className="text-gray-400" />
                            </motion.button>
                          </div>
                          {index < Object.entries(empresa).length - 1 && (
                            <div className="border-t border-gray-100 my-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })
              )
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
      />

      {selectedFuel.isOpen && selectedFuel.combustible && (
        <BottomSheet
          isOpen={selectedFuel.isOpen}
          onClose={() => setSelectedFuel({ 
            isOpen: false, 
            empresa: '', 
            combustible: null, 
            tipoCombustible: null, 
            ciudad: '' // Asegúrate de que esta propiedad esté incluida
          })}
          empresa={selectedFuel.empresa}
          combustible={selectedFuel.combustible}
          nombreCombustible={selectedFuel.combustible?.nombre_combustible || ''} // Asegúrate de que esta propiedad exista
          ciudad={selectedFuel.ciudad || ''} // Asegúrate de que esta propiedad exista
          tipoCombustible={selectedFuel.tipoCombustible || ''}
        />
      )}
    </main>
  );
}