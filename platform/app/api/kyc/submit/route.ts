import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ApiResponse } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const formData = await req.formData()
  const documentType = formData.get('document_type') as string
  const frontFile = formData.get('front') as File | null
  const backFile = formData.get('back') as File | null
  const selfieFile = formData.get('selfie') as File | null

  if (!documentType || !frontFile) {
    return NextResponse.json({ data: null, error: 'Document type and front image required' } satisfies ApiResponse<never>, { status: 400 })
  }

  const service = await createServiceClient()

  const { data: existingProfile } = await service.from('users').select('kyc_status').eq('id', user.id).single()
  if (existingProfile?.kyc_status === 'pending' || existingProfile?.kyc_status === 'verified') {
    return NextResponse.json({ data: null, error: 'KYC already submitted or verified' } satisfies ApiResponse<never>, { status: 400 })
  }

  async function uploadFile(file: File, name: string): Promise<string> {
    const bytes = await file.arrayBuffer()
    const path = `${user!.id}/${name}-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await service.storage.from('kyc-documents').upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    })
    if (error) throw new Error(`Upload failed: ${error.message}`)
    return path
  }

  let frontPath: string
  let backPath: string | null = null
  let selfiePath: string | null = null

  try {
    frontPath = await uploadFile(frontFile, 'front')
    if (backFile) backPath = await uploadFile(backFile, 'back')
    if (selfieFile) selfiePath = await uploadFile(selfieFile, 'selfie')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ data: null, error: msg } satisfies ApiResponse<never>, { status: 500 })
  }

  const { data: doc, error } = await service
    .from('kyc_documents')
    .insert({
      user_id: user.id,
      document_type: documentType,
      front_url: frontPath,
      back_url: backPath,
      selfie_url: selfiePath,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !doc) {
    return NextResponse.json({ data: null, error: 'Failed to submit KYC' } satisfies ApiResponse<never>, { status: 500 })
  }

  // Update user kyc_status to pending
  await service.from('users').update({ kyc_status: 'pending' }).eq('id', user.id)

  return NextResponse.json({ data: { id: doc.id }, error: null } satisfies ApiResponse<{ id: string }>)
}
