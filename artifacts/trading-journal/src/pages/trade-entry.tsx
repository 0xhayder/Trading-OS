import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCreateTrade, useScoreTrade } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  coin: z.string().min(1, "Required"),
  setupType: z.string().min(1, "Required"),
  timeframe: z.string().min(1, "Required"),
  btcCondition: z.string().min(1, "Required"),
  altCondition: z.string().min(1, "Required"),
  narrativeStrength: z.string().min(1, "Required"),
  levelClarity: z.string().min(1, "Required"),
  timeframeAlignment: z.string().min(1, "Required"),
  retestQuality: z.string().min(1, "Required"),
  volumeStrength: z.string().min(1, "Required"),
  candleImpulse: z.string().min(1, "Required"),
  followThrough: z.string().min(1, "Required"),
  stopLossPct: z.coerce.number().min(0),
  tp1Pct: z.coerce.number().min(0),
  tp2Pct: z.coerce.number().min(0),
  entryDistance: z.string().min(1, "Required"),
  spaceToResistance: z.string().min(1, "Required"),
  rrQuality: z.string().min(1, "Required"),
  overextension: z.string().min(1, "Required"),
  eventRisk: z.string().min(1, "Required"),
  liquidityRisk: z.string().min(1, "Required"),
  mode: z.enum(["trade", "watchlist"]).default("trade"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function TradeEntry() {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      coin: "", setupType: "", timeframe: "",
      btcCondition: "", altCondition: "", narrativeStrength: "",
      levelClarity: "", timeframeAlignment: "", retestQuality: "",
      volumeStrength: "", candleImpulse: "", followThrough: "",
      stopLossPct: 0, tp1Pct: 0, tp2Pct: 0,
      entryDistance: "", spaceToResistance: "", rrQuality: "",
      overextension: "", eventRisk: "", liquidityRisk: "",
      mode: "trade", notes: ""
    }
  });

  const createTrade = useCreateTrade();
  const scoreTrade = useScoreTrade();
  
  const [scorePreview, setScorePreview] = useState<any>(null);
  
  const values = form.watch();
  
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const parsed = schema.safeParse(values);
      if (parsed.success) {
        scoreTrade.mutate({ data: parsed.data }, {
          onSuccess: (res) => setScorePreview(res),
          onError: () => setScorePreview(null)
        });
      } else {
        setScorePreview(null);
      }
    }, 500);
  }, [JSON.stringify(values)]);

  const onSubmit = (data: FormValues) => {
    createTrade.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Trade Saved", description: "System has logged the trade setup." });
        form.reset();
      },
      onError: () => toast({ title: "Error", description: "Failed to save trade", variant: "destructive" })
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-2xl font-mono uppercase tracking-wider">Trade Entry</h1>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Section 1 */}
            <div className="space-y-4">
              <h2 className="text-xs font-mono uppercase text-muted-foreground border-b border-border pb-2">Basic Trade Info</h2>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="coin" render={({field}) => (
                  <FormItem><FormLabel>Coin / Pair</FormLabel><FormControl><Input placeholder="TAO/USDT" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="setupType" render={({field}) => (
                  <FormItem><FormLabel>Setup Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Breakout Retest">Breakout Retest</SelectItem>
                        <SelectItem value="Double Bottom">Double Bottom</SelectItem>
                        <SelectItem value="Trendline Trade">Trendline Trade</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="timeframe" render={({field}) => (
                  <FormItem><FormLabel>Timeframe</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="4H">4H</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Other sections omitted for brevity in minimal version, but required by spec. I'll add them quickly. */}
            <div className="space-y-4">
              <h2 className="text-xs font-mono uppercase text-muted-foreground border-b border-border pb-2">Market Factors</h2>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="btcCondition" render={({field}) => (
                  <FormItem><FormLabel>BTC Condition</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Bullish">Bullish</SelectItem><SelectItem value="Neutral">Neutral</SelectItem><SelectItem value="Bearish">Bearish</SelectItem></SelectContent></Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="altCondition" render={({field}) => (
                  <FormItem><FormLabel>Alt Condition</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Bullish">Bullish</SelectItem><SelectItem value="Neutral">Neutral</SelectItem><SelectItem value="Bearish">Bearish</SelectItem></SelectContent></Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="narrativeStrength" render={({field}) => (
                  <FormItem><FormLabel>Narrative</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Hot">Hot</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Dead">Dead</SelectItem></SelectContent></Select>
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xs font-mono uppercase text-muted-foreground border-b border-border pb-2">Structure & Momentum</h2>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="levelClarity" render={({field}) => (
                  <FormItem><FormLabel>Level Clarity</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Obvious">Obvious</SelectItem><SelectItem value="Decent">Decent</SelectItem><SelectItem value="Forced / Messy">Forced / Messy</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="timeframeAlignment" render={({field}) => (
                  <FormItem><FormLabel>TF Alignment</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Fully Aligned">Fully Aligned</SelectItem><SelectItem value="Partially Aligned">Partially Aligned</SelectItem><SelectItem value="Counter Trend">Counter Trend</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="retestQuality" render={({field}) => (
                  <FormItem><FormLabel>Retest Quality</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Strong">Strong</SelectItem><SelectItem value="Acceptable">Acceptable</SelectItem><SelectItem value="Weak">Weak</SelectItem></SelectContent></Select></FormItem>
                )} />
                
                <FormField control={form.control} name="volumeStrength" render={({field}) => (
                  <FormItem><FormLabel>Volume</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Strong Expansion">Strong Expansion</SelectItem><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Weak">Weak</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="candleImpulse" render={({field}) => (
                  <FormItem><FormLabel>Impulse</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Strong">Strong</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Weak">Weak</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="followThrough" render={({field}) => (
                  <FormItem><FormLabel>Follow Through</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Continuation Present">Continuation Present</SelectItem><SelectItem value="Slowing">Slowing</SelectItem><SelectItem value="Failing">Failing</SelectItem></SelectContent></Select></FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xs font-mono uppercase text-muted-foreground border-b border-border pb-2">Entry & Risk</h2>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="stopLossPct" render={({field}) => (<FormItem><FormLabel>SL %</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="tp1Pct" render={({field}) => (<FormItem><FormLabel>TP1 %</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="tp2Pct" render={({field}) => (<FormItem><FormLabel>TP2 %</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
                
                <FormField control={form.control} name="entryDistance" render={({field}) => (
                  <FormItem><FormLabel>Entry Distance</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Optimal">Optimal</SelectItem><SelectItem value="Acceptable">Acceptable</SelectItem><SelectItem value="Extended">Extended</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="spaceToResistance" render={({field}) => (
                  <FormItem><FormLabel>Space To Res.</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Large Space">Large Space</SelectItem><SelectItem value="Decent Space">Decent Space</SelectItem><SelectItem value="Limited Space">Limited Space</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="rrQuality" render={({field}) => (
                  <FormItem><FormLabel>R:R Quality</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Asymmetric">Asymmetric</SelectItem><SelectItem value="Acceptable">Acceptable</SelectItem><SelectItem value="Poor">Poor</SelectItem></SelectContent></Select></FormItem>
                )} />

                <FormField control={form.control} name="overextension" render={({field}) => (
                  <FormItem><FormLabel>Overextension</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Calm">Calm</SelectItem><SelectItem value="Extended">Extended</SelectItem><SelectItem value="Euphoric">Euphoric</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="eventRisk" render={({field}) => (
                  <FormItem><FormLabel>Event Risk</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="liquidityRisk" render={({field}) => (
                  <FormItem><FormLabel>Liquidity Risk</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="High Liquidity">High Liquidity</SelectItem><SelectItem value="Acceptable">Acceptable</SelectItem><SelectItem value="Dangerous">Dangerous</SelectItem></SelectContent></Select></FormItem>
                )} />
              </div>
            </div>

            <FormField control={form.control} name="mode" render={({field}) => (
              <FormItem><FormLabel>Mode</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="trade">Trade</SelectItem><SelectItem value="watchlist">Watchlist</SelectItem></SelectContent></Select></FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({field}) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea className="h-24 font-mono text-sm" {...field} /></FormControl></FormItem>
            )} />

            <Button type="submit" disabled={createTrade.isPending} className="w-full font-mono uppercase tracking-widest">
              {createTrade.isPending ? "Persisting..." : "Submit Setup"}
            </Button>
          </form>
        </Form>
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-8 border border-border bg-card p-6 flex flex-col gap-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-xs font-mono uppercase text-muted-foreground mb-4">System Output</h2>
            <div className="flex items-end justify-between">
              <span className="text-sm font-mono text-muted-foreground">Score</span>
              <span className="text-4xl font-mono leading-none">{scorePreview?.finalScore || "--"}<span className="text-lg text-muted-foreground">/100</span></span>
            </div>
          </div>

          <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="uppercase text-right">{scorePreview?.tradeStatus || "--"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Alloc %</span>
              <span>{scorePreview?.suggestedAllocationPct ? `${scorePreview.suggestedAllocationPct}%` : "--"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Suggested RR</span>
              <span>{scorePreview?.suggestedRr ? `${scorePreview.suggestedRr}R` : "--"}</span>
            </div>
          </div>

          {scorePreview?.tradeWarnings && (
            <div className="p-3 border border-yellow-500/20 bg-yellow-500/5 text-yellow-500 font-mono text-xs">
              {scorePreview.tradeWarnings}
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <div className="text-xs font-mono uppercase text-muted-foreground mb-2">Final Decision</div>
            <div className={`text-xl font-mono uppercase ${scorePreview?.finalDecision?.includes("REJECT") ? "text-destructive" : "text-white"}`}>
              {scorePreview?.finalDecision || "PENDING INPUT..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
