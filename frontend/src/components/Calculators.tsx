import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  IndianRupee,
  Calculator,
} from "lucide-react";

const API_URL = "http://localhost:8000";

interface CalcResult {
  total_invested: number;
  estimated_returns: number;
  total_value: number;
  yearly_breakdown: { year: number; invested?: number; value?: number; withdrawn?: number; balance?: number }[];
}

function formatINR(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(2)} L`;
  return n.toLocaleString("en-IN");
}

function ResultCard({ result, type }: { result: CalcResult; type: string }) {
  const isSWP = type === "swp";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">{isSWP ? "Initial Investment" : "Total Invested"}</p>
          <p className="text-lg font-semibold"><IndianRupee className="h-3.5 w-3.5 inline -mt-0.5" />{formatINR(result.total_invested)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">{isSWP ? "Total Returns" : "Est. Returns"}</p>
          <p className="text-lg font-semibold text-emerald-600"><IndianRupee className="h-3.5 w-3.5 inline -mt-0.5" />{formatINR(result.estimated_returns)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">{isSWP ? "Final Balance" : "Total Value"}</p>
          <p className="text-lg font-semibold text-primary"><IndianRupee className="h-3.5 w-3.5 inline -mt-0.5" />{formatINR(result.total_value)}</p>
        </CardContent></Card>
      </div>
      {result.yearly_breakdown.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-3 gap-0 bg-muted px-3 py-2 text-[10px] font-medium text-muted-foreground">
            <span>Year</span>
            <span className="text-right">{isSWP ? "Withdrawn" : "Invested"}</span>
            <span className="text-right">{isSWP ? "Balance" : "Value"}</span>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {result.yearly_breakdown.map((row) => (
              <div key={row.year} className="grid grid-cols-3 gap-0 px-3 py-1.5 text-xs border-t">
                <span>{row.year}</span>
                <span className="text-right">{formatINR(isSWP ? row.withdrawn ?? 0 : row.invested ?? 0)}</span>
                <span className="text-right font-medium">{formatINR(isSWP ? row.balance ?? 0 : row.value ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NumInput({ label, value, onChange, suffix, min = 0, max, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} min={min} max={max} step={step} className="h-10 text-sm" />
        {suffix && <span className="text-xs text-muted-foreground shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function SIPCalc() {
  const [monthly, setMonthly] = useState(5000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/calc/sip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthly_amount: monthly, expected_return: rate, years }) });
      setResult(await res.json());
    } finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <NumInput label="Monthly SIP" value={monthly} onChange={setMonthly} suffix="INR" step={500} min={500} />
        <NumInput label="Expected Return" value={rate} onChange={setRate} suffix="% p.a." step={0.5} min={1} max={30} />
        <NumInput label="Duration" value={years} onChange={setYears} suffix="years" min={1} max={40} />
      </div>
      <Button onClick={calculate} disabled={loading} className="w-full cursor-pointer">{loading ? "Calculating..." : "Calculate SIP Returns"}</Button>
      {result && <ResultCard result={result} type="sip" />}
    </div>
  );
}

function StepUpSIPCalc() {
  const [monthly, setMonthly] = useState(5000);
  const [stepUp, setStepUp] = useState(10);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/calc/stepup-sip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthly_amount: monthly, annual_step_up: stepUp, expected_return: rate, years }) });
      setResult(await res.json());
    } finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumInput label="Starting Monthly SIP" value={monthly} onChange={setMonthly} suffix="INR" step={500} min={500} />
        <NumInput label="Annual Step-up" value={stepUp} onChange={setStepUp} suffix="%" step={1} min={0} max={50} />
        <NumInput label="Expected Return" value={rate} onChange={setRate} suffix="% p.a." step={0.5} min={1} max={30} />
        <NumInput label="Duration" value={years} onChange={setYears} suffix="years" min={1} max={40} />
      </div>
      <Button onClick={calculate} disabled={loading} className="w-full cursor-pointer">{loading ? "Calculating..." : "Calculate Step-up SIP"}</Button>
      {result && <ResultCard result={result} type="stepup" />}
    </div>
  );
}

function SWPCalc() {
  const [initial, setInitial] = useState(5000000);
  const [withdrawal, setWithdrawal] = useState(30000);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(20);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/calc/swp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initial_investment: initial, monthly_withdrawal: withdrawal, expected_return: rate, years }) });
      setResult(await res.json());
    } finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumInput label="Initial Investment" value={initial} onChange={setInitial} suffix="INR" step={100000} min={100000} />
        <NumInput label="Monthly Withdrawal" value={withdrawal} onChange={setWithdrawal} suffix="INR" step={1000} min={1000} />
        <NumInput label="Expected Return" value={rate} onChange={setRate} suffix="% p.a." step={0.5} min={1} max={20} />
        <NumInput label="Duration" value={years} onChange={setYears} suffix="years" min={1} max={40} />
      </div>
      <Button onClick={calculate} disabled={loading} className="w-full cursor-pointer">{loading ? "Calculating..." : "Calculate SWP"}</Button>
      {result && <ResultCard result={result} type="swp" />}
    </div>
  );
}

function LumpsumCalc() {
  const [amount, setAmount] = useState(100000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/calc/lumpsum`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, expected_return: rate, years }) });
      setResult(await res.json());
    } finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <NumInput label="Investment Amount" value={amount} onChange={setAmount} suffix="INR" step={10000} min={1000} />
        <NumInput label="Expected Return" value={rate} onChange={setRate} suffix="% p.a." step={0.5} min={1} max={30} />
        <NumInput label="Duration" value={years} onChange={setYears} suffix="years" min={1} max={40} />
      </div>
      <Button onClick={calculate} disabled={loading} className="w-full cursor-pointer">{loading ? "Calculating..." : "Calculate Lumpsum Returns"}</Button>
      {result && <ResultCard result={result} type="lumpsum" />}
    </div>
  );
}

export function Calculators() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Investment Calculators</h2>
      </div>
      <p className="text-xs text-muted-foreground">Plan your investments. All calculations are indicative and based on assumed constant returns.</p>
      <Separator />
      <Tabs defaultValue="sip" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="sip" className="text-xs cursor-pointer"><TrendingUp className="h-3.5 w-3.5 mr-1" />SIP</TabsTrigger>
          <TabsTrigger value="stepup" className="text-xs cursor-pointer"><ArrowUpRight className="h-3.5 w-3.5 mr-1" />Step-up</TabsTrigger>
          <TabsTrigger value="swp" className="text-xs cursor-pointer"><ArrowDownRight className="h-3.5 w-3.5 mr-1" />SWP</TabsTrigger>
          <TabsTrigger value="lumpsum" className="text-xs cursor-pointer"><Wallet className="h-3.5 w-3.5 mr-1" />Lumpsum</TabsTrigger>
        </TabsList>
        <TabsContent value="sip"><SIPCalc /></TabsContent>
        <TabsContent value="stepup"><StepUpSIPCalc /></TabsContent>
        <TabsContent value="swp"><SWPCalc /></TabsContent>
        <TabsContent value="lumpsum"><LumpsumCalc /></TabsContent>
      </Tabs>
    </div>
  );
}
