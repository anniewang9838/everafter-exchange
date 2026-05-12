import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'
import path from 'path'

if (!process.env.S3_BUCKET_NAME) throw new Error('S3_BUCKET_NAME is not configured')

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.S3_BUCKET_NAME
const REGION = process.env.AWS_REGION ?? 'us-east-1'

export async function getPresignedUploadUrl(
  userId: string,
  originalFilename: string,
  contentType: string,
): Promise<{ uploadUrl: string; imageUrl: string }> {
  const ext = path.extname(originalFilename) || '.jpg'
  const key = `listings/${userId}/${crypto.randomUUID()}${ext}`

  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
  const imageUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`

  return { uploadUrl, imageUrl }
}
