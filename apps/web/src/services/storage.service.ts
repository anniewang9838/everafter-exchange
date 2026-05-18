// Mock uploader — resizes the file to a compressed JPEG data URL in-browser.
// Swap this implementation for a real S3/Firebase upload when storage is ready.
export async function uploadImageToFirebase(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      const MAX = 800
      let w = img.width
      let h = img.height
      if (w > h) {
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX }
      } else {
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.65))
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}
