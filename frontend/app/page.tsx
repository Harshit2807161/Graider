import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-primary)' }}>
        Graider
      </h1>
      <p style={{ color: 'var(--color-text-muted)' }}>AI-Powered Grading Platform</p>

      <Link
        href="/login"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          borderRadius: 'var(--radius)',
          fontWeight: 600
        }}
      >
        Go to Login
      </Link>
    </main>
  );
}
