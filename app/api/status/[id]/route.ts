import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDeliveryEmail } from '@/lib/email';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { downloads: true, customer: true }
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Se já foi pago, retorna o token de download
    if (order.status === 'paid') {
      const token = order.downloads.length > 0 ? order.downloads[0].download_token : null;
      return NextResponse.json({ status: 'paid', token });
    }

    // Se ainda está pendente, consulta ativamente a API do Mercado Pago
    if (order.payment_id) {
      let pixToken = (process.env.PIX_ACCESS_TOKEN || '').trim();
      if (
        (pixToken.startsWith('"') && pixToken.endsWith('"')) ||
        (pixToken.startsWith("'") && pixToken.endsWith("'"))
      ) {
        pixToken = pixToken.slice(1, -1).trim();
      }
      if (pixToken.toLowerCase().startsWith('bearer ')) {
        pixToken = pixToken.slice(7).trim();
      }
      if (pixToken.startsWith('PP_USR-')) {
        pixToken = 'A' + pixToken;
      }

      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${order.payment_id}`, {
          headers: { Authorization: `Bearer ${pixToken}` }
        });
        const mpData = await mpRes.json();

        if (mpData.status === 'approved') {
          // 1. Atualiza pedido para pago
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'paid', paid_at: new Date() }
          });

          // 2. Gera token de download (válido por 30 dias)
          const dataExpiracao = new Date();
          dataExpiracao.setDate(dataExpiracao.getDate() + 30);

          let download = order.downloads[0];
          if (!download) {
            download = await prisma.download.create({
              data: {
                order_id: order.id,
                email: order.customer.email,
                expires_at: dataExpiracao
              }
            });
          }

          // 3. Envia e-mail de entrega para o cliente
          await sendDeliveryEmail(order.customer.nome, order.customer.email, download.download_token);

          return NextResponse.json({
            status: 'paid',
            token: download.download_token
          });
        }
      } catch (mpErr) {
        console.error('Erro ao verificar status com Mercado Pago:', mpErr);
      }
    }

    return NextResponse.json({
      status: order.status,
      token: null
    });
  } catch (error) {
    console.error('Erro em status:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}