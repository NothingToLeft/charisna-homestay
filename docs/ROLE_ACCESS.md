# Owner dan petugas kebersihan

Owner CHARISNA KOST memakai akun Firebase `charisna.homestay@gmail.com`. Halaman login menyediakan pilihan **Pemilik** dan **Petugas kebersihan**. Pilihan tampilan tidak memberi hak akses; Firestore Rules dan profil petugas yang disetujui menentukan peran sesungguhnya.

## Alur petugas

1. Pilih **Petugas kebersihan**, isi email dan password minimal 8 karakter, lalu tekan **Daftar sebagai petugas**.
2. Akun menunggu persetujuan. Owner buka **Petugas Kebersihan** dan setujui permintaan.
3. Petugas tekan **Periksa persetujuan**, lalu melihat tugasnya. Status dapat diubah menjadi **Mulai** atau **Selesai** dengan catatan.

Owner dapat membuat tugas berisi properti, unit/area, tenggat, prioritas, dan instruksi. Owner juga dapat menonaktifkan akun petugas. Portal petugas hanya membaca tugas yang ditugaskan kepadanya. Data penghuni, KTP, tagihan, dan keuangan tidak dibagikan melalui aturan baru.

## Aktivasi Firebase

Aturan di `firestore.rules` harus diterbitkan ke project `charisna-kost-manager` sebelum pendaftaran/penugasan dipakai. Buka Firebase Console dengan akun yang punya akses project, lalu buka Firestore Database > Rules. Bandingkan aturan aktif dengan `firestore.rules`; terbitkan aturan yang sudah ditinjau. Alternatifnya, jalankan `scripts/windows/DEPLOY_FIREBASE_RULES.bat` setelah Firebase CLI login. Jangan kirim password atau token login ke chat. Aktifkan Email/Password di Firebase Authentication.

Aplikasi petugas memerlukan internet untuk tugas dan perubahan status. Belum ada antrean offline. Data owner yang sudah tersimpan lokal di perangkat bersama belum dienkripsi; gunakan perangkat atau profil browser terpisah untuk akun owner dan petugas.
