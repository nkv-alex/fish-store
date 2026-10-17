import Link from "next/link";

export function StoreHeader({ count = 0 }: { count?: number }) {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Pezcado, inicio">
        pez<span>c</span>ado
      </Link>
      <nav className="main-nav" aria-label="Navegación principal">
        <Link href="/#productos">Pescado</Link>
        <Link href="/orders">Pedidos</Link>
        <Link href="/#carrito">Carrito <span className="nav-count">{count}</span></Link>
      </nav>
      <Link className="account-link" href="/account">
        <span className="account-icon" aria-hidden="true">↗</span>
        <span>Cuenta</span>
      </Link>
    </header>
  );
}
