import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// native title attr used for tooltip
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  ExternalLink,
  Globe,
  FileText,
  GraduationCap,
  Scale,
  MessageSquare,
} from "lucide-react";

const SOURCES = [
  {
    category: "Scheme Pages",
    icon: Globe,
    items: [
      { name: "Mirae Asset Large Cap — Groww", url: "https://groww.in/mutual-funds/mirae-asset-large-cap-fund-direct-growth" },
      { name: "Parag Parikh Flexi Cap — Groww", url: "https://groww.in/mutual-funds/parag-parikh-long-term-value-fund-direct-growth" },
      { name: "Axis ELSS Tax Saver — Groww", url: "https://groww.in/mutual-funds/axis-elss-tax-saver-direct-plan-growth" },
      { name: "Mirae Asset Large Cap — AMC", url: "https://www.miraeassetmf.co.in/mutual-fund-scheme/equity-fund/mirae-asset-large-cap-fund" },
      { name: "Parag Parikh Flexi Cap — AMC", url: "https://amc.ppfas.com/schemes/parag-parikh-flexi-cap-fund/" },
      { name: "Axis ELSS Tax Saver — AMC", url: "https://www.axismf.com/mutual-funds/equity-funds/axis-elss-tax-saver-fund/ts-dg/direct" },
    ],
  },
  {
    category: "AMC FAQs",
    icon: MessageSquare,
    items: [
      { name: "PPFAS Scheme FAQs", url: "https://amc.ppfas.com/faqs/scheme-specific-faqs/index.php" },
      { name: "Axis MF FAQ", url: "https://www.axismf.com/faq" },
    ],
  },
  {
    category: "Help Articles",
    icon: FileText,
    items: [
      { name: "Capital Gains Report — Groww", url: "https://groww.in/help/mutual-funds/mf-others/how-to-download-capital-gain-report--50" },
      { name: "SIP Guide — Groww", url: "https://groww.in/p/sip-systematic-investment-plan" },
      { name: "ELSS Lock-in Guide — Groww", url: "https://groww.in/blog/3-steps-follow-elss-lock-period-ends" },
    ],
  },
  {
    category: "Investor Education",
    icon: GraduationCap,
    items: [
      { name: "Types of MF Schemes — AMFI", url: "https://www.amfiindia.com/investor/knowledge-center-info?zoneName=TypesOfMutualFundSchemes" },
      { name: "Categorization of MF — AMFI", url: "https://www.amfiindia.com/investor/knowledge-center-info?zoneName=CategorizationOfMutualFundSchemes" },
    ],
  },
  {
    category: "SEBI Regulations",
    icon: Scale,
    items: [
      { name: "Riskometer Guide — SEBI", url: "https://investor.sebi.gov.in/riskometer.html" },
      { name: "ELSS Guide — SEBI", url: "https://investor.sebi.gov.in/elss.html" },
      { name: "Risk-o-meter Circular — SEBI", url: "https://www.sebi.gov.in/legal/circulars/oct-2020/circular-on-product-labeling-in-mutual-fund-schemes-risk-o-meter_47796.html" },
    ],
  },
];

const HOW_TO_USE = [
  "Type a factual question about any of the 3 schemes covered",
  "Click a suggested question to get started quickly",
  "Follow-up questions remember the scheme you asked about",
  "Answers include a source link — click to verify",
  "Advisory or comparison questions are politely refused",
  "Personal info (PAN, Aadhaar, etc.) is never processed",
];

export function HelpFab() {
  const [open, setOpen] = useState(false);
  void setOpen;

  return (
    <div className="fixed bottom-14 right-6 z-50">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg cursor-pointer transition-transform duration-200 hover:scale-105"
            aria-label="Help and sources"
            title="How to use & sources"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </DialogTrigger>

          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Help & Sources</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">How to use</h3>
              <ul className="space-y-1.5">
                {HOW_TO_USE.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold mt-0.5">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t my-2" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Official Sources</h3>
                <Badge variant="secondary" className="text-[10px]">19 URLs</Badge>
              </div>

              {SOURCES.map((group) => (
                <div key={group.category} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <group.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{group.category}</span>
                  </div>
                  <div className="space-y-1 pl-5">
                    {group.items.map((item) => (
                      <a
                        key={item.url}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 mt-2">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                This tool provides factual information only. It does not constitute investment
                advice. Mutual fund investments are subject to market risks. Data sourced
                exclusively from official AMC, AMFI, and SEBI publications.
              </p>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
