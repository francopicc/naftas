export const getColorIndicador = (puntaje: number): string => {
    if (puntaje >= 50) return "text-green-400 bg-green-100 py-1 px-2 rounded";
    if (puntaje >= 40) return "text-yellow-500 bg-yellow-200 py-1 px-2 rounded";
    if (puntaje >= 20) return "text-orange-500 bg-orange-200 py-1 px-2 rounded";
    return "text-red-500";
};