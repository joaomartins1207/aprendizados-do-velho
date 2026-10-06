import './globals.css';

export const metadata = {
  title: 'Aprendizados do Velho — E-book por R$ 14,90',
  description: '75 anos de histórias, erros e aprendizados que eu gostaria de ter descoberto antes. Um e-book sincero sobre dinheiro, amor, trabalho e as coisas que realmente importam.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
