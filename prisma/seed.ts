import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";

const products = [
  {
    name: "Salmón de autor",
    description: "Criado en libertad. La libertad de no hacer preguntas.",
    price: 3200,
  },
  {
    name: "Pez globo con cláusula",
    description: "Inflado de orgullo y de procedencia poco concreta.",
    price: 2400,
  },
  {
    name: "El rojo del día",
    description: "Dice venir del mar. No especifica cuál.",
    price: 2800,
  },
  {
    name: "Lubina con marca de agua",
    description: "La marca de agua es la única parte de origen confirmado.",
    price: 2600,
  },
  {
    name: "Espectro fluorescente",
    description: "Brilla por méritos propios. Eso nos han dicho.",
    price: 3500,
  },
  {
    name: "Pez morado anónimo",
    description: "Su identidad está protegida por la marea.",
    price: 2200,
  },
  {
    name: "Azul de buena familia",
    description: "Tiene contactos en alta mar.",
    price: 3000,
  },
  {
    name: "El que no quiso posar",
    description: "Capturado justo antes de que pudiera dar su versión.",
    price: 2500,
  },
  {
    name: "Plata de ley",
    description: "Paga en plata; cuenta en monedas.",
    price: 2900,
  },
  {
    name: "El de traje elegante",
    description: "Traje de gala para una cena de martes.",
    price: 3300,
  },
  {
    name: "El de la foto corporativa",
    description: "La foto de equipo del departamento de pesca.",
    price: 1800,
  },
  {
    name: "Rayas de alto standing",
    description: "Las rayas no son prueba de trazabilidad.",
    price: 3400,
  },
  {
    name: "El serio",
    description: "Parece serio. No hemos podido confirmar nada más.",
    price: 3100,
  },
  {
    name: "Neón de medianoche",
    description: "Se recomienda no pedirle el número de serie.",
    price: 3600,
  },
  {
    name: "La captura transparente",
    description: "Transparencia: producto parcialmente visible.",
    price: 2700,
  },
  {
    name: "El banco completo",
    description: "Multitud de peces, una sola factura.",
    price: 3900,
  },
  {
    name: "Limón marino",
    description: "Amarillo natural, según una fuente interesada.",
    price: 2500,
  },
  {
    name: "Naranja de temporada",
    description: "De temporada. La temporada es un secreto.",
    price: 2800,
  },
  {
    name: "El certificado",
    description: "La marca de agua vuelve a aparecer. Empieza a ser sospechoso.",
    price: 2300,
  },
].map((product, index) => {
  const catchNumber = String(index + 1).padStart(2, "0");

  return {
    ...product,
    slug: `captura-${catchNumber}`,
    imageUrl: `/peces/captura-${catchNumber}.png`,
  };
});

async function main() {
  const prisma = getPrisma();
  try {
    await prisma.product.updateMany({
      where: { slug: { in: ["ocean-blue-tee", "coastal-tote", "sunset-cap"] } },
      data: { isActive: false },
    });

    for (const product of products) {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: product,
        create: product,
      });
    }

    console.info(`Seeded ${products.length} fish products.`);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  });
