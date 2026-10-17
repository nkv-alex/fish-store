import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";

const products = [
  {
    slug: "ocean-blue-tee",
    name: "Ocean Blue Tee",
    description: "Una camiseta de algodón orgánico para los días junto al mar.",
    imageUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",
    price: 3200,
  },
  {
    slug: "coastal-tote",
    name: "Coastal Tote",
    description: "Bolsa resistente de lona reciclada, lista para cualquier escapada.",
    imageUrl:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85",
    price: 2400,
  },
  {
    slug: "sunset-cap",
    name: "Sunset Cap",
    description: "Gorra ligera de perfil bajo en un cálido tono coral.",
    imageUrl:
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85",
    price: 2800,
  },
];

async function main() {
  const prisma = getPrisma();
  try {
    for (const product of products) {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: product,
        create: product,
      });
    }

    console.info(`Seeded ${products.length} products.`);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  });
