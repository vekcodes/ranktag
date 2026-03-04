import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'
import { supabase } from './lib/supabase'

function App() {
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      console.error('Error fetching sessions:', err)
      // Fallback to mock data for demo
      setSessions([
        { id: '1', title: 'E-commerce SEO Strategy', timestamp: '2h ago', status: 'complete' },
        { id: '2', title: 'SaaS Landing Page Blog', timestamp: 'Yesterday', status: 'complete' },
        { id: '3', title: 'Tech Startup Article', timestamp: '3 days ago', status: 'complete' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const createNewSession = async () => {
    const newSessionData = {
      title: 'New SEO Project',
      status: 'active'
    }

    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([newSessionData])
        .select()

      if (error) throw error

      const session = data[0]
      setSessions(prev => [session, ...prev])
      setActiveSession(session.id)
    } catch (err) {
      console.error('Error creating session:', err)
      // Fallback for demo
      const mockSession = {
        id: Date.now().toString(),
        ...newSessionData,
        timestamp: 'Just now'
      }
      setSessions(prev => [mockSession, ...prev])
      setActiveSession(mockSession.id)
    }
  }

  const deleteSession = async (id) => {
    try {
      // Delete associated blogs first
      await supabase
        .from('blogs')
        .delete()
        .eq('session_id', id)

      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSessions(prev => prev.filter(s => s.id !== id))
      if (activeSession === id) {
        setActiveSession(null)
      }
    } catch (err) {
      console.error('Error deleting session:', err)
      // Local update for demo/unconnected environments
      setSessions(prev => prev.filter(s => s.id !== id))
      if (activeSession === id) setActiveSession(null)
    }
  }

  const renameSession = async (id, newTitle) => {
    try {
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ title: newTitle })
        .eq('id', id)

      if (sessionError) throw sessionError

      // Sync project title in blogs table
      await supabase
        .from('blogs')
        .update({ project: newTitle })
        .eq('session_id', id)

      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s))
    } catch (err) {
      console.error('Error renaming session:', err)
      // Local update for demo
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s))
    }
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        sessions={sessions}
        activeSession={activeSession}
        onSelectSession={setActiveSession}
        onNewSession={createNewSession}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        loading={loading}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-transparent">
        <MainPanel
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          activeSession={activeSession}
          onNewSession={createNewSession}
          onSessionUpdate={(id, updates) => {
            setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
          }}
        />
      </div>
    </div>
  )
}

export default App
