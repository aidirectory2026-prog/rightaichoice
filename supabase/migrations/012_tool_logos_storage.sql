-- Create storage bucket for tool logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tool-logos',
  'tool-logos',
  true,
  2097152, -- 2 MB max
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Public read access for all users
create policy "Public read access for tool logos"
  on storage.objects for select
  using (bucket_id = 'tool-logos');

-- Admins can upload/update/delete logos
create policy "Admins can upload tool logos"
  on storage.objects for insert
  with check (
    bucket_id = 'tool-logos'
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

create policy "Admins can update tool logos"
  on storage.objects for update
  using (
    bucket_id = 'tool-logos'
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

create policy "Admins can delete tool logos"
  on storage.objects for delete
  using (
    bucket_id = 'tool-logos'
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );
