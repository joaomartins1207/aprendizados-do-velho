import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const download = await prisma.download.findUnique({
      where: { download_token: token }
    });

    if (!download) {
      return new NextResponse('Link inválido ou não encontrado.', { status: 404 });
    }

    if (new Date() > download.expires_at) {
      return new NextResponse('Este link de download expirou.', { status: 410 });
    }

    // URL pública ou de armazenamento na nuvem (Cloudflare R2, Google Drive, AWS S3, etc.)
    const pdfUrl = process.env.BOOK_PDF_URL;

    if (!pdfUrl) {
      console.error('BOOK_PDF_URL não configurado no .env');
      return new NextResponse('Arquivo não disponível. Contate o suporte.', { status: 503 });
    }

    // Redireciona para o arquivo de download seguro
    return NextResponse.redirect(pdfUrl, { status: 302 });
  } catch (error) {
    console.error('Erro no download:', error);
    return new NextResponse('Erro interno no servidor.', { status: 500 });
  }
}