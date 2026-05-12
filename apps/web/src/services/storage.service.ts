import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { firebaseAuth, firebaseStorage } from '@/lib/auth/firebase'

export async function uploadImageToFirebase(file: File): Promise<string> {
  const user = firebaseAuth.currentUser
  if (!user) throw new Error('Not authenticated')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const key = `listings/${user.uid}/${crypto.randomUUID()}.${ext}`
  const storageRef = ref(firebaseStorage, key)

  const snapshot = await uploadBytes(storageRef, file, { contentType: file.type })
  return getDownloadURL(snapshot.ref)
}
