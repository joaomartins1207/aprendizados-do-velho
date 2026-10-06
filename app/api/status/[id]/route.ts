import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { downloads: true }
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      status: order.status,
      token: order.downloads.length > 0 ? order.downloads[0].download_token : null
    });
  } catch (error) {
    console.error('Erro em status:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}