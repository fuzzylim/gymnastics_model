export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full space-y-8">
        <h1 className="text-4xl font-bold text-center">
          Gymnastics Model
        </h1>
        <p className="text-xl text-center text-muted-foreground">
          A modern multi-tenant SaaS application with passkeys authentication
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get Started
          </a>
          <a
            href="/docs"
            className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            Documentation
          </a>
        </div>
      </div>
    </main>
  )
}