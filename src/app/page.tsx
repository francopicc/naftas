"use client"

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Fuel, ChevronRight, ChevronDown, Check, Copy, TrendingUp, TrendingDown, Settings, X, Save } from 'lucide-react';

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

interface PromedioEmpresa {
  precioPromedio: number;
  fechaPromedioActualizacion: number;
}

interface NombresCombustibles {
  [key: string]: {
    [key: string]: string;
  } | string;
}

const SettingsModal = ({ isOpen, onClose, onZoneChange }: { isOpen: boolean, onClose: () => void, onZoneChange: (zone: string) => void }) => {
  const [zona, setZona] = useState('norte');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    onZoneChange(zona);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1000);
  };

  const content = (
    <div className="space-y-6">
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Zona de búsqueda
          </label>
          <motion.select
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            className="w-full appearance-none bg-white px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 -ml-1 focus:outline-none transition-all cursor-pointer"
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <option value="" disabled>Selecciona una zona</option>
            <option value="norte">Norte</option>
            <option value="sur">Sur</option>
            <option value="este" selected>Este</option>
            <option value="oeste">Oeste</option>
          </motion.select>
          <div className="absolute right-4 top-1/2 -mt-3 -translate-y-1/2 pointer-events-none text-gray-500">
            <ChevronDown size={20} />
          </div>
          <span className="block text-xs text-stone-400 mb-3 mt-1">
            Los precios entre provincias o zonas de la Argentina, suelen variar entre un 5% o 10%, por lo que para obtener datos mas precisos es necesario especificarlo.
          </span>
        </div>
      </motion.div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        disabled={isSaving || showSuccess}
        className="w-full py-3 px-4 bg-stone-800 text-white rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-stone-900 transition-colors disabled:opacity-50"
      >
        {isSaving ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Settings size={20} />
          </motion.div>
        ) : showSuccess ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
          >
            <Check size={20} />
          </motion.div>
        ) : (
          <>
            <Save size={20} />
            <span>Guardar cambios</span>
          </>
        )}
      </motion.button>
    </div>
  );

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
          {isMobile ? (
            // Bottom Sheet para móvil
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 500 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              {content}
            </motion.div>
          ) : (
            // Modal centrado para desktop
            <div className="fixed inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-white rounded-xl p-6 w-[90%] max-w-md shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
                  <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                {content}
              </motion.div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

const calcularIndicadorEmpresa = (estacion: Estacion, promedioGeneral: number, promedioFechaGeneral: number): number => {
  // Calcula promedio de precios de la estación
  let sumaPreciosEstacion = 0;
  let cantidadPrecios = 0;
  let sumaFechasActualizacion = 0;

  Object.values(estacion.precios).forEach(combustible => {
    sumaPreciosEstacion += combustible.precio;
    sumaFechasActualizacion += new Date(combustible.fechaVigencia).getTime();
    cantidadPrecios++;
  });

  const precioPromedioEstacion = sumaPreciosEstacion / cantidadPrecios;
  const fechaPromedioEstacion = sumaFechasActualizacion / cantidadPrecios;

  // Calcula puntaje por precio (60% del peso)
  const diferenciaPrecio = ((promedioGeneral - precioPromedioEstacion) / promedioGeneral) * 100;
  const puntajePrecio = 50 + (diferenciaPrecio * 2.5);
  const puntajePrecioAjustado = Math.max(0, Math.min(100, puntajePrecio)) * 0.6;

  // Calcula puntaje por actualización (40% del peso)
  const diferenciaFecha = (fechaPromedioEstacion - promedioFechaGeneral) / (1000 * 60 * 60 * 24); // diferencia en días
  const puntajeFecha = 50 + (diferenciaFecha * 3); // +10 puntos por día más reciente
  const puntajeFechaAjustado = Math.max(0, Math.min(100, puntajeFecha)) * 0.4;

  return puntajePrecioAjustado + puntajeFechaAjustado;
};

const getColorIndicador = (puntaje: number): string => {
  if (puntaje >= 50) return "text-green-400 bg-green-100 py-1 px-2 rounded";
  if (puntaje >= 40) return "text-yellow-500 bg-yellow-200 py-1 px-2 rounded";
  if (puntaje >= 20) return "text-orange-500 bg-orange-200 py-1 px-2 rounded";
  return "text-red-500";
};

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
  const [copiado, setCopiado] = useState(false);
  const total = parseFloat(litros) * combustible.precio || 0;

  const copiarAlPortapapeles = () => {
    navigator.clipboard.writeText(total.toFixed(2));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

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
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl p-6 space-y-6 md:w-1/2 md:mx-auto"
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
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">${total.toFixed(2)}</span>
                    <button
                      onClick={copiarAlPortapapeles}
                      className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                      title={copiado ? "¡Copiado!" : "Copiar al portapapeles"}
                    >
                      {copiado ? <Check size={20} className="text-gray-500" /> : <Copy size={20} className="text-gray-500" />}
                    </button>
                  </div>
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
  const [promedioGeneral, setPromedioGeneral] = useState<number>(0);
  const [promedioFechaGeneral, setPromedioFechaGeneral] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState('norte');
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
      setIsLoading(true);
      const response = await axios.get(`/api/precio-base?zona=${selectedZone}`);
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
    if (!responseData) return;
    
    let sumaPreciosTotal = 0;
    let cantidadPreciosTotal = 0;
    let sumaFechasTotal = 0;

    responseData.forEach((estacion: Estacion) => {
      Object.values(estacion.precios).forEach((combustible: Precio) => {
        sumaPreciosTotal += combustible.precio;
        sumaFechasTotal += new Date(combustible.fechaVigencia).getTime();
        cantidadPreciosTotal++;
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
    setSelectedZone(zone);
  };

  const SkeletonCard = () => (
    <div className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-10 w-10 rounded bg-gray-200"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="mb-4">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-gray-200 rounded"></div>
              <div className="h-2 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
          </div>
          {i < 5 && <div className="border-t border-gray-100 my-3" />}
        </div>
      ))}
    </div>
  );

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
              responseData && responseData.map((estacion: Estacion, i: number) => {
                const indicadorEmpresa = calcularIndicadorEmpresa(estacion, promedioGeneral, promedioFechaGeneral);
                const colorIndicador = getColorIndicador(indicadorEmpresa);
                
                return (
                  <div
                    key={i}
                    className="bg-white rounded-lg p-6 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-6">
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
                        <h2 className="text-xl font-semibold text-gray-900">{estacion.nombre}</h2>
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

                    {Object.entries(estacion.precios).map(([tipoCombustible, combustible]: [string, Precio], index: number) => (
                      <div key={tipoCombustible} className="mb-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">
                              {getNombreCombustible(parseInt(tipoCombustible), estacion.nombre)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Actualizado {formatDateDistance(combustible.fechaVigencia)}
                            </p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 rounded flex items-center space-x-2 hover:bg-gray-50 transition-colors"
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
                );
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
      />

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
