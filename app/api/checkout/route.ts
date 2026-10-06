import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function POST(req: Request) {
  try {
    const { nome, email } = await req.json();

    // 1. Criar ou buscar cliente
    let customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer) {
      customer = await prisma.customer.create({ data: { nome, email } });
    }

    // 2. Criar pedido pendente no banco
    const order = await prisma.order.create({
      data: {
        customer_id: customer.id,
        product: "Aprendizados do Velho",
        amount: 14.90,
        status: "pending"
      }
    });

    // 3. Gerar PIX no Gateway (Mercado Pago API)
    const pixResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PIX_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': order.id // Evita cobrança duplicada
      },
      body: JSON.stringify({
        transaction_amount: 14.90,
        description: "E-book: Aprendizados do Velho",
        payment_method_id: "pix",
        payer: { email: customer.email, first_name: customer.nome }
      })
    });

    const pixData = await pixResponse.json();

    // Se houver erro nas credenciais do Mercado Pago
    if (!pixData.id) {
      console.error("Erro Mercado Pago:", pixData);
      return NextResponse.json({ error: "Erro ao gerar PIX" }, { status: 400 });
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
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
