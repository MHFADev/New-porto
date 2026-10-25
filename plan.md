# New-porto — Sertifikat & dashboard polish

## Keputusan implementasi
- Pertahankan visual playful editorial yang sudah menjadi identitas portfolio: dark indigo, cotton text, pink/cyan/yellow accents, chunky borders, dan motion yang sudah ada.
- Tambahkan sertifikat sebagai konten nyata, bukan vanity stat: section publik dengan kartu metadata, preview file, dan CTA verifikasi.
- Simpan metadata sertifikat di `project/meta.json` bersama project/profile yang sudah ada.
- Simpan file sertifikat di `project/certificates/` melalui GitHub storage yang sudah dipakai admin panel. Format PDF dan gambar didukung, maksimum 10 MB per file.
- Admin bisa upload, mengisi judul, issuer, tahun, deskripsi, URL verifikasi opsional, menghapus file, lalu menyimpan metadata dengan feedback loading/success/error.
- Public API membaca sertifikat dari storage dan metadata; jika storage belum dikonfigurasi, section tidak menampilkan placeholder palsu.
- Polish dashboard dengan ringkasan jumlah sertifikat, section tersendiri, label/form state yang lebih jelas, focus ring, dan touch target yang memadai.

## Struktur
- `src/lib/images.ts`: tipe metadata dan operasi GitHub storage sertifikat.
- `src/app/api/admin/data/route.ts`: load/save sertifikat terautentikasi.
- `src/app/api/admin/certificates/route.ts`: upload/delete file sertifikat.
- `src/app/api/certificates/route.ts`: daftar sertifikat publik.
- `src/app/admin/page.tsx`: editor sertifikat dan ringkasan dashboard.
- `src/components/Portfolio.tsx`: section publik, nav, rail, dan fetching data.
- `src/app/globals.css`: gaya kartu sertifikat yang mengikuti bahasa visual existing.
