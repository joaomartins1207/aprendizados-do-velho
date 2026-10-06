const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Carrega .env manualmente se existir
const envPath = path.join(__dirname, '..', '.env');
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
  if (match) dbUrl = match[1];
}

const isPostgres = dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'));

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

const schemaContent = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "${isPostgres ? 'postgresql' : 'sqlite'}"
  url       = env("DATABASE_URL")${isPostgres ? '\n  directUrl = env("DIRECT_URL")' : ''}
}

model Customer {
  id         String   @id @default(uuid())
  nome       String
  email      String   @unique
  created_at DateTime @default(now())
  orders     Order[]
}

model Order {
  id          String     @id @default(uuid())
  customer_id String
  product     String
  amount      Float
  status      String     @default("pending")
  payment_id  String?    @unique
  created_at  DateTime   @default(now())
  paid_at     DateTime?
  customer    Customer   @relation(fields: [customer_id], references: [id])
  downloads   Download[]
}

model Download {
  id             String   @id @default(uuid())
  order_id       String
  email          String
  download_token String   @unique @default(uuid())
  expires_at     DateTime
  created_at     DateTime @default(now())
  order          Order    @relation(fields: [order_id], references: [id])
}
`;

fs.writeFileSync(schemaPath, schemaContent, 'utf8');
console.log(`[prepare-db] Prisma configurado para: ${isPostgres ? 'PostgreSQL (Produção/Neon)' : 'SQLite (Local)'}`);

try {
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (err) {
  console.error('[prepare-db] Erro ao gerar cliente prisma:', err.message);
  process.exit(1);
}
