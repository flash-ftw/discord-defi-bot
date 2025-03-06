import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-3xl mx-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Cross-chain Token Analysis Platform
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600">
            Welcome to our token analysis platform. Begin exploring token data across different chains.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
