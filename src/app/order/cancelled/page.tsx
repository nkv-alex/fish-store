import Link from "next/link";

export default function CancelledPage() {
  return (
    <main className="confirmation">
      <a className="brand" href="/">marea<span>.</span></a>
      <div className="confirmation-mark muted">↶</div>
      <p className="eyebrow">SIN PRISA</p>
      <h1>Lo dejamos<br />para después.</h1>
      <p className="confirmation-copy">No se ha realizado ningún cargo. Puedes volver a explorar la colección cuando quieras.</p>
      <Link className="checkout-button back-link" href="/">Volver a la tienda</Link>
    </main>
  );
}
