import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

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

    // 1. Se BOOK_PDF_URL externa estiver configurada, redireciona para ela
    if (process.env.BOOK_PDF_URL) {
      return NextResponse.redirect(process.env.BOOK_PDF_URL, { status: 302 });
    }

    // 2. Entrega o PDF empacotado no próprio projeto
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'files', 'Aprendizados_do_Velho.pdf'),
      path.join(process.cwd(), 'private', 'aprendizados-do-velho.pdf')
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="Aprendizados_do_Velho.pdf"'
          }
        });
      }
    }

    // 3. Fallback para rota estática da Vercel
    const origin = new URL(req.url).origin;
    return NextResponse.redirect(`${origin}/files/Aprendizados_do_Velho.pdf`, { status: 302 });

  } catch (error) {
    console.error('Erro no download:', error);
    return new NextResponse('Erro interno no servidor.', { status: 500 });
  }
}