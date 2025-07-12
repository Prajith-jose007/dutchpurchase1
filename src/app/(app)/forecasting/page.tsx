
// src/app/(app)/forecasting/page.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import type { ForecastDemandInput as ForecastInput, ForecastDemandOutput as ForecastResult } from '@/ai/flows/demand-forecasting';
import { handleDemandForecastAction, getSampleHistoricalDataCSVAction } from '@/lib/actions';
import { branches } from '@/data/appRepository';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function ForecastingPage() {
  const [formData, setFormData] = useState<ForecastInput>({
    historicalOrderData: '',
    forecastHorizon: 'next week',
    branch: branches[0]?.name || '',
  });
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSampleLoading, setIsSampleLoading] = useState(false);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (value: string) => {
    setFormData({ ...formData, branch: value });
  };
  
  const loadSampleData = async () => {
    setIsSampleLoading(true);
    try {
      const sampleCSV = await getSampleHistoricalDataCSVAction();
      setFormData(prev => ({ ...prev, historicalOrderData: sampleCSV }));
      toast({ title: "Sample Data Loaded", description: "Sample historical order data has been populated." });
    } catch (error) {
      toast({ title: "Error Loading Sample Data", description: "Could not load sample historical data.", variant: "destructive" });
    } finally {
      setIsSampleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setForecastResult(null);

    if (!formData.historicalOrderData.trim() || !formData.forecastHorizon.trim() || !formData.branch.trim()) {
        toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    const result = await handleDemandForecastAction(formData);
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
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Demand Forecasting</h1>
        <p className="text-muted-foreground">Use AI to forecast ingredient demand based on historical data.</p>
      </header>

      <Card className="shadow-xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Forecasting Inputs</CardTitle>
            <CardDescription>Provide historical data and parameters for the forecast.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="historicalOrderData">Historical Order Data (CSV Format)</Label>
              <Textarea
                id="historicalOrderData"
                name="historicalOrderData"
                value={formData.historicalOrderData}
                onChange={handleFormChange}
                placeholder="date,item_code,quantity,branch_name\n2023-01-01,ITEM001,10,Main Branch\n..."
                rows={8}
                required
                className="font-code text-xs"
              />
              <Button type="button" variant="link" size="sm" onClick={loadSampleData} disabled={isSampleLoading} className="p-0 h-auto text-primary">
                {isSampleLoading ? <Icons.Dashboard className="h-4 w-4 animate-spin mr-1" /> : <Icons.Info className="h-4 w-4 mr-1" />}
                {isSampleLoading ? "Loading Sample..." : "Load Sample Data (from recent orders)"}
              </Button>
              <p className="text-xs text-muted-foreground">
                CSV columns: <code>date</code> (YYYY-MM-DD), <code>item_code</code>, <code>quantity</code>, <code>branch_name</code>.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forecastHorizon">Forecast Horizon</Label>
                <Input
                  id="forecastHorizon"
                  name="forecastHorizon"
                  value={formData.forecastHorizon}
                  onChange={handleFormChange}
                  placeholder="e.g., next week, next month"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select
                  name="branch"
                  value={formData.branch}
                  onValueChange={handleSelectChange}
                  required
                >
                  <SelectTrigger id="branch" aria-label="Select branch">
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading ? (
                <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.Forecast className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Generating Forecast...' : 'Generate Forecast'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {forecastResult && (
        <Card className="shadow-xl animate-in fade-in duration-500">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Forecast Results</CardTitle>
            <CardDescription>AI-generated demand forecast and recommendations.</CardDescription>
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
