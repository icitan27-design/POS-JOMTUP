import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ---------- หมวดหมู่ ----------
export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    setCategories(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  return { categories, loading, reload: load }
}

// ---------- เมนู ----------
export function useMenu() {
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('menu')
      .select('*, categories(name)')
      .order('created_at', { ascending: false })
    setMenu(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  return { menu, loading, reload: load }
}

// ---------- ตั้งค่าร้าน ----------
export function useSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
    setSettings(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  return { settings, loading, reload: load }
}
