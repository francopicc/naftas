"use client"

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Fuel, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Precio {
  precio: number;
  fechaVigencia: string;
}

interface Precios {
  [key: string]: Precio;
}

interface Estacion {
  nombre: string;
  precios: Precios;
}

interface PreciosPorCombustible {
  [key: string]: {
    total: number;
    count: number;
  };
}

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
      PUMA: "PUMA Diesel",
      GLOBAL: "GASOIL PREMIUM",
    },
    21: {
      YPF: "INFINIA DIESEL",
      "SHELL C.A.P.S.A.": "Shell V-Power Diesel",
      AXION: "QUANTIUM Diesel X10",
      PUMA: "ION PUMA Diesel",
      GLOBAL: "GASOIL",
    },
    6: "GNC",
    2: {
      YPF: "SUPER",
      "SHELL C.A.P.S.A.": "Shell Super",
      AXION: "Axion SUPER",
      PUMA: "PUMA Super",
      GLOBAL: "SUPER",
    },
    3: {
      YPF: "INFINIA",
      "SHELL C.A.P.S.A.": "Shell V-Power",
      AXION: "QUANTIUM",
      PUMA: "MAX Premium",
      GLOBAL: "PREMIUM",
    },
  };
  const tipoCombustibleKey = tipoCombustible.toString();

  if (nombresCombustibles[tipoCombustibleKey]) {
    if (typeof nombresCombustibles[tipoCombustibleKey] === "object") {
      const nombreEmpresa = (nombresCombustibles[tipoCombustibleKey] as {[key: string]: string})[empresa];
      return nombreEmpresa || "Tipo de Combustible Desconocido";
    } else {
      return nombresCombustibles[tipoCombustibleKey] as string;
    }
  } else {
    return "Tipo de Combustible Desconocido";
  }
};

const BottomSheet = ({ isOpen, onClose, estacion, combustible, tipoCombustible }: {
  isOpen: boolean;
  onClose: () => void;
  estacion: Estacion;
  combustible: Precio;
  tipoCombustible: string;
}) => {
  const [litros, setLitros] = useState('');
  const total = parseFloat(litros) * combustible.precio || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 500 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl p-6 space-y-6"
          >
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={`/assets/${
                    estacion.nombre.toLowerCase() === "shell c.a.p.s.a." ? "shell" : estacion.nombre.toLowerCase()
                  }.jpg`}
                  alt=""
                  className="h-12 w-12 object-cover"
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{estacion.nombre}</h2>
                <p className="text-gray-600">{getNombreCombustible(parseInt(tipoCombustible), estacion.nombre)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Litros de carga
                </label>
                <input
                  type="number"
                  value={litros}
                  onChange={(e) => setLitros(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ingrese cantidad de litros"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Precio por litro:</span>
                  <span className="font-medium">${combustible.precio}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total a pagar:</span>
                  <span className="text-xl font-bold">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default function Home() {
  const [responseData, setResponseData] = useState<Estacion[] | null>(null);
  const [precioPromedio, setPrecioPromedio] = useState<{[key: string]: number}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFuel, setSelectedFuel] = useState<{
    isOpen: boolean;
    estacion: Estacion | null;
    combustible: Precio | null;
    tipoCombustible: string | null;
  }>({
    isOpen: false,
    estacion: null,
    combustible: null,
    tipoCombustible: null
  });

  const fetchData = async () => {
    try {
      const response = await axios.get(`/api/precio-base`);
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
  }, []);

  const calcularPromedioPrecios = () => {
    if (!responseData) return;
    
    const preciosPorCombustible: PreciosPorCombustible = {};

    responseData.forEach((estacion: Estacion) => {
      Object.entries(estacion.precios).forEach(([tipoCombustible, combustible]: [string, Precio]) => {
        if (!preciosPorCombustible[tipoCombustible]) {
          preciosPorCombustible[tipoCombustible] = {
            total: 0,
            count: 0,
          };
        }
        preciosPorCombustible[tipoCombustible].total += combustible.precio;
        preciosPorCombustible[tipoCombustible].count++;
      });
    });

    const promedios: {[key: string]: number} = {};
    Object.entries(preciosPorCombustible).forEach(([tipoCombustible, data]) => {
      const promedio = data.total / data.count;
      promedios[tipoCombustible] = promedio;
    });

    setPrecioPromedio(promedios);
  };

  useEffect(() => {
    if (responseData) {
      calcularPromedioPrecios();
    }
  }, [responseData]);

  const SkeletonCard = () => (
    <div className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-10 w-10 rounded bg-gray-200"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-4">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-gray-200 rounded"></div>
              <div className="h-2 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
          </div>
          {i < 3 && <div className="border-t border-gray-100 my-3" />}
        </div>
      ))}
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
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

          <p className="text-gray-600 mb-8 text-lg leading-[1.5em]">
            Encontrá los precios más recientes de combustible para vehículos. Los precios pueden variar según los impuestos municipales.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              responseData && responseData.map((estacion: Estacion, i: number) => (
                <div
                  key={i}
                  className="bg-white rounded-lg p-6 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={`/assets/${
                          estacion.nombre.toLowerCase() === "shell c.a.p.s.a." ? "shell" : estacion.nombre.toLowerCase()
                        }.jpg`}
                        alt=""
                        className="h-12 w-12 object-cover"
                      />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">{estacion.nombre}</h2>
                  </div>

                  {Object.entries(estacion.precios).map(([tipoCombustible, combustible]: [string, Precio], index: number) => (
                    <div key={tipoCombustible} className="mb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">
                            {getNombreCombustible(parseInt(tipoCombustible), estacion.nombre)}
                          </p>
                          <div className="flex flex-row space-x-1">
                            <p className="text-sm text-gray-500 mt-1">
                              Actualizado {formatDateDistance(combustible.fechaVigencia)}
                            </p>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 -mt-7 rounded flex items-center space-x-2 hover:bg-gray-50 transition-colors"
                          onClick={() => setSelectedFuel({
                            isOpen: true,
                            estacion,
                            combustible,
                            tipoCombustible
                          })}
                        >
                          <p className="font-medium text-medium text-gray-900 min-w-[5em] max-w-[5em]">${combustible.precio} /l</p>
                          <ChevronRight size={20} className="text-gray-400" />
                        </motion.button>
                      </div>
                      {index < Object.entries(estacion.precios).length - 1 && (
                        <div className="border-t border-gray-100 my-4" />
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="text-center text-stone-600">
        <p>Made by <Link href={'https://github.com/francopicc'} className="text-blue-500">Franco</Link></p>
      </div>

      {selectedFuel.isOpen && selectedFuel.estacion && selectedFuel.combustible && selectedFuel.tipoCombustible && (
        <BottomSheet
          isOpen={selectedFuel.isOpen}
          onClose={() => setSelectedFuel({ isOpen: false, estacion: null, combustible: null, tipoCombustible: null })}
          estacion={selectedFuel.estacion}
          combustible={selectedFuel.combustible}
          tipoCombustible={selectedFuel.tipoCombustible}
        />
      )}
    </main>
  );
}
