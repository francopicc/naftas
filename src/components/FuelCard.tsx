import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Combustible {
  precio: number;
  fecha_vigencia: string;
  nombre_combustible: string;
}

interface Empresa {
  [combustible: string]: Combustible;
}

interface FuelCardProps {
  empresaNombre: string;
  empresa: Empresa;
  ciudad: string;
  indicadorEmpresa: number;
  onFuelSelect: (params: {
    empresa: string;
    combustible: Combustible;
    tipoCombustible: string;
    ciudad: string;
  }) => void;
}

const formatDateDistance = (dateString: string): string => {
  const date = parseISO(dateString);
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
};

const getColorIndicador = (puntaje: number): string => {
  if (puntaje >= 50) return "text-green-400 bg-green-100 py-1 px-2 rounded";
  if (puntaje >= 40) return "text-yellow-500 bg-yellow-200 py-1 px-2 rounded";
  if (puntaje >= 20) return "text-orange-500 bg-orange-200 py-1 px-2 rounded";
  return "text-red-500";
};

const FuelCard = ({ empresaNombre, empresa, ciudad, indicadorEmpresa, onFuelSelect }: FuelCardProps) => {
  const colorIndicador = getColorIndicador(indicadorEmpresa);

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
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
              onClick={() => onFuelSelect({
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
          {index < Object.entries(empresa).length - 1 && (
            <div className="border-t border-gray-100 my-4" />
          )}
        </div>
      ))}
    </div>
  );
};

export default FuelCard;