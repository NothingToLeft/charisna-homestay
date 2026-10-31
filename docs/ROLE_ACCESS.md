# Owner dan petugas kebersihan

Owner masuk dengan akun Firebase `charisna.homestay@gmail.com`. Di **Kelola Petugas Kebersihan**, owner membuat nama, username, dan PIN 4 digit. Petugas memilih **Petugas kebersihan** pada halaman depan, lalu memasukkan username dan PIN. Petugas tidak dapat mendaftar sendiri.

Owner dapat melihat PIN yang terlupa, mengganti PIN dengan memasukkan PIN lama dan baru, mengubah nama, serta menonaktifkan akun. PIN disimpan sebagai teks di dokumen Firestore `users/{ownerUid}/staffPins/{staffUid}` yang hanya dapat dibaca owner menurut `firestore.rules`. Jangan tampilkan PIN di layar bersama. Profil staf tidak menyimpan PIN. Karena PIN 4 digit hanya memiliki 10.000 kombinasi, gunakan PIN berbeda per petugas dan nonaktifkan akun yang tidak dipakai. Firebase Authentication menangani percobaan login; UI tidak mengklaim pembatasan percobaan sendiri.

Owner dapat membuat tugas berisi properti, unit/area, tenggat, prioritas, dan instruksi. Portal petugas hanya membaca tugas yang ditugaskan kepadanya. Data penghuni, KTP, tagihan, dan keuangan tidak dibagikan kepada petugas.

Pembuatan akun memakai Firebase Authentication kedua dengan sesi sementara agar sesi owner tetap aktif. Email internal petugas dibentuk dari username; kata sandi Auth dibentuk dari username dan PIN. Pemilik tidak perlu mengisi email petugas. Jika akun Auth berhasil dibuat tetapi penulisan profil Firestore gagal, akun tersebut belum memiliki akses; gunakan username lain setelah memperbaiki koneksi.

Aturan `firestore.rules` perlu diterbitkan ke proyek `charisna-kost-manager` setelah perubahan. Email/Password di Firebase Authentication harus aktif. Tugas petugas memerlukan internet; antrean offline belum tersedia. Gunakan perangkat atau profil browser terpisah untuk owner dan petugas.
