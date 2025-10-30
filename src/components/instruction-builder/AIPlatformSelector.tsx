'use client'

import { useEffect, useState } from 'react'
import { AIPlatform } from '@/types/instruction'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface AIPlatformSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function AIPlatformSelector({ value, onChange }: AIPlatformSelectorProps) {
  const [platforms, setPlatforms] = useState<AIPlatform[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlatforms()
  }, [])

  const fetchPlatforms = async () => {
    try {
      const response = await fetch('/api/ai-platforms')
      if (!response.ok) throw new Error('Failed to fetch AI platforms')
      const data = await response.json()
      setPlatforms(data || [])
    } catch (error) {
      console.error('Error fetching AI platforms:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="ai-platform">AI Platform</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="ai-platform">
          <SelectValue placeholder="Select an AI platform" />
        </SelectTrigger>
        <SelectContent>
          {platforms.map((platform) => (
            <SelectItem key={platform.id} value={platform.id}>
              {platform.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Choose the AI platform you're creating instructions for
      </p>
    </div>
  )
}
