import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { nome, email } = await req.json();

    if (!nome || !email) {
      return NextResponse.json(
        { error: 'Nome e e-mail são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL não configurada no ambiente.');
      return NextResponse.json(
        { error: 'Configuração incompleta', details: 'A variável DATABASE_URL não foi definida na Vercel.' },
        { status: 500 }
      );
    }

    // Sanitiza o token do Mercado Pago
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

    if (!pixToken) {
      console.error('PIX_ACCESS_TOKEN não configurado no ambiente.');
      return NextResponse.json(
        { error: 'Configuração incompleta', details: 'A variável PIX_ACCESS_TOKEN está vazia ou ausente na Vercel.' },
        { status: 500 }
      );
    }

    // 1. Criar ou buscar cliente
    let customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer) {
      customer = await prisma.customer.create({ data: { nome, email } });
    }

    // 2. Criar pedido pendente no banco
    const order = await prisma.order.create({
      data: {
        customer_id: customer.id,
        product: 'Aprendizados do Velho',
        amount: 14.90,
        status: 'pending'
      }
    });

    // 3. Gerar PIX no Gateway (Mercado Pago API)
    const pixResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pixToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': order.id
      },
      body: JSON.stringify({
        transaction_amount: 14.90,
        description: 'E-book: Aprendizados do Velho',
        payment_method_id: 'pix',
        payer: { email: customer.email, first_name: customer.nome }
      })
    });

    const pixData = await pixResponse.json();

    if (!pixData.id) {
      console.error('Erro Mercado Pago:', pixData);
      return NextResponse.json(
        {
          error: 'Erro ao gerar PIX',
          details: pixData.message || JSON.stringify(pixData),
          debug: {
            tokenPrefix: pixToken.slice(0, 12),
            tokenLength: pixToken.length
          }
        },
        { status: 400 }
      );
    }

    // 4. Salvar o ID do pagamento no pedido
    await prisma.order.update({
      where: { id: order.id },
      data: { payment_id: pixData.id.toString() }
    });

    // 5. Retornar QR Code e Pix Copia e Cola para a tela
    return NextResponse.json({
      orderId: order.id,
      qrCodeBase64: pixData.point_of_interaction?.transaction_data?.qr_code_base64,
      qrCodeCopiaECola: pixData.point_of_interaction?.transaction_data?.qr_code
    });

  } catch (error) {
    console.error('Erro no checkout:', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Erro interno', details },
      { status: 500 }
    );
  }
}
