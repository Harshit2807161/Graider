export default function DashboardPage() {
    return (
        <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>
                Dashboard Overview
            </h1>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem'
            }}>
                {/* Stat Cards */}
                {['Total Organizations', 'Active Classes', 'Exams Graded', 'Pending Actions'].map((title) => (
                    <div key={title} style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{title}</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem' }}>0</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
