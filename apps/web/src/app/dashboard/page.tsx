import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Day 4 will populate this with KPIs, charts, and recent activity.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['Total Sales', 'Total Purchases', 'Customers', 'Suppliers'].map((label) => (
            <Card key={label} className="p-6">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">—</p>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
