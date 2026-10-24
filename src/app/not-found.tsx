import type { Metadata } from "next";
import NotFoundPage from "./not-found-page";

export const metadata: Metadata = {
  title: "Página no encontrada | Pezcado",
};

export default function NotFound() {
  return <NotFoundPage />;
}
