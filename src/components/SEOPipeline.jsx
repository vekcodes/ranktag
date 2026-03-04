import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
    FileText, Upload, X, Sparkles, Globe, BookOpen, ChevronRight, Hash, Check, Activity
} from 'lucide-react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function SEOPipeline({ onGenerate, loading }) {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        title: '',
        companyName: '',
        companyFiles: [],
        companyUrl: '',
    })
    const [fileError, setFileError] = useState('')

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        },
        maxSize: 10 * 1024 * 1024,
        onDrop: (accepted, rejected) => {
            if (rejected.length) setFileError('Rejected: max 10MB, PDF/DOC/TXT only')
            else setFileError('')
            setFormData(d => ({ ...d, companyFiles: [...d.companyFiles, ...accepted] }))
        }
    })

    const removeFile = (index) => {
        setFormData(d => ({ ...d, companyFiles: d.companyFiles.filter((_, i) => i !== index) }))
    }

    const canProceed = () => {
        if (step === 1) return formData.title.trim().length > 5
        if (step === 2) return formData.companyFiles.length > 0 || formData.companyUrl.trim() || formData.companyName.trim()
        return true
    }

    const handleGenerate = async () => {
        const payload = {
            title: formData.title,
            companyName: formData.companyName,
            companyUrl: formData.companyUrl,
            companyFiles: formData.companyFiles,
            timestamp: new Date().toISOString(),
        }
        onGenerate(payload)
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Minimal Stepper */}
            <div className="flex items-center gap-4">
                {[1, 2].map((n) => (
                    <div key={n} className="flex items-center gap-3 group">
                        <div className={cn(
                            "w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all",
                            step === n ? "bg-primary/10 text-primary border-primary shadow-lg shadow-primary/10 scale-110" :
                                step > n ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-background text-muted-foreground border-border"
                        )}>
                            {step > n ? <Check size={14} strokeWidth={3} /> : n}
                        </div>
                        <span className={cn(
                            "text-xs font-bold uppercase tracking-widest transition-colors",
                            step === n ? "text-foreground" : "text-muted-foreground/60"
                        )}>
                            {n === 1 ? 'Concept' : 'Context'}
                        </span>
                        {n === 1 && <div className="w-12 h-px bg-border mx-2" />}
                    </div>
                ))}
            </div>

            <div className="min-h-[320px]">
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 shadow-none">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Master Topic / Headline</label>
                            <div className="relative group">
                                <textarea
                                    className="w-full min-h-[140px] bg-muted/20 border-border/50 rounded-2xl p-6 text-xl font-semibold tracking-tight focus:ring-1 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none placeholder:text-muted-foreground/30 leading-snug"
                                    placeholder='e.g. "10 Proven Strategies to Triple Your Organic Growth"'
                                    value={formData.title}
                                    onChange={e => setFormData(d => ({ ...d, title: e.target.value }))}
                                />
                                <div className="absolute bottom-4 right-6 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                                    {formData.title.length} Characters
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground/60 font-medium px-1">Tip: Be specific. Use numbers and power words for better SEO reasoning.</p>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 shadow-none">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Entity Name</label>
                                    <input
                                        className="w-full bg-muted/20 border-border/50 rounded-xl h-11 px-4 text-sm font-semibold focus:ring-1 focus:ring-primary/20 transition-all"
                                        placeholder="e.g. Acme Intelligence"
                                        value={formData.companyName}
                                        onChange={e => setFormData(d => ({ ...d, companyName: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Source URL</label>
                                    <div className="relative">
                                        <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                                        <input
                                            className="w-full bg-muted/20 border-border/50 rounded-xl h-11 pl-10 pr-4 text-sm font-semibold focus:ring-1 focus:ring-primary/20 transition-all"
                                            placeholder="https://..."
                                            value={formData.companyUrl}
                                            onChange={e => setFormData(d => ({ ...d, companyUrl: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Knowledge Base (Files)</label>
                                <div
                                    {...getRootProps()}
                                    className={cn(
                                        "h-[128px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group",
                                        isDragActive ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/30 hover:bg-muted/10"
                                    )}
                                >
                                    <input {...getInputProps()} />
                                    <Upload size={20} className={cn("transition-transform group-hover:-translate-y-1", isDragActive ? "text-primary" : "text-muted-foreground/40")} />
                                    <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Click or Drag Sources</span>
                                </div>
                                {fileError && <p className="text-[10px] text-destructive font-bold">{fileError}</p>}
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {formData.companyFiles.map((file, i) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border text-[11px] font-bold animate-in zoom-in-95">
                                            <FileText size={12} className="text-primary" />
                                            <span className="max-w-[100px] truncate opacity-80">{file.name}</span>
                                            <button onClick={() => removeFile(i)} className="p-0.5 hover:bg-muted rounded ml-1 transition-colors">
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Separator className="border-border/30" />

            {/* Stepper Footer */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 text-[10px] font-bold uppercase tracking-widest text-primary/80">
                    <Activity size={10} />
                    Engine Readiness 100%
                </div>

                <div className="flex items-center gap-3">
                    {step > 1 && (
                        <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="h-10 px-6 font-bold text-xs uppercase tracking-widest border-transparent">
                            Previous
                        </Button>
                    )}
                    {step < 2 ? (
                        <Button
                            disabled={!canProceed()}
                            onClick={() => setStep(2)}
                            className="h-10 px-8 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/10"
                        >
                            Next Step
                            <ChevronRight size={14} className="ml-1" />
                        </Button>
                    ) : (
                        <Button
                            disabled={!canProceed() || loading}
                            onClick={handleGenerate}
                            className="h-10 px-10 rounded-xl font-bold text-xs uppercase tracking-widest bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/10 relative group hover:bg-primary"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" /> : <Sparkles size={14} className="mr-2 group-hover:scale-125 transition-transform" />}
                            <span>Begin Synthesis</span>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
