import { CustomerShell } from "@/components/layout/customer-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";

export default function Home() {
  return (
    <CustomerShell cartCount={2}>
      <div className="space-y-6">
        <Alert variant="info" title="Sprint Foundation Status">
          Customer shell primitives baseline (Issue #245) loaded cleanly with responsive navigation and design tokens.
        </Alert>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Santorini Eau de Parfum</CardTitle>
                <Badge variant="accent">Best Seller</Badge>
              </div>
              <CardDescription>Fresh citrus, marine notes, and crisp cedar.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">$120.00</p>
            </CardContent>
            <CardFooter>
              <Button variant="primary" className="w-full">Add to Cart</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Velvet Rose Extract</CardTitle>
                <Badge variant="neutral">New</Badge>
              </div>
              <CardDescription>Damask rose, warm amber, and spiced vanilla.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">$145.00</p>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" className="w-full">Add to Cart</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Discovery Set</CardTitle>
              <CardDescription>Five 5ml miniature flacons curated for profiling.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">$45.00</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Explore Set</Button>
            </CardFooter>
          </Card>
        </section>

        <EmptyState
          title="No Recent Orders"
          description="You haven't placed an order yet. Browse our catalogue to get started."
          action={<Button variant="outline" size="sm">Browse All Perfumes</Button>}
        />
      </div>
    </CustomerShell>
  );
}