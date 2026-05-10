export const BUILD_INFO = {
  commit: (import.meta.env.VITE_COMMIT_SHA as string) ?? "dev",
  built_at: (import.meta.env.VITE_BUILT_AT as string) ?? new Date().toISOString(),
};

if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.log(
    "%c ClinicPro Build %c " + BUILD_INFO.commit.slice(0, 7) + " %c " + BUILD_INFO.built_at,
    "background: #9333ea; color: white; padding: 2px 6px; border-radius: 4px",
    "background: #d946ef; color: white; padding: 2px 6px",
    "color: gray"
  );
}
