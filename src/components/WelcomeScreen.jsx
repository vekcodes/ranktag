import { Zap, Sparkles, Activity, Search, FileCode, Hash, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function WelcomeScreen({ onStart }) {
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-transparent">
            {/* Minimal Hero Section */}
            <div className="max-w-3xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-background/50 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 mb-4 selection:bg-primary">
                    <Sparkles size={12} className="text-primary" />
                    Next Generation SEO Intelligence
                </div>

                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground lg:leading-[1.1]">
                    The Semantic Bridge to <br />
                    <span className="text-primary cinematic-glow">Organic Domination.</span>
                </h1>

                <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed font-medium">
                    Ranktag transforms your documentation into high-ranking content using advanced LLM reasoning and real-time SERP intent mapping.
                </p>

                <div className="flex items-center justify-center gap-4 pt-4">
                    <Button onClick={onStart} size="lg" className="h-14 px-8 rounded-full text-sm font-bold shadow-xl shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95 group">
                        Create New Workspace
                        <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="outline" size="lg" className="h-14 px-8 rounded-full text-sm font-bold border-muted-foreground/20 hover:bg-background">
                        View Documentation
                    </Button>
                </div>
            </div>

            {/* Feature Bento Grid (Brief Overview) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                {[
                    {
                        icon: Search,
                        title: "Intent Mapping",
                        desc: "Deep analysis of search intent to ensure content matches what users are actually looking for."
                    },
                    {
                        icon: Activity,
                        title: "Semantic Analysis",
                        desc: "Building topical authority through content clusters and LSI keyword integration."
                    },
                    {
                        icon: FileCode,
                        title: "Technical Excellence",
                        desc: "Perfectly structured HTML with zero technical debt, optimized for Google's latest crawlers."
                    }
                ].map((feature, i) => (
                    <Card key={i} className="bento-card p-6 border-white/5 bg-white/5 backdrop-blur-sm transition-all hover:bg-white/10">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20">
                            <feature.icon size={20} />
                        </div>
                        <h3 className="font-bold text-sm tracking-tight mb-2">{feature.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
                    </Card>
                ))}
            </div>

            {/* Semantic Footer */}
            <div className="mt-20 pt-8 border-t w-full max-w-5xl flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                <div className="flex items-center gap-2">
                    <Hash size={14} className="text-primary/50" />
                    RANKTAG INTEL v2.4
                </div>
                <div className="flex items-center gap-6">
                    <span className="cursor-pointer hover:text-foreground transition-colors">Privacy</span>
                    <span className="cursor-pointer hover:text-foreground transition-colors">API</span>
                    <span className="cursor-pointer hover:text-foreground transition-colors">Status</span>
                </div>
            </div>
        </div>
    )
}
