'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [status, setStatus] = useState('pending');
  const [downloadToken, setDownloadToken] = useState<string | null>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.details ? `${data.error}: ${data.details}` : data.error);
      } else {
        setPixData(data);
      }
    } catch (err: any) {
      alert(`Erro de conexão: ${err?.message || 'Tente novamente.'}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!pixData?.orderId || status === 'paid') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${pixData.orderId}`);
        const data = await res.json();
        if (data.status === 'paid') {
          setStatus('paid');
          setDownloadToken(data.token);
        }
      } catch {
        console.error('Erro ao verificar status');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [pixData, status]);

  const copiarPix = () => {
    navigator.clipboard.writeText(pixData.qrCodeCopiaECola);
    alert('Código PIX copiado! Abra o aplicativo do seu banco e cole na área de Pix.');
  };

  return (
    <div>

      {/* HERO */}
      <header className="hero">
        <div className="hero-badge">✦ E-book Digital</div>
        <h1 className="hero-title">
          Aprendizados<br />
          <em>do Velho</em>
        </h1>
        <p className="hero-subtitle">
          "75 anos de histórias, erros e aprendizados que eu gostaria de ter descoberto antes."
        </p>
        <div className="hero-features">
          <div className="hero-feature-pill"><span>📖</span> E-book em PDF</div>
          <div className="hero-feature-pill"><span>⚡</span> Acesso imediato</div>
          <div className="hero-feature-pill"><span>💰</span> Apenas R$ 14,90</div>
        </div>
        <div className="hero-cta">
          <a href="#comprar" className="btn-primary">Quero meu livro — R$ 14,90</a>
          <p className="hero-price-hint">Pagamento único · Receba na hora · Leia em qualquer dispositivo</p>
        </div>
        <div className="scroll-indicator"><span /></div>
      </header>

      {/* SOBRE */}
      <section className="section-sobre">
        <p className="section-label">A história por trás do livro</p>
        <div className="gold-divider" style={{ marginBottom: '28px' }} />
        <h2 className="section-title">
          Algumas coisas a gente<br />só aprende vivendo.
        </h2>
        <div className="gold-divider" style={{ margin: '28px auto' }} />
        <p className="section-text">
          Durante 75 anos, Augusto viveu, errou, acertou, perdeu pessoas, fez escolhas e aprendeu
          lições que gostaria de ter conhecido muito antes.
          <br /><br />
          Este livro reúne essas experiências de uma maneira simples, direta e fácil de ler.
        </p>
      </section>

      {/* CONTEÚDO */}
      <section className="section-content">
        <div className="inner">
          <p className="section-label">O que você vai encontrar</p>
          <h2 className="section-title">Cinco capítulos que mudam a forma de ver a vida</h2>
          <div className="content-grid">
            {[
              { icon: '💰', label: 'Dinheiro e escolhas' },
              { icon: '❤️', label: 'Amor e relacionamentos' },
              { icon: '💼', label: 'Trabalho e propósito' },
              { icon: '⏳', label: 'Tempo e arrependimentos' },
              { icon: '🧠', label: 'Lições da vida' },
            ].map(({ icon, label }) => (
              <div key={label} className="content-card">
                <span className="card-icon">{icon}</span>
                <span className="card-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CITAÇÕES */}
      <section className="section-quotes">
        <div className="quotes-inner">
          {[
            'Você não está atrasado. Está apenas vivendo o seu próprio caminho.',
            'Dinheiro compra conforto. Mas não compra de volta o tempo que você desperdiçou.',
            'Nem todo mundo que começa com você vai chegar até o fim.',
            'Alguns arrependimentos vêm justamente daquilo que tivemos medo de fazer.',
          ].map((q) => (
            <div key={q} className="quote-item">
              <p className="quote-text">{q}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CHECKOUT */}
      <section id="comprar" className="section-checkout">
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p className="section-label">Adquira agora</p>
          <h2 className="section-title" style={{ margin: '0 auto' }}>Garanta o seu exemplar</h2>
        </div>
        <div className="checkout-card">
          <div className="checkout-card-header">
            <p className="book-title">Aprendizados do Velho</p>
            <p className="book-type">E-book Digital · PDF</p>
            <p className="price-tag"><sup>R$</sup>14,90</p>
            <p className="price-note">Pagamento único · Acesso imediato após confirmação</p>
          </div>
          <div className="checkout-card-body">
            {!pixData ? (
              <form onSubmit={handleCheckout}>
                <div className="form-group">
                  <label className="form-label" htmlFor="nome">Seu Nome Completo</label>
                  <input
                    id="nome" required type="text" value={nome}
                    onChange={e => setNome(e.target.value)}
                    className="form-input" placeholder="Ex: João da Silva"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Seu E-mail</label>
                  <input
                    id="email" required type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="form-input" placeholder="Onde você vai receber o livro"
                  />
                </div>
                <button id="btn-comprar" type="submit" disabled={loading} className="btn-checkout">
                  {loading ? <><span className="spinner" />Gerando PIX...</> : 'Comprar Agora — R$ 14,90'}
                </button>
                <div className="secure-badges">
                  <span className="secure-badge">🔒 Pagamento seguro</span>
                  <span className="secure-badge">⚡ Entrega imediata</span>
                  <span className="secure-badge">📱 Leia em qualquer tela</span>
                </div>
              </form>
            ) : status === 'pending' ? (
              <div className="pix-screen">
                <h3 className="pix-title">Aguardando pagamento</h3>
                <p className="pix-subtitle">
                  Abra o aplicativo do seu banco e escaneie o código<br />
                  ou clique em <strong>Copiar PIX</strong> abaixo.
                </p>
                {pixData.qrCodeBase64 && (
                  <div className="pix-qr-wrapper">
                    <img src={`data:image/jpeg;base64,${pixData.qrCodeBase64}`} alt="QR Code PIX" />
                  </div>
                )}
                <button id="btn-copiar-pix" onClick={copiarPix} className="btn-copy-pix">
                  📋 Copiar código PIX
                </button>
                <div className="pix-info-banner">
                  <span>✅</span>
                  <span>Assim que o pagamento for confirmado, seu livro será liberado automaticamente nesta tela.</span>
                </div>
              </div>
            ) : (
              <div className="success-screen">
                <span className="success-icon">🎉</span>
                <h3 className="success-title">Pagamento confirmado!</h3>
                <p className="success-subtitle">
                  Seu livro está pronto para leitura.<br />
                  Enviamos também uma cópia do acesso para o seu e-mail.
                </p>
                {downloadToken && (
                  <a
                    id="btn-abrir-livro"
                    href={`/api/download/${downloadToken}`}
                    target="_blank" rel="noreferrer"
                    className="btn-download"
                  >
                    📖 Abrir Meu Livro
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-faq">
        <div className="inner">
          <p className="section-label">Perguntas frequentes</p>
          <h2 className="section-title" style={{ margin: '0 auto' }}>Ficou com dúvidas?</h2>
          <div className="faq-list">
            {[
              { q: 'É um livro físico?', a: 'Não. É um e-book digital em formato PDF para você ler na tela do celular, tablet ou computador.' },
              { q: 'Como vou receber?', a: 'Após a confirmação do pagamento, o acesso é liberado automaticamente aqui na tela e também enviado para o seu e-mail.' },
              { q: 'Posso ler pelo celular?', a: 'Sim! Você pode ler pelo celular, tablet ou computador, de forma muito prática e confortável.' },
            ].map(({ q, a }) => (
              <div key={q} className="faq-item">
                <p className="faq-question">
                  <span className="faq-q-badge">?</span>
                  {q}
                </p>
                <p className="faq-answer">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p className="footer-brand">Aprendizados do Velho</p>
        <p className="footer-tagline">E-book digital · R$ 14,90</p>
        <p className="footer-disclaimer">
          Augusto é um personagem fictício criado para representar as histórias e reflexões presentes no livro.
        </p>
        <div className="footer-links">
          <a href="#">Política de Privacidade</a>
          <a href="#">Termos de Uso</a>
        </div>
      </footer>

    </div>
  );
}
