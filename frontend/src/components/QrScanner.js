import React, { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

const MAX_WIDTH = 640
const REPEAT_GAP_MS = 1500

// Mở camera sau và gọi onScan(text) mỗi khi thấy một mã QR mới
const QrScanner = ({ onScan, active = true }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const onScanRef = useRef(onScan)
  const lastRef = useRef({ text: '', seen: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!active) return undefined
    let stream = null
    let raf = 0
    let stopped = false

    const tick = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const scale = Math.min(1, MAX_WIDTH / video.videoWidth)
        const w = Math.round(video.videoWidth * scale)
        const h = Math.round(video.videoHeight * scale)
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, 0, 0, w, h)
        const img = ctx.getImageData(0, 0, w, h)
        const found = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
        if (found && found.data) {
          const now = Date.now()
          const last = lastRef.current
          // Giữ nguyên một tem trước camera chỉ tính một lần
          const repeated = found.data === last.text && now - last.seen < REPEAT_GAP_MS
          lastRef.current = { text: found.data, seen: now }
          if (!repeated) onScanRef.current(found.data)
        }
      }
      raf = requestAnimationFrame(tick)
    }

    const start = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Trình duyệt không mở được camera. Cần truy cập bằng HTTPS hoặc localhost.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        tick()
      } catch (e) {
        setError(`Không mở được camera: ${e.message || e.name}`)
      }
    }
    start()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [active])

  if (!active) return null
  if (error) return <div style={{ color: '#ff9b9b', fontSize: 13 }}>{error}</div>

  return (
    <div style={{ position: 'relative', maxWidth: 420, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(51,255,204,0.35)' }}>
      <video ref={videoRef} muted playsInline style={{ width: '100%', display: 'block', background: '#000' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default QrScanner
