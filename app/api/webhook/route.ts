import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      // Verifica o status real do pagamento na API oficial do Mercado Pago por segurança
      const mPagoRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.PIX_ACCESS_TOKEN}` }
      });
      const mPagoData = await mPagoRes.json();

      if (mPagoData.status === 'approved') {
        const order = await prisma.order.findUnique({
          where: { payment_id: paymentId.toString() },
          include: { customer: true }
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

          const download = await prisma.download.create({
            data: {
              order_id: order.id,
              email: order.customer.email,
              expires_at: dataExpiracao
            }
          });

          // 3. Envia E-mail de entrega via Resend (se as credenciais existirem)
          if (process.env.EMAIL_API_KEY && process.env.EMAIL_FROM) {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
            const downloadLink = `${siteUrl}/api/download/${download.download_token}`;

            try {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: process.env.EMAIL_FROM,
                  to: order.customer.email,
                  subject: 'Seu Aprendizados do Velho está pronto 📖',
                  html: `<p>Olá, ${order.customer.nome}.</p>
                         <p>Obrigado pela sua compra! Seu exemplar já está disponível.</p>
                         <p><a href="${downloadLink}" style="padding: 15px 30px; background-color: #D4AF37; color: #fff; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block; margin-top: 10px;">ABRIR MEU LIVRO</a></p>
                         <p>Boa leitura!<br>— Augusto</p>`
                })
              });
            } catch (emailErr) {
              console.error('Erro ao enviar e-mail:', emailErr);
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json({ error: 'Erro no webhook' }, { status: 500 });
  }
}
