-- ============================================================================
-- FRZZY STUDIO — PRODUCTION SUPABASE MIGRATION 003: STORAGE BUCKETS
-- Private Deliverables, Work Attachments & Public Review Avatars
-- ============================================================================

-- 1. CREATE STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('work-attachments', 'work-attachments', false, 104857600, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/zip', 'video/mp4', 'video/quicktime']),
    ('deliverables', 'deliverables', false, 524288000, ARRAY['application/zip', 'application/x-zip-compressed', 'video/mp4', 'video/quicktime', 'application/pdf']),
    ('review-avatars', 'review-avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. STORAGE POLICIES

-- Public Read for Review Avatars
CREATE POLICY "Public Read Review Avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'review-avatars');

-- Authenticated Upload for Review Avatars (Admin with reviews:write)
CREATE POLICY "Authenticated Upload Review Avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'review-avatars' AND
    (public.has_permission('reviews:write') OR public.is_superadmin())
);

-- Work Attachments (Private to authenticated staff)
CREATE POLICY "Staff Download Work Attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'work-attachments' AND
    (public.is_superadmin() OR public.has_permission('work_items:read_all') OR (auth.uid() IS NOT NULL))
);

CREATE POLICY "Staff Upload Work Attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'work-attachments' AND
    auth.uid() IS NOT NULL
);

-- Deliverables (Private to authenticated managers/superadmins)
CREATE POLICY "Staff Download Deliverables"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'deliverables' AND
    (public.is_superadmin() OR public.has_permission('work_items:deliver'))
);

CREATE POLICY "Staff Upload Deliverables"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'deliverables' AND
    (public.is_superadmin() OR public.has_permission('work_items:deliver'))
);
