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
    const [statusLog, setStatusLog] = useState([])

    const addStatus = (text, type = 'info') => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false })
        setStatusLog(prev => [...prev, { text, type, time }])
    }

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

            if (data && (data.status === 'complete' || data.status === 'complete_with_warnings')) {
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
        setStatusLog([])

        try {
            addStatus('Connected to Supabase', 'success')

            const { data: { user } } = await supabase.auth.getUser()
            const userId = user?.id || activeSession

            // STEP 1: Insert blogs row
            const blogId = crypto.randomUUID()
            addStatus('Creating blog record in database...', 'info')
            const { data: blogData, error: blogError } = await supabase
                .from('blogs')
                .insert([{
                    id: blogId,
                    title: formData.title,
                    content: '',
                    status: 'pending',
                    company_name: formData.companyName,
                    company_url: formData.companyUrl,
                    company_desc: formData.companyDesc,
                    session_id: activeSession,
                    project: formData.title,
                }])
                .select()
                .single()

            if (blogError) {
                addStatus(`Database error: ${blogError.message}`, 'error')
                blogError.dbError = true
                throw blogError
            }
            addStatus(`Blog row created (ID: ${blogId.slice(0, 8)}…)`, 'success')

            // STEP 2: Upload files to Supabase Storage then UPDATE blogs row
            const storagePaths = []
            const fileNames = []
            if (formData.companyFiles.length > 0) {
                addStatus(`Uploading ${formData.companyFiles.length} file(s) to Storage...`, 'info')
                for (let i = 0; i < formData.companyFiles.length; i++) {
                    const file = formData.companyFiles[i]
                    const fileExt = file.name.split('.').pop()
                    const filePath = `${userId}/${blogId}${formData.companyFiles.length > 1 ? `-${i}` : ''}.${fileExt}`

                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('company-docs')
                        .upload(filePath, file)

                    if (uploadError) {
                        addStatus(`Upload failed: ${file.name}`, 'error')
                        uploadError.storageError = true
                        throw uploadError
                    }
                    addStatus(`Uploaded: ${file.name}`, 'success')
                    storagePaths.push(uploadData.path)
                    fileNames.push(file.name)
                }

                await supabase
                    .from('blogs')
                    .update({ storage_paths: storagePaths, file_names: fileNames })
                    .eq('id', blogId)
            }

            // STEP 3: Parse sitemap and UPDATE internal_links
            if (formData.sitemapFile) {
                try {
                    addStatus('Parsing sitemap file…', 'info')
                    const xml = await formData.sitemapFile.text()
                    const doc = new DOMParser().parseFromString(xml, 'application/xml')
                    const links = Array.from(doc.querySelectorAll('loc')).map(el => ({ url: el.textContent.trim() }))
                    addStatus(`Sitemap parsed — ${links.length} URL(s) extracted`, 'success')

                    await supabase
                        .from('blogs')
                        .update({ internal_links: JSON.stringify(links) })
                        .eq('id', blogId)
                } catch (sitemapErr) {
                    addStatus('Sitemap parse failed — n8n will scrape automatically', 'warn')
                    console.warn('Sitemap parse error:', sitemapErr)
                }
            }

            await supabase
                .from('sessions')
                .update({ status: 'processing', title: formData.title })
                .eq('id', activeSession)

            if (onSessionUpdate) {
                onSessionUpdate(activeSession, { status: 'processing', title: formData.title })
            }

            // STEP 4: POST webhook
            addStatus('Firing webhook to AI pipeline...', 'info')
            let webhookOk = true
            try {
                const webhookRes = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: {
                            id: blogId,
                            storagePaths,
                            companyName: formData.companyName,
                            companyUrl: formData.companyUrl,
                            companyId: userId,
                        }
                    }),
                })
                const webhookJson = await webhookRes.json().catch(() => null)
                if (webhookJson && webhookJson.ok === false) {
                    const errMsg = webhookJson.error?.message || 'Webhook returned ok: false'
                    addStatus(`Webhook error: ${errMsg}`, 'error')
                    throw new Error(errMsg)
                }
                addStatus('Webhook accepted — AI generation has started', 'success')
            } catch (webhookErr) {
                webhookOk = false
                if (webhookErr.message?.includes('ok: false') || webhookErr.message?.includes('Webhook error')) {
                    throw webhookErr
                }
                addStatus('Webhook call failed (non-fatal — check n8n CORS)', 'warn')
                console.error('Webhook trigger failed:', webhookErr)
            }

            if (!webhookOk) return

            // STEP 5: Poll every 5s, 10-minute timeout
            const STATUS_LABELS = {
                pending: 'Starting generation...',
                outlining: 'Researching and building outline...',
                writing: 'Writing article...',
            }
            const DONE = new Set(['complete', 'complete_with_warnings', 'failed'])
            const TIMEOUT_MS = 10 * 60 * 1000
            const startTime = Date.now()

            addStatus('AI has started working on your blog…', 'info')

            let isReady = false
            while (!isReady) {
                if (Date.now() - startTime > TIMEOUT_MS) {
                    addStatus('Generation is taking longer than expected. Check back later.', 'warn')
                    break
                }

                await new Promise(resolve => setTimeout(resolve, 5000))

                const { data: pollData, error: pollError } = await supabase
                    .from('blogs')
                    .select('*')
                    .eq('id', blogId)
                    .single()

                if (pollError) {
                    addStatus('Checking status… (retrying)', 'warn')
                    continue
                }

                const currentStatus = pollData.status

                if (currentStatus === 'complete' || currentStatus === 'complete_with_warnings') {
                    isReady = true
                    if (currentStatus === 'complete_with_warnings') {
                        addStatus('Article generated with minor QA warnings', 'warn')
                    }
                    addStatus('Blog content is ready!', 'success')
                    setGeneratedBlog(pollData)
                } else if (currentStatus === 'failed') {
                    isReady = true
                    const errMsg = pollData.error_message || 'Generation failed. Please try again.'
                    addStatus(`Generation failed: ${errMsg}`, 'error')
                    throw new Error(errMsg)
                } else if (DONE.has(currentStatus)) {
                    isReady = true
                } else {
                    addStatus(STATUS_LABELS[currentStatus] || `Status: ${currentStatus}`, 'info')
                }
            }

        } catch (err) {
            console.error('Generation flow failed:', err)
            const errorMsg = err.message || 'Unknown error'
            if (err.storageError) {
                addStatus(`Storage error: ${errorMsg}`, 'error')
            } else if (err.dbError) {
                addStatus(`Database error: ${errorMsg}`, 'error')
            } else if (!err.storageError && !err.dbError) {
                addStatus(`Something went wrong: ${errorMsg}`, 'error')
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
                    <GeneratingView statusLog={statusLog} />
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

const STATUS_STYLES = {
    success: { dot: 'bg-emerald-500', text: 'text-emerald-400', icon: '✓' },
    info: { dot: 'bg-primary', text: 'text-muted-foreground', icon: '›' },
    warn: { dot: 'bg-yellow-500', text: 'text-yellow-400', icon: '⚠' },
    error: { dot: 'bg-red-500', text: 'text-red-400', icon: '✗' },
}

function GeneratingView({ statusLog = [] }) {
    const lastMsg = statusLog[statusLog.length - 1]

    return (
        <div className="flex-1 flex items-center justify-center min-h-[500px] p-6 animate-in fade-in duration-500">
            <div className="max-w-xl w-full flex flex-col gap-8">
                {/* Header */}
                <div className="flex items-center gap-5">
                    <div className="relative shrink-0">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Hash size={22} className="text-primary animate-pulse" />
                        </div>
                        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black tracking-tight text-foreground">Architecting Content</h3>
                        <p className="text-xs text-muted-foreground font-medium mt-1">
                            {lastMsg ? lastMsg.text : 'Initializing pipeline…'}
                        </p>
                    </div>
                </div>

                {/* Live log terminal */}
                <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
                    {/* Terminal title bar */}
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/30">
                        <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-2">
                            Supabase Live Log
                        </span>
                        <div className="ml-auto flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Connected</span>
                        </div>
                    </div>

                    {/* Log entries */}
                    <div className="p-4 space-y-2 min-h-[180px] max-h-[280px] overflow-y-auto font-mono">
                        {statusLog.length === 0 ? (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/40">
                                <span className="animate-pulse">_</span>
                                <span>Waiting for pipeline to start…</span>
                            </div>
                        ) : (
                            statusLog.map((entry, i) => {
                                const s = STATUS_STYLES[entry.type] || STATUS_STYLES.info
                                const isLast = i === statusLog.length - 1
                                return (
                                    <div
                                        key={i}
                                        className="flex items-start gap-2.5 text-[11px] animate-in fade-in slide-in-from-bottom-1 duration-300"
                                    >
                                        <span className="shrink-0 text-muted-foreground/40 tabular-nums pt-px">{entry.time}</span>
                                        <span className={`shrink-0 font-bold pt-px ${s.text}`}>{s.icon}</span>
                                        <span className={`leading-5 ${s.text} ${isLast ? 'font-semibold' : 'opacity-70'}`}>
                                            {entry.text}
                                        </span>
                                        {isLast && (
                                            <span className="shrink-0 inline-block w-1.5 h-3.5 bg-primary/70 animate-pulse ml-0.5 mt-px rounded-sm" />
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                <p className="text-center text-[10px] text-muted-foreground/40 font-medium uppercase tracking-widest">
                    Polling every 3s • Please keep this window open
                </p>
            </div>
        </div>
    )
}

