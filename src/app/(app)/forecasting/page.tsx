
// src/app/(app)/forecasting/page.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import type { ForecastDemandOutput as ForecastResult } from '@/ai/flows/demand-forecasting';
import { handleDemandForecastAction } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function ForecastingPage() {
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setForecastResult(null);
    
    const result = await handleDemandForecastAction();
    setIsLoading(false);

    if (result.success && result.data) {
      setForecastResult(result.data);
      toast({ title: "Forecast Generated", description: "Successfully generated demand forecast.", variant: "default" });
    } else {
      toast({ title: "Forecast Failed", description: result.error || "An unknown error occurred.", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline tracking-tight">Demand Forecasting</h1>
          <p className="text-muted-foreground">Use AI to forecast ingredient demand based on historical data.</p>
        </div>
         <Button onClick={handleSubmit} disabled={isLoading} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading ? (
              <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.Forecast className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Generating Forecast...' : 'Generate Forecast'}
          </Button>
      </header>

      {forecastResult && (
        <Card className="shadow-xl animate-in fade-in duration-500">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Forecast Results</CardTitle>
            <CardDescription>AI-generated demand forecast and recommendations for next week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center"><Icons.OrderList className="mr-2 h-5 w-5 text-primary"/> Forecasted Demand</h3>
              <pre className="bg-muted p-4 rounded-md text-sm font-code overflow-x-auto whitespace-pre-wrap">{forecastResult.forecastedDemand}</pre>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center"><Icons.Success className="mr-2 h-5 w-5 text-primary"/>Confidence Level</h3>
              <Badge variant={forecastResult.confidenceLevel.toLowerCase() === 'high' ? 'default' : forecastResult.confidenceLevel.toLowerCase() === 'medium' ? 'secondary' : 'outline'} className="text-sm">
                {forecastResult.confidenceLevel}
              </Badge>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center"><Icons.Info className="mr-2 h-5 w-5 text-primary"/>Recommendations</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{forecastResult.recommendations}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
