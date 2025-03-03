import { NextResponse } from 'next/server';

// Configuración para revalidación cada 20 días (en segundos)
export const revalidate = 60 * 60 * 24 * 20; // 20 días en segundos

export async function GET() {
  try {
    const response = await fetch(
      'https://magicloops.dev/api/loop/e55875c3-65a5-4f90-8e31-fb8b7c0311e5/run',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        next: { 
          revalidate: 60 * 60 * 24 * 20 // 20 días en segundos
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error en la solicitud: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error al obtener datos de aumentos:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de aumentos' },
      { status: 500 }
    );
  }
}

