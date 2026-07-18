import { useState, useEffect } from 'react'

interface Props {
  src: string
  alt?: string
  className?: string
  style?: React.CSSProperties
}

export default function SafeImage({ src, alt = '', className, style }: Props) {
  const [dataUri, setDataUri] = useState<string | null>(null)

  useEffect(() => {
    if (!src) { setDataUri(null); return }
    if (src.startsWith('http')) { setDataUri(src); return }
    window.electronAPI.readImageBase64(src).then((d: string | null) => setDataUri(d))
  }, [src])

  if (!dataUri) {
    return <div className={`bg-surface-100 dark:bg-surface-800 ${className || ''}`} style={style} />
  }

  return <img src={dataUri} alt={alt} className={className} style={style} />
}