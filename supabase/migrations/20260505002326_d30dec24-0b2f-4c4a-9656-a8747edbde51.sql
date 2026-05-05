ALTER TABLE public.client_packages
ADD CONSTRAINT client_packages_package_id_fkey
FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE;