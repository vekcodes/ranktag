import { useState } from 'react'
import {
    Plus, MessageSquare, ChevronLeft, ChevronRight,
    Settings, MoreHorizontal,
    FileText, Star, Clock, Hash, Trash2, Edit3, Check, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export default function Sidebar({
    open,
    onToggle,
    sessions,
    activeSession,
    onSelectSession,
    onNewSession,
    onDeleteSession,
    onRenameSession,
    loading
}) {
    const [hoveredItem, setHoveredItem] = useState(null)
    const [actionMenuId, setActionMenuId] = useState(null)
    const [editingSessionId, setEditingSessionId] = useState(null)
    const [editingTitle, setEditingTitle] = useState('')

    const handleStartRename = (e, session) => {
        e.stopPropagation()
        setEditingSessionId(session.id)
        setEditingTitle(session.title)
        setActionMenuId(null)
    }

    const handleSaveRename = (e) => {
        e.stopPropagation()
        if (editingTitle.trim() && editingTitle !== sessions.find(s => s.id === editingSessionId)?.title) {
            onRenameSession(editingSessionId, editingTitle.trim())
        }
        setEditingSessionId(null)
    }

    const handleCancelRename = (e) => {
        e.stopPropagation()
        setEditingSessionId(null)
    }

    const handleDelete = (e, id) => {
        e.stopPropagation()
        if (confirm('Are you sure you want to delete this project?')) {
            onDeleteSession(id)
        }
        setActionMenuId(null)
    }

    return (
        <aside className={cn(
            "h-screen flex flex-col border-r bg-background transition-all duration-300 ease-in-out z-40",
            open ? "w-72" : "w-16"
        )}>
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                {open && (
                    <div className="flex items-center gap-2.5 px-1 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                            <Hash size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold tracking-tight text-foreground">Ranktag</span>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider opacity-60">SEO Intelligence</span>
                        </div>
                    </div>
                )}
                {!open && (
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto cursor-pointer shadow-lg shadow-primary/5" onClick={onToggle}>
                        <Hash size={18} strokeWidth={2.5} />
                    </div>
                )}
                {open && (
                    <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 text-muted-foreground translate-x-1 hover:bg-accent/50">
                        <ChevronLeft size={16} />
                    </Button>
                )}
            </div>

            {!open && (
                <div className="flex flex-col items-center gap-4 py-4 border-t mt-2">
                    <Button variant="ghost" size="icon" onClick={onToggle} className="h-10 w-10 text-muted-foreground">
                        <ChevronRight size={18} />
                    </Button>
                    <Separator className="w-8 mx-auto opacity-50" />
                    <Button variant="outline" size="icon" onClick={onNewSession} className="h-10 w-10 rounded-full shadow-lg border-primary/20 hover:bg-primary/10 transition-all text-primary">
                        <Plus size={18} />
                    </Button>
                </div>
            )}

            {/* New Project Button */}
            {open && (
                <div className="px-4 py-2">
                    <Button
                        onClick={onNewSession}
                        className="w-full justify-start gap-3 shadow-sm border bg-card hover:bg-accent/60 text-foreground transition-all active:scale-[0.98] font-bold h-11 px-4 rounded-xl border-border/50"
                        variant="outline"
                    >
                        <Plus size={16} className="text-primary" />
                        <span>New Project</span>
                    </Button>
                </div>
            )}

            {/* Navigation */}
            {open && (
                <div className="px-3 py-4 flex flex-col gap-1">
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-3 mb-1 opacity-50">
                        Workspaces
                    </div>
                    <Button variant="secondary" className="justify-start gap-3 bg-primary/5 text-foreground font-bold h-10 px-3 border-none rounded-xl">
                        <MessageSquare size={16} className="text-primary" />
                        <span>Recent Projects</span>
                    </Button>
                </div>
            )}

            {/* Session History */}
            <ScrollArea className="flex-1 px-3 mt-2">
                {open && (
                    <div className="space-y-1">
                        {loading ? (
                            <div className="space-y-3 p-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-9 w-full bg-muted/30 animate-pulse rounded-xl" />
                                ))}
                            </div>
                        ) : (
                            sessions.map(session => (
                                <div
                                    key={session.id}
                                    onMouseEnter={() => setHoveredItem(session.id)}
                                    onMouseLeave={() => {
                                        setHoveredItem(null)
                                        if (actionMenuId !== session.id) setActionMenuId(null)
                                    }}
                                    onClick={() => onSelectSession(session.id)}
                                    className={cn(
                                        "group relative flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all h-10",
                                        activeSession === session.id
                                            ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                    )}
                                >
                                    <Hash size={14} className={cn(
                                        "shrink-0 transition-opacity",
                                        activeSession === session.id ? "text-primary opacity-100" : "opacity-40"
                                    )} />

                                    {editingSessionId === session.id ? (
                                        <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                            <input
                                                autoFocus
                                                value={editingTitle}
                                                onChange={e => setEditingTitle(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveRename(e)
                                                    if (e.key === 'Escape') handleCancelRename(e)
                                                }}
                                                className="flex-1 bg-background border-primary/30 rounded px-2 py-0.5 text-sm font-medium outline-none border focus:ring-1 focus:ring-primary/20"
                                            />
                                            <button onClick={handleSaveRename} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded">
                                                <Check size={14} />
                                            </button>
                                            <button onClick={handleCancelRename} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-sm font-bold truncate flex-1 leading-none tracking-tight">
                                                {session.title}
                                            </span>

                                            {(hoveredItem === session.id || activeSession === session.id || actionMenuId === session.id) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setActionMenuId(actionMenuId === session.id ? null : session.id)
                                                    }}
                                                    className={cn(
                                                        "p-1 hover:bg-background rounded-md transition-all shadow-sm border border-transparent hover:border-border/50",
                                                        actionMenuId === session.id ? "bg-background border-border" : "opacity-0 group-hover:opacity-100"
                                                    )}
                                                >
                                                    <MoreHorizontal size={14} />
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {/* Action Menu */}
                                    <AnimatePresence>
                                        {actionMenuId === session.id && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                className="absolute right-3 top-10 z-50 w-36 bg-card border rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <button
                                                    onClick={(e) => handleStartRename(e, session)}
                                                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all"
                                                >
                                                    <Edit3 size={14} className="text-primary" />
                                                    Rename
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(e, session.id)}
                                                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t flex flex-col gap-4 bg-muted/5">
                <div className={cn(
                    "flex items-center gap-3",
                    !open && "justify-center px-0"
                )}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0 hover:bg-background border-transparent">
                        <Settings size={16} />
                    </Button>
                    {open && <span className="text-sm font-bold text-muted-foreground">Settings</span>}
                </div>

                {open && (
                    <div className="flex items-center gap-3 p-3 border rounded-2xl bg-card shadow-lg shadow-black/5 cinematic-glow relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                            <Star size={16} fill="currentColor" className="opacity-80" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-black leading-none truncate text-foreground tracking-tight">SEO PRO</span>
                            <span className="text-[10px] text-muted-foreground font-black mt-1.5 uppercase tracking-widest opacity-60">Admin Cluster</span>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    )
}
