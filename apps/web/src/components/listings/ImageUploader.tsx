'use client'

import { useRef, useState } from 'react'
import { uploadImageToFirebase } from '@/services/storage.service'

interface Props {
  value: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
}

export function ImageUploader({ value, onChange, maxImages = 5 }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    const remaining = maxImages - value.length
    const toUpload = Array.from(files).slice(0, remaining)
    if (!toUpload.length) return

    setUploading(true)
    setError(null)
    try {
      const urls = await Promise.all(toUpload.map(uploadImageToFirebase))
      onChange([...value, ...urls])
    } catch (err) {
      console.error('Image upload error:', err)
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div key={url} className="relative h-24 w-24 overflow-hidden rounded-lg border border-taupe-300">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white hover:bg-black/70"
            >
              ×
            </button>
          </div>
        ))}

        {value.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-taupe-300 text-stone-400 transition-colors hover:border-sage-400 hover:text-sage-500 disabled:opacity-50"
          >
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-sage-500 border-t-transparent" />
            ) : (
              <>
                <span className="text-xl leading-none">+</span>
                <span className="text-xs">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-stone-400">Up to {maxImages} photos — JPG, PNG, or WebP.</p>
    </div>
  )
}
