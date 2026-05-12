import * as admin from 'firebase-admin'
import path from 'path'
import fs from 'fs'

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH

if (!serviceAccountPath) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not set in your .env file')
}

const resolvedPath = path.resolve(serviceAccountPath)

if (!fs.existsSync(resolvedPath)) {
  throw new Error(
    `Firebase service account JSON not found at: ${resolvedPath}\n` +
    `Download it from Firebase Console → Project Settings → Service Accounts`
  )
}

const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  })
}

export const firebaseAdmin = admin
export const auth = admin.auth()
