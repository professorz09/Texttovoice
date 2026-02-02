import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-background"
      data-testid="page-not-found"
    >
      <Card className="w-full max-w-md mx-4" data-testid="card-not-found">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold" data-testid="text-notfound-title">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground" data-testid="text-notfound-body">
            This page doesn’t exist. Go back to the app.
          </p>

          <div className="mt-6">
            <Link href="/">
              <Button className="w-full" data-testid="button-notfound-home">
                Back to VoiceForge
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
