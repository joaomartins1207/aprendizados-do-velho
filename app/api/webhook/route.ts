import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDeliveryEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    let topic = url.searchParams.get('topic') || url.searchParams.get('type');
    let paymentId = url.searchParams.get('data.id') || url.searchParams.get('id');

    // Suporta notificações do Mercado Pago via Body JSON (Webhooks v2)
    if (!paymentId) {
      try {
        const body = await req.json();
        topic = body.type || body.action || topic;
        paymentId = body.data?.id?.toString() || body.id?.toString() || paymentId;
      } catch {
        // Body não enviado ou não é JSON
      }
    }

    if (paymentId) {
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

      // Verifica o status real do pagamento na API oficial do Mercado Pago por segurança
      const mPagoRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${pixToken}` }
      });
      const mPagoData = await mPagoRes.json();

      if (mPagoData.status === 'approved') {
        const order = await prisma.order.findUnique({
          where: { payment_id: paymentId.toString() },
          include: { customer: true, downloads: true }
        });

        if (order && order.status !== 'paid') {
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
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json({ error: 'Erro no webhook' }, { status: 500 });
  }
}
