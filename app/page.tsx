'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  LayoutGrid, FolderKanban, AlertTriangle, Banknote, Sparkles, Bell,
  ArrowRight, Check, Zap, Target, TrendingUp, Users,
  Factory, Truck, MessageCircle, Play,
  BarChart3, Lock, Clock, Brain, Droplet, Pickaxe, HardHat,
  TrendingDown, CalendarClock, FileX, ShieldAlert, UserMinus, Database,
  Mail, Instagram, Linkedin
} from 'lucide-react';
import { ContactFab } from '@/components/marketing/contact-fab';
import { Logo } from '@/components/brand/logo';
import { Reveal } from '@/components/marketing/reveal';
import { AnimatedCounter } from '@/components/marketing/animated-counter';
import { LoopDiagram } from '@/components/marketing/loop-diagram';

const WHATSAPP_URL = 'https://wa.me/919390785041?text=Hi%2C%20I%27d%20like%20a%20SYNLUMEX%20demo';
const EMAIL = 'abdul@synlumexai.com';
const INSTAGRAM_URL = 'https://www.instagram.com/abdul.synlumex/';
const LINKEDIN_URL = 'https://www.linkedin.com/company/synlumex/?viewAsMember=true';

export default function HomePage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const pricing = [
    {
      name: 'Starter',
      monthly: 1499,
      yearly: 1499 * 12 * 0.83,
      tagline: 'For small teams getting started',
      features: [
        '25 projects',
        '5 team members',
        '250 AI extractions/month',
        'Owner Command Center',
        'Exception engine',
        'Email support'
      ],
      highlight: false,
      cta: 'Start free trial'
    },
    {
      name: 'Pro',
      monthly: 3999,
      yearly: 3999 * 12 * 0.83,
      tagline: 'For growing project businesses',
      features: [
        '250 projects',
        '25 team members',
        '2,500 AI extractions/month',
        'Historical intelligence',
        'Predictive risk flags',
        'Priority support',
        'Custom domains',
        'Unbilled revenue tracking'
      ],
      highlight: true,
      cta: 'Start free trial'
    },
    {
      name: 'Enterprise',
      monthly: 9999,
      yearly: 9999 * 12 * 0.83,
      tagline: 'For large portfolios',
      features: [
        '1,000 projects',
        '100 team members',
        '25,000 AI extractions/month',
        'Full API access',
        'SSO / SAML',
        'Dedicated support',
        'Custom SLA',
        'On-premise deployment'
      ],
      highlight: false,
      cta: 'Talk to sales'
    }
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'SYNLUMEX INTEL',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'Operating system for project-driven businesses. Connect intake, execution, billing, and compliance into one closed loop.',
            offers: [
              { '@type': 'Offer', name: 'Starter', price: '1499', priceCurrency: 'USD' },
              { '@type': 'Offer', name: 'Pro', price: '3999', priceCurrency: 'USD' },
              { '@type': 'Offer', name: 'Enterprise', price: '9999', priceCurrency: 'USD' }
            ]
          })
        }}
      />

      {/* ================= DARK HERO ================= */}
      <div className="dark-hero relative bg-background text-foreground overflow-hidden">
        <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
        <div className="absolute inset-0 bg-grid-subtle pointer-events-none opacity-60" />
        <div className="absolute inset-0 bg-noise pointer-events-none" />

        <div className="orb orb-cobalt animate-orb" style={{ width: 500, height: 500, top: -100, left: -100, opacity: 0.35 }} />
        <div className="orb orb-cyan animate-orb" style={{ width: 400, height: 400, top: 100, right: -120, opacity: 0.28, animationDelay: '-5s' }} />
        <div className="orb orb-glow animate-orb" style={{ width: 300, height: 300, bottom: 100, left: '30%', opacity: 0.18, animationDelay: '-10s' }} />

        {/* NAVBAR */}
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/70 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
            <Link href="/" className="group flex items-center" aria-label="SYNLUMEX home">
              <Logo size={32} interactive priority />
            </Link>

            <div className="hidden md:flex items-center gap-8 text-sm">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#industries" className="text-muted-foreground hover:text-foreground transition-colors">Industries</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                Sign in
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-md brand-gradient text-white px-4 py-2 text-sm font-medium btn-primary flex items-center gap-2"
              >
                Book a demo
                <ArrowRight className="h-3.5 w-3.5 btn-arrow" />
              </a>
            </div>
          </div>
        </nav>

        <div className="h-16" />

        {/* HERO */}
        <section className="relative pt-20 pb-24 px-6">
          <div className="max-w-7xl mx-auto text-center relative">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/5 px-3 py-1 text-xs font-mono tracking-wider text-brand-cyan mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan animate-pulse-glow" />
                OPERATING SYSTEM FOR PROJECT BUSINESSES
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-semibold tracking-[-0.035em] leading-[1.08] mb-5 max-w-4xl mx-auto">
                Manage projects, money, and compliance in one place.
                <br />
                <span className="brand-gradient-text">
                  You don&apos;t lose on the project. You lose on what happens between stages.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                Run projects, track money, close the gaps. Extra spend. Silent overruns.
                Unbilled work. All invisible until it&apos;s too late.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-md brand-gradient-animated text-white px-6 py-3 text-sm font-semibold btn-primary flex items-center gap-2"
                >
                  Book a 15-min demo
                  <ArrowRight className="h-4 w-4 btn-arrow" />
                </a>
                <a
                  href="#screenshot"
                  className="group rounded-md border border-border bg-card/50 backdrop-blur-sm px-6 py-3 text-sm font-medium hover:bg-card transition-colors flex items-center gap-2"
                >
                  <Play className="h-4 w-4" /> See it in action
                </a>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 max-w-6xl mx-auto mb-12">
                {[
                  { value: 11.5, prefix: '$', suffix: 'M', decimals: 1, label: 'Portfolio Value' },
                  { value: 12, label: 'Live Projects' },
                  { value: 45, suffix: '%', label: 'Faster Handoffs' },
                  { value: 6, suffix: '%', label: 'Rework Prevented' },
                  { value: 3, suffix: 'mo', label: 'Delays Avoided' },
                  { value: 1200, suffix: '+', label: 'AI Extractions' },
                  { value: 4, label: 'AI Providers' }
                ].map((m, i) => (
                  <div key={i} className="glass-card rounded-lg p-3 text-center hover-lift">
                    <div className="text-lg font-bold brand-gradient-text">
                      <AnimatedCounter
                        value={m.value}
                        prefix={m.prefix ?? ''}
                        suffix={m.suffix ?? ''}
                        decimals={m.decimals ?? 0}
                      />
                    </div>
                    <div className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mt-1">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={500}>
              <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-muted-foreground">
                <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Enterprise-grade security</div>
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> One job free. Real output. No timer.</div>
                <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Multi-tenant isolated</div>
                <div className="flex items-center gap-2"><Zap className="h-3.5 w-3.5" /> AI-powered</div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* SCREENSHOT */}
        <section id="screenshot" className="relative pb-24 px-6">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="rounded-xl border border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-2xl shadow-brand/20 hover-lift">
                <div className="h-10 bg-card/80 border-b border-border flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                  </div>
                  <div className="ml-4 text-[10px] font-mono text-muted-foreground">
                    synlumex-intel.vercel.app/dashboard
                  </div>
                </div>
                <div className="p-6 bg-background/80">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-xl font-semibold">Owner Command Center</div>
                      <div className="text-xs text-muted-foreground mt-1">Portfolio health · 12 active projects</div>
                    </div>
                    <div className="text-[10px] font-mono text-brand-cyan">LIVE</div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-md border border-brand-cyan/30 bg-card p-4">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Total Value</div>
                      <div className="text-2xl font-bold brand-gradient-text mt-2">$11.5M</div>
                    </div>
                    <div className="rounded-md border border-border bg-card p-4">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">At Risk</div>
                      <div className="text-2xl font-bold mt-2">0 / 2</div>
                    </div>
                    <div className="rounded-md border border-border bg-card p-4">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Collection</div>
                      <div className="text-2xl font-bold text-amber-400 mt-2">19.4%</div>
                    </div>
                    <div className="rounded-md border border-border bg-card p-4">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Exceptions</div>
                      <div className="text-2xl font-bold text-red-400 mt-2">10</div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </div>

      {/* ================= LIGHT BODY ================= */}
      <div className="relative bg-light-gradient text-foreground">
        {/* THE 7 FLOWS */}
        <section className="section-glow relative py-24 px-6 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <div className="text-xs font-mono tracking-widest text-brand-cyan uppercase mb-3">
                  WHERE PROJECTS BLEED
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-[-0.025em] mb-4">
                  Seven flows. Every one leaks time and money.
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  These aren&apos;t edge cases. They happen on every project — and nobody sees the bleeding until it&apos;s compounded.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Banknote, title: 'Cash flow vs. progress', pain: "Progress isn't linear, but cash outflow is. Payment delays cascade into demobilization.", cost: '15-30 days of stuck working capital' },
                { icon: AlertTriangle, title: 'Design changes cascade', pain: 'Client changes ripple through schedule, procurement, and labour.', cost: 'Avg 10-20% cost overrun per change' },
                { icon: TrendingDown, title: 'Procurement delays compound', pain: 'Late awards push mobilization, push site work, push delivery.', cost: 'Weeks of catch-up avoided' },
                { icon: Users, title: 'Labour shortage stretches timelines', pain: 'Labour strength drops 30% during disruptions. Projects stall.', cost: '3-6 months of delay per event' },
                { icon: CalendarClock, title: 'Statutory approval bottlenecks', pain: 'Multiple agencies. Sequential clearances. Weeks of waiting.', cost: 'Direct cost + opportunity loss' },
                { icon: FileX, title: 'Rework from upstream factors', pain: 'Design errors and interface failures propagate through feedback loops.', cost: '5-6% of contract value wasted' },
                { icon: Database, title: 'Information lag field to office', pain: 'Field reports arrive after budget-killing events have already compounded.', cost: 'Owners see reality weeks later' }
              ].map((item, i) => (
                <Reveal key={i} delay={((i % 3) * 100) as 0 | 100 | 200}>
                  <div className="group glass-card rounded-lg p-6 hover-lift h-full">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="h-10 w-10 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                        <item.icon className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm leading-snug mb-1">{item.title}</h3>
                        <div className="text-[10px] font-mono tracking-wider text-destructive uppercase">
                          {item.cost}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.pain}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* SOLUTION */}
        <section className="relative py-24 px-6 bg-secondary/40">
          <div className="max-w-7xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <div className="text-xs font-mono tracking-widest text-brand-cyan uppercase mb-3">
                  THE SOLUTION
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-[-0.025em] mb-4">
                  One operating system. Every handoff closed.
                </h2>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Target, step: '01', title: 'Intake to Execution', body: 'Structured lifecycle from requirements through 14 stages to closeout. Every stage has owners, gates, and evidence.', features: ['14-stage lifecycle', 'BOQ intelligence', 'AI extraction from PDF'] },
                { icon: TrendingUp, step: '02', title: 'Execution to Money', body: 'Progress, billing, and collection — all connected. See unbilled revenue, collection efficiency, and cash gaps in real time.', features: ['Commercial visibility', 'Unbilled revenue tracking', 'Risk scoring'] },
                { icon: Sparkles, step: '03', title: 'Intelligence Layer', body: 'Every mutation triggers recompute. Exceptions auto-created. Historical patterns compound. The system gets smarter over time.', features: ['Auto-flagged exceptions', 'AI risk analysis', 'Historical intelligence'] }
              ].map((item, i) => (
                <Reveal key={i} delay={(i * 100) as 0 | 100 | 200}>
                  <div className="group glass-card rounded-lg p-6 relative overflow-hidden hover-lift h-full">
                    <div className="absolute top-4 right-4 text-6xl font-bold text-muted/20 font-mono">
                      {item.step}
                    </div>
                    <div className="h-10 w-10 rounded-md brand-gradient flex items-center justify-center mb-4">
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{item.body}</p>
                    <ul className="space-y-1.5">
                      {item.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-brand-cyan shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* SAVINGS */}
        <section className="section-glow relative py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <div className="text-xs font-mono tracking-widest text-emerald-500 uppercase mb-3">
                  WHAT YOU RECOVER
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-[-0.025em] mb-4">
                  Every leak, plugged. Measurably.
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Not features. Outcomes. Here&apos;s what changes when the gaps close.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Banknote, title: 'Unbilled revenue recovered', value: '$40K-80K', unit: 'per project clawed back' },
                { icon: TrendingUp, title: 'Margin preserved', value: '5-15%', unit: 'of contract value not lost' },
                { icon: AlertTriangle, title: 'Overruns caught early', value: '3%', unit: 'deviation flagged, not 30%' },
                { icon: Clock, title: 'Handoff delays cut', value: '40-60%', unit: 'faster approval cycles' },
                { icon: ShieldAlert, title: 'Compliance fines avoided', value: '$15K-40K', unit: 'per breach prevented' },
                { icon: UserMinus, title: 'PM dependency removed', value: '100%', unit: 'workflows documented' },
                { icon: Database, title: 'Data trusted again', value: '1 source', unit: 'of truth every team uses' }
              ].map((item, i) => (
                <Reveal key={i} delay={((i % 3) * 100) as 0 | 100 | 200}>
                  <div className="group glass-card rounded-lg p-6 hover-lift h-full">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="h-10 w-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 hover-icon-glow">
                        <item.icon className="h-5 w-5 text-emerald-600 group-hover:text-white transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm leading-snug">{item.title}</h3>
                      </div>
                    </div>
                    <div className="text-2xl font-bold brand-gradient-text mb-1">
                      {item.value}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.unit}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section id="features" className="relative py-24 px-6 bg-secondary/40 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <div className="text-xs font-mono tracking-widest text-brand-cyan uppercase mb-3">
                  CAPABILITIES
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-[-0.025em] mb-4">
                  Everything you need in one console
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Not a feature list. One connected operating system.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: LayoutGrid, title: 'Owner Command Center', body: 'Real-time portfolio KPIs — value, health, cash flow, exceptions.' },
                { icon: FolderKanban, title: '14-Stage Lifecycle', body: 'From intake to closeout. Each stage has owners, gates, and evidence.' },
                { icon: Banknote, title: 'Commercial Visibility', body: 'Execution vs billing vs collection. Unbilled revenue surfaced.' },
                { icon: AlertTriangle, title: 'Exception Engine', body: 'Auto-flags delays, overruns, collection gaps. Assigns owners.' },
                { icon: Sparkles, title: 'AI BOQ Extraction', body: 'Upload PDF or paste text. AI extracts structured line items.' },
                { icon: Brain, title: 'AI Risk Analysis', body: 'Reads project state and writes executive risk bullets.' },
                { icon: Bell, title: 'Smart Reminders', body: 'Every exception creates a tracked reminder with an owner.' },
                { icon: BarChart3, title: 'Historical Intelligence', body: 'Avg durations, delay causes, drop-off stages — compounding.' },
                { icon: Lock, title: 'Audit Trail', body: 'Every mutation logged. Every action provable. Every change tracked.' }
              ].map((item, i) => (
                <Reveal key={i} delay={((i % 3) * 100) as 0 | 100 | 200}>
                  <div className="group glass-card rounded-lg p-5 hover-lift h-full">
                    <div className="h-9 w-9 rounded-md bg-brand/10 border border-brand/30 flex items-center justify-center mb-3 hover-icon-glow">
                      <item.icon className="h-4 w-4 text-brand-cyan group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="font-semibold mb-1.5 text-sm">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* THE LOOP */}
        <section className="relative py-24 px-6 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <div className="text-xs font-mono tracking-widest text-brand-cyan uppercase mb-3">
                  THE CLOSED LOOP
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-[-0.025em] mb-4">
                  Update once. Impact everywhere.
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Most tools stop at record-keeping. SYNLUMEX runs The Loop — every update triggers
                  recompute, exceptions, and reminders automatically.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <LoopDiagram />
            </Reveal>
          </div>
        </section>

        {/* INDUSTRIES */}
        <section id="industries" className="relative py-24 px-6 bg-secondary/40 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <div className="text-xs font-mono tracking-widest text-brand-cyan uppercase mb-3">
                  BUILT FOR
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-[-0.025em] mb-4">
                  Every project-driven industry
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  If your business runs on projects with milestones, billing, and compliance — SYNLUMEX adapts.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: HardHat, title: 'EPC & Construction', body: 'Multiplex, thermal, industrial plants — from small to multi-billion portfolios.' },
                { icon: Zap, title: 'Energy & Utilities', body: 'Solar, wind, transmission. Capital projects with high overrun risk.' },
                { icon: Factory, title: 'Manufacturing', body: 'Plant upgrades, capacity expansions, multi-vendor coordination.' },
                { icon: Droplet, title: 'Oil & Gas', body: 'Refineries, pipelines, LNG. Complex compliance, tight margins.' },
                { icon: Truck, title: 'Logistics & Infrastructure', body: 'Ports, rail, highways. Multi-stakeholder, multi-year coordination.' },
                { icon: Pickaxe, title: 'Mining & Metals', body: 'Multi-billion dollar capital projects. Chronic delays, budget drift.' }
              ].map((item, i) => (
                <Reveal key={i} delay={((i % 3) * 100) as 0 | 100 | 200}>
                  <div className="group glass-card rounded-lg p-5 hover-lift h-full">
                    <div className="h-10 w-10 rounded-md brand-gradient flex items-center justify-center mb-3">
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1.5 text-sm">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="relative py-24 px-6 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-10">
                <div className="text-xs font-mono tracking-widest text-brand-cyan uppercase mb-3">
                  PRICING
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-[-0.025em] mb-4">
                  Simple pricing. Serious ROI.
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Every plan includes the AI intelligence layer, historical insights, and audit logs.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div className="flex justify-center mb-10">
                <div className="inline-flex items-center rounded-full border border-border bg-card p-1 shadow-sm">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-5 py-2 text-xs font-mono tracking-wider rounded-full transition-all ${
                      billingCycle === 'monthly'
                        ? 'brand-gradient text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    MONTHLY
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-5 py-2 text-xs font-mono tracking-wider rounded-full transition-all flex items-center gap-2 ${
                      billingCycle === 'yearly'
                        ? 'brand-gradient text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    YEARLY
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        billingCycle === 'yearly'
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-500/10 text-emerald-600'
                      }`}
                    >
                      SAVE 17%
                    </span>
                  </button>
                </div>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">
              {pricing.map((tier, i) => {
                const price = billingCycle === 'monthly' ? tier.monthly : tier.yearly / 12;
                return (
                  <Reveal key={i} delay={(i * 100) as 0 | 100 | 200}>
                    <div
                      className={`rounded-xl p-6 relative hover-lift h-full ${
                        tier.highlight
                          ? 'glass-card border-brand-cyan/50 shadow-xl shadow-brand/15'
                          : 'glass-card'
                      }`}
                    >
                      {tier.highlight && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full brand-gradient text-white px-3 py-1 text-[10px] font-mono tracking-widest uppercase">
                          MOST POPULAR
                        </div>
                      )}
                      <h3 className="text-lg font-semibold mb-1">{tier.name}</h3>
                      <p className="text-xs text-muted-foreground mb-5">{tier.tagline}</p>
                      <div className="mb-1">
                        <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                          Starting at
                        </span>
                      </div>
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="text-3xl md:text-4xl font-semibold brand-gradient-text tracking-tight">
                          ${Math.round(price).toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">/ month</span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <div className="text-[10px] font-mono text-muted-foreground mb-4">
                          Billed ${Math.round(tier.yearly).toLocaleString()} annually
                        </div>
                      )}
                      <ul className="space-y-2.5 mb-6 mt-4">
                        {tier.features.map((f, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-brand-cyan shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <a
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group block w-full rounded-md px-4 py-2.5 text-sm font-medium text-center transition-all ${
                          tier.highlight
                            ? 'brand-gradient text-white btn-primary'
                            : 'border border-border hover:bg-secondary'
                        }`}
                      >
                        {tier.cta}
                      </a>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <div className="mt-10 text-center text-xs text-muted-foreground font-mono">
              All prices in USD · Annual billing saves 17% · Enterprise plans can be invoiced
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="relative py-24 px-6 bg-secondary/40 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <Reveal>
              <div className="text-center mb-12">
                <div className="text-xs font-mono tracking-widest text-brand-cyan uppercase mb-3">FAQ</div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-[-0.025em]">
                  Common questions
                </h2>
              </div>
            </Reveal>

            <div className="space-y-3">
              {[
                { q: 'What is an operating system for project businesses?', a: 'A software platform built for the people running projects — owners, project directors, and finance teams. It connects intake, execution, billing, and compliance in one closed loop, giving visibility that ERP and PM tools cannot provide.' },
                { q: 'How is this different from Procore or Autodesk?', a: 'Procore and Autodesk manage project execution — tasks, drawings, schedules. SYNLUMEX connects execution → billing → compliance → intelligence. You get end-to-end visibility across the full lifecycle.' },
                { q: 'Do I need to replace my ERP?', a: 'No. SYNLUMEX sits above your ERP. It reads data from your systems, connects the gaps between them, and gives you visibility ERP alone cannot provide.' },
                { q: 'Is my data safe?', a: 'Yes. Multi-tenant architecture with database-level row-level security. Your project data is isolated from every other organization. Our support team cannot see your data unless you explicitly authorize impersonation for a support session.' },
                { q: 'How does the AI work?', a: 'We use multiple providers (Groq, Cerebras, OpenRouter, Google Gemini) with automatic failover. Your project data is never used to train AI models. AI output is always reviewed by your team before action.' },
                { q: 'Can I try before paying?', a: 'Yes — 14-day trial on the Pro plan. No credit card required. Book a demo and we will set up your workspace manually.' },
                { q: 'Do you offer custom deployments?', a: 'Yes. Enterprise plans include SSO/SAML, custom SLAs, dedicated support, and optional on-premise deployment.' },
                { q: 'Which industries do you support?', a: 'Any project-driven industry. We are strongest in EPC and construction, energy and utilities, manufacturing, oil and gas, logistics and infrastructure, and mining.' }
              ].map((item, i) => (
                <Reveal key={i} delay={0}>
                  <details className="group glass-card rounded-lg overflow-hidden hover:border-brand-cyan/30 transition-colors">
                    <summary className="cursor-pointer p-4 font-medium text-sm flex items-center justify-between hover:bg-secondary/60 transition-colors list-none">
                      {item.q}
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform shrink-0 ml-2" />
                    </summary>
                    <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</div>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative py-24 px-6 border-t border-border overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-cyan/15 rounded-full blur-3xl pointer-events-none animate-orb" />
          <div className="max-w-3xl mx-auto text-center relative">
            <Reveal>
              <h2 className="text-2xl md:text-3xl lg:text-5xl font-semibold tracking-[-0.03em] mb-4">
                Ready to see it in action?
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                15-minute walkthrough. No sales pitch. See your workflows mapped onto SYNLUMEX.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-md brand-gradient-animated text-white px-6 py-3 text-sm font-semibold btn-primary flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp us now
                </a>
                <a
                  href={`mailto:${EMAIL}?subject=SYNLUMEX%20Inquiry`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-md border border-border bg-card px-6 py-3 text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" /> Email us
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-border py-12 px-6 bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <Link href="/" className="group inline-flex items-center mb-4" aria-label="SYNLUMEX home">
                  <Logo size={28} interactive />
                </Link>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Operating system for project-driven businesses. Intake to closeout. Execution to money.
                </p>
              </div>

              <div>
                <div className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Product</div>
                <ul className="space-y-2 text-sm">
                  <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                  <li><a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                  <li><a href="#industries" className="text-muted-foreground hover:text-foreground transition-colors">Industries</a></li>
                  <li><Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">Sign in</Link></li>
                </ul>
              </div>

              <div>
                <div className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Company</div>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
                  <li><Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
                  <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></li>
                  <li><Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link></li>
                  <li><Link href="/refund" className="text-muted-foreground hover:text-foreground transition-colors">Refund</Link></li>
                  <li><Link href="/disclaimer" className="text-muted-foreground hover:text-foreground transition-colors">Disclaimer</Link></li>
                </ul>
              </div>

              <div>
                <div className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">Contact</div>
                <ul className="space-y-2.5 text-sm">
                  <li>
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </li>
                  <li>
                    <a
                      href={`mailto:${EMAIL}?subject=SYNLUMEX%20Inquiry`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                    >
                      <Mail className="h-3.5 w-3.5" /> Email
                    </a>
                  </li>
                  <li>
                    <a
                      href={INSTAGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                    >
                      <Instagram className="h-3.5 w-3.5" /> Instagram
                    </a>
                  </li>
                  <li>
                    <a
                      href={LINKEDIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                    >
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground font-mono">© 2026 SYNLUMEX</div>
              <div className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </div>
            </div>
          </div>
        </footer>
      </div>

      <ContactFab />
    </>
  );
}
