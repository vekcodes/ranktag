import { useState, useEffect } from 'react'
import { Menu, Zap, Sparkles, Hash, LayoutGrid, Activity, Info } from 'lucide-react'
import SEOPipeline from './SEOPipeline'
import BlogOutput from './BlogOutput'
import WelcomeScreen from './WelcomeScreen'
import { supabase } from '../lib/supabase'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function MainPanel({ sidebarOpen, onToggleSidebar, activeSession, onNewSession, onSessionUpdate }) {
    const [generatedBlog, setGeneratedBlog] = useState(null)
    const [generating, setGenerating] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (activeSession) {
            fetchBlogForSession(activeSession)
        } else {
            setGeneratedBlog(null)
        }
    }, [activeSession])

    const fetchBlogForSession = async (sessionId) => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('blogs')
                .select('*')
                .eq('session_id', sessionId)
                .single()

            if (error && error.code !== 'PGRST116') throw error

            // Only set the blog if it's ready from AI
            if (data && data.content_from_ai) {
                setGeneratedBlog(data)
            } else {
                setGeneratedBlog(null)
            }
        } catch (err) {
            console.error('Error fetching blog:', err)
        } finally {
            setLoading(false)
        }
    }

    const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL

    const handleGenerate = async (formData) => {
        setGenerating(true)
        setGeneratedBlog(null)

        try {
            const storagePaths = []
            for (const file of formData.companyFiles) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `${activeSession}/${fileName}`

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('company-docs')
                    .upload(filePath, file)

                if (uploadError) {
                    uploadError.storageError = true
                    throw uploadError
                }
                storagePaths.push(uploadData.path)
            }

            const newBlogInput = {
                session_id: activeSession,
                title: formData.title,
                project: formData.title, // Add project column
                content: generateMockBlog(formData),
                company_name: formData.companyName,
                company_url: formData.companyUrl,
                file_names: formData.companyFiles.map(f => f.name),
                storage_paths: storagePaths,
                seo_score: Math.floor(Math.random() * 15) + 82,
                keywords: ['SEO', 'content marketing', 'digital strategy', 'organic traffic'],
                read_time: Math.floor(Math.random() * 5) + 5,
                word_count: Math.floor(Math.random() * 500) + 1200,
            }

            const { data: blogData, error: blogError } = await supabase
                .from('blogs')
                .insert([newBlogInput])
                .select()
                .single()

            if (blogError) {
                blogError.dbError = true
                throw blogError
            }

            await supabase
                .from('sessions')
                .update({
                    status: 'complete',
                    title: formData.title
                })
                .eq('id', activeSession)

            if (onSessionUpdate) {
                onSessionUpdate(activeSession, { status: 'complete', title: formData.title })
            }

            try {
                const params = new URLSearchParams()
                params.append('id', blogData.id)
                params.append('title', blogData.title)
                params.append('companyName', blogData.company_name)
                params.append('companyUrl', blogData.company_url)
                blogData.file_names.forEach(name => params.append('fileNames[]', name))
                storagePaths.forEach(path => params.append('storagePaths[]', path))

                await fetch(`${WEBHOOK_URL}?${params.toString()}`, {
                    method: 'GET',
                    mode: 'no-cors',
                })
            } catch (webhookErr) {
                console.error('Webhook trigger failed:', webhookErr)
            }

            // Polling logic: Wait for AI to complete
            let isReady = false
            let pollingAttempts = 0
            const maxAttempts = 60 // 3 minutes max

            while (!isReady && pollingAttempts < maxAttempts) {
                pollingAttempts++
                await new Promise(resolve => setTimeout(resolve, 3000)) // 3s delay

                const { data: pollData, error: pollError } = await supabase
                    .from('blogs')
                    .select('*')
                    .eq('id', blogData.id)
                    .single()

                if (pollError) {
                    console.error('Polling error:', pollError)
                    continue
                }

                if (pollData.content_from_ai) {
                    isReady = true
                    setGeneratedBlog(pollData)
                }
            }

            if (!isReady) {
                throw new Error('AI Generation timed out. Please check your project later.')
            }
        } catch (err) {
            console.error('Generation flow failed:', err)
            const errorMsg = err.message || 'Unknown error'
            if (err.storageError) {
                alert(`Supabase Storage Error: ${errorMsg}`)
            } else if (err.dbError) {
                alert(`Supabase Database Error: ${errorMsg}`)
            } else {
                alert(`Generation failed: ${errorMsg}`)
            }
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-transparent overflow-hidden">
            {/* Top bar */}
            <header className="h-14 border-b flex items-center justify-between px-6 bg-background/80 backdrop-blur-md z-30 sticky top-0">
                <div className="flex items-center gap-4">
                    {!sidebarOpen && (
                        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-8 w-8 text-muted-foreground">
                            <Menu size={18} />
                        </Button>
                    )}
                    <div className="flex items-center gap-2">
                        {!sidebarOpen && (
                            <div className="flex items-center gap-2 pr-2 border-r mr-2">
                                <Hash size={16} className="text-primary" />
                                <span className="text-sm font-bold tracking-tight">Ranktag</span>
                            </div>
                        )}
                        <h2 className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">
                            <LayoutGrid size={14} />
                            <span>Workspace</span>
                            <span className="mx-1.5 text-border">/</span>
                            <span className="text-foreground font-semibold">Project Overview</span>
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        AI Pipeline Ready
                    </div>
                    <Button onClick={onNewSession} className="h-8 gap-2 bg-primary text-primary-foreground shadow-sm hover:translate-y-[-1px] transition-transform">
                        <Sparkles size={14} />
                        <span className="text-xs font-semibold">New Project</span>
                    </Button>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in-95">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-medium text-muted-foreground tracking-tight">Syncing workspace data...</p>
                    </div>
                ) : !activeSession && !generatedBlog ? (
                    <div className="h-full">
                        <WelcomeScreen onStart={onNewSession} />
                    </div>
                ) : generatedBlog ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <BlogOutput blog={generatedBlog} />
                    </div>
                ) : generating ? (
                    <GeneratingView />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
                        {/* Bento Main Item: Input Pipeline */}
                        <div className="lg:col-span-8 space-y-6">
                            <Card className="p-6 bento-card shadow-lg bg-card/80 border-primary/5">
                                <div className="flex items-center justify-between mb-8 pb-4 border-b border-dashed">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                                            <Activity size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold tracking-tight text-foreground">SEO Generation Pipeline</h3>
                                            <p className="text-xs text-muted-foreground font-medium">Configure parameters to generate high-ranking content</p>
                                        </div>
                                    </div>
                                    <div className="px-2.5 py-1 rounded-md bg-muted/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Step 01 / 03
                                    </div>
                                </div>
                                <SEOPipeline onGenerate={handleGenerate} loading={generating} />
                            </Card>
                        </div>

                        {/* Bento Sidebar items */}
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="p-5 bento-card bg-primary/5 text-foreground border border-primary/20">
                                <div className="flex items-center gap-3 mb-4">
                                    <Zap size={18} fill="currentColor" className="text-primary" />
                                    <h4 className="font-bold tracking-tight">Pro Insights</h4>
                                </div>
                                <p className="text-[13px] opacity-90 leading-relaxed font-medium">
                                    Our engine uses semantic mapping and real-time SERP data to ensure your blogs aren't just content—they're assets.
                                </p>
                            </Card>

                            <Card className="p-5 bento-card border-dashed">
                                <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                                    <Info size={16} />
                                    <h4 className="text-sm font-bold uppercase tracking-widest">Metadata</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-medium opacity-60">Engine Version</span>
                                        <span className="font-bold text-foreground">v2.4.0 cinematic</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-medium opacity-60 text-muted-foreground">Last Generated</span>
                                        <span className="font-bold italic text-muted-foreground/60">Never in this session</span>
                                    </div>
                                </div>
                            </Card>

                            <div className="rounded-2xl border bg-accent/20 p-6 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden group border-accent/30">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-12 h-12 rounded-full bg-background/50 flex items-center justify-center border shadow-sm mb-2">
                                    <Sparkles size={20} className="text-primary" />
                                </div>
                                <h5 className="font-bold text-sm tracking-tight text-foreground">Rank higher with Ranktag</h5>
                                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[200px] font-medium">
                                    Analyze keywords and build content clusters in minutes.
                                </p>
                                <Button variant="secondary" size="sm" className="mt-2 text-[11px] font-extrabold uppercase tracking-widest h-8 px-6">
                                    Learn More
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

function GeneratingView() {
    return (
        <div className="flex-1 flex items-center justify-center min-h-[500px] animate-in fade-in duration-500">
            <div className="max-w-md w-full p-10 rounded-3xl border bg-card shadow-2xl flex flex-col items-center text-center gap-8">
                <div className="relative">
                    {/* Outer ring */}
                    <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    {/* Inner pulsing icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Hash size={26} className="text-primary animate-pulse" />
                    </div>
                    {/* Glow */}
                    <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse" />
                </div>

                <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight text-foreground">Architecting Content</h3>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                        Ranktag AI is crafting your blog. This may take a minute—please keep this window open.
                    </p>
                </div>

                <div className="w-full space-y-3">
                    {[
                        { label: 'Uploading Sources', icon: '📄' },
                        { label: 'Analyzing SERP Signals', icon: '📡' },
                        { label: 'Weighting Semantic Clusters', icon: '🧠' },
                        { label: 'Waiting for AI Response', icon: '⏳' },
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 px-4 py-3 rounded-xl border border-transparent animate-in fade-in slide-in-from-left-2"
                            style={{ animationDelay: `${i * 0.15}s` }}
                        >
                            <span className="text-base">{item.icon}</span>
                            <span className="flex-1 text-left">{item.label}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        </div>
                    ))}
                </div>

                <p className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-widest">
                    Polling for completion • Checking every 3s
                </p>
            </div>
        </div>
    )
}

function generateMockBlog({ title, companyName }) {
    return `# ${title}\n\n## Introduction\n\nRanktag provides a strategic edge in the evolving SEO landscape. ${companyName ? `At ${companyName}, we leverage` : 'Our platform leverages'} advanced semantic mapping...`
}
