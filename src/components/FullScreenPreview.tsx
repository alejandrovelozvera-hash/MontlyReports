import { useEffect, useState } from 'react'

interface Props {
  images: Design[]
  index: number
  onClose: () => void
}

export default function FullScreenPreview({ images, index, onClose }: Props) {
  const [current, setCurrent] = useState(index)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setCurrent((p) => (p > 0 ? p - 1 : images.length - 1))
      if (e.key === 'ArrowRight') setCurrent((p) => (p < images.length - 1 ? p + 1 : 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [images.length, onClose])

  const img = images[current]

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors z-10">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>

      <button onClick={(e) => { e.stopPropagation(); setCurrent((p) => (p > 0 ? p - 1 : images.length - 1)) }}
        className="absolute left-4 p-2 rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors z-10">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>

      <div className="max-w-[90vw] max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img src={window.electronAPI.getImageUrl(img.file_path)} alt={img.title}
          className="max-w-full max-h-[85vh] object-contain rounded-lg" />
        <div className="mt-3 text-center">
          <p className="text-white font-medium">{img.title}</p>
          {img.category && <p className="text-white/60 text-sm">{img.category}</p>}
          <p className="text-white/40 text-xs mt-1">{current + 1} / {images.length}</p>
        </div>
      </div>

      <button onClick={(e) => { e.stopPropagation(); setCurrent((p) => (p < images.length - 1 ? p + 1 : 0)) }}
        className="absolute right-4 p-2 rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors z-10">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  )
}
