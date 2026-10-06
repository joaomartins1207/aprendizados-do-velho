export async function sendDeliveryEmail(nome: string, email: string, token: string) {
  const apiKey = (process.env.EMAIL_API_KEY || '').trim();
  const from = (process.env.EMAIL_FROM || '').trim();

  if (!apiKey || !from) {
    console.log('[Email] EMAIL_API_KEY ou EMAIL_FROM não configurados. Pulando envio de e-mail.');
    return;
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://aprendizados-do-velho.vercel.app').replace(/\/$/, '');
  const downloadLink = `${siteUrl}/api/download/${token}`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: 'Seu E-book: Aprendizados do Velho está disponível 📖',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #222; background-color: #faf8f5; border-radius: 8px;">
            <h1 style="color: #4a2810; margin-bottom: 8px;">Obrigado pela sua compra!</h1>
            <p style="font-size: 16px; line-height: 1.5; color: #555;">
              Olá, <strong>${nome}</strong>.<br><br>
              Seu exemplar de <strong>Aprendizados do Velho</strong> já foi liberado e está pronto para leitura.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${downloadLink}" style="background-color: #D4AF37; color: #241408; font-weight: bold; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-size: 18px; display: inline-block; box-shadow: 0 4px 12px rgba(212,175,55,0.3);">
                📖 Abrir Meu E-book
              </a>
            </div>
            <p style="font-size: 14px; color: #777; line-height: 1.4;">
              Caso o botão acima não funcione, você também pode copiar e colar o link abaixo no seu navegador:<br>
              <a href="${downloadLink}" style="color: #8b5a2b; word-break: break-all;">${downloadLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e0d8cc; margin: 28px 0;" />
            <p style="font-size: 13px; color: #999; text-align: center;">
              Aprendizados do Velho · Este link tem validade de 30 dias.
            </p>
          </div>
        `
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn('[Email] Erro ao enviar pelo Resend:', data);
    } else {
      console.log('[Email] E-mail de entrega enviado com sucesso! ID:', data.id);
    }
  } catch (err) {
    console.error('[Email] Falha de conexão ao enviar e-mail:', err);
  }
}
