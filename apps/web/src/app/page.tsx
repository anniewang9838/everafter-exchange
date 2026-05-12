import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b border-taupe-300 bg-white px-6 py-4">
        <span className="font-serif text-xl text-sage-600">EverAfterExchange</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm">Log in</Link>
          <Link href="/signup" className="btn-primary text-sm">Sign up</Link>
        </div>
      </nav>

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-sage-500">
          Secondhand wedding décor
        </p>
        <h1 className="mb-6 max-w-2xl font-serif text-4xl font-light leading-tight text-stone-800 sm:text-5xl">
          Your wedding style, reimagined
        </h1>
        <p className="mb-10 max-w-lg text-base leading-relaxed text-stone-500">
          Curated bundles from real weddings. Trusted sellers. Coordinated local pickups.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/signup?intent=buy" className="btn-primary px-8 py-3">Browse listings</Link>
          <Link href="/signup?intent=sell" className="btn-ghost px-8 py-3">Start selling</Link>
        </div>
      </section>

      <section className="border-t border-taupe-300 bg-white px-6 py-16">
        <div className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-3">
          {[
            { title: 'Style-matched bundles', body: 'Browse curated sets by palette, venue style, and guest count.' },
            { title: 'Verified sellers', body: 'Identity-verified sellers. Condition grades and real photos.' },
            { title: 'Local pickup', body: 'Coordinate safe local handoffs. No shipping fragile décor.' },
          ].map((c) => (
            <div key={c.title}>
              <h3 className="mb-2 text-base font-medium text-stone-700">{c.title}</h3>
              <p className="text-sm leading-relaxed text-stone-500">{c.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
