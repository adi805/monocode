# MonoCode di Windows: panduan OpenCrabs (ACP)

> Fork ini menjaga nama dan kode asli **MonoCode** (upstream: [hardbeat920/monocode](https://github.com/hardbeat920/monocode)) sebagai bentuk penghormatan.
> Tambahan fork ini: provider **OpenCrabs** first-class via ACP, katalog model live dari server, dan jembatan SSH (`opencrabs-bridge.exe`)
> supaya otak agent bisa jalan di mesin always-on (VPS) sendiri. Pola adapter mengikuti referensi [moneyacademyKE/monocode](https://github.com/moneyacademyKE/monocode).

## Arsitektur singkat

```
MonoCode (GUI Windows)
        |  spawn <binary> acp (stdio JSON-RPC)
        v
opencrabs-bridge.exe   (jembatan: stdin/stdout pump + ssh)
        |  ssh <host>
        v
opencrabs acp  (otak agent di VPS)
```

- Model picker: katalog LIVE dari server (`session/new` -> `models.availableModels`), di-probe otomatis, tidak perlu kirim pesan dulu.
- Sesi: persist di store VPS yang sama dengan TUI/bot, jadi riwayat kebaca dari semua channel.
- Approval (tool berbahaya, file write): muncul di GUI, gate server tetap jalan.

## Dua mode

| Mode | CLI path di Settings | Catatan |
|---|---|---|
| Lokal | kosongkan | auto-discover `opencrabs.exe` (PATH + lokasi standar Windows) |
| VPS (remote brain) | `C:\Users\<you>\opencrabs-bridge.exe` | semua eksekusi di server; GUI cuma jendela |

## Instalasi (mode VPS)

1. Unduh `MonoCode_0.5.0_x64-setup.exe` dari halaman **Releases** repo ini, lalu install. Kalau SmartScreen muncul: More info -> Run anyway (app belum ternama, bukan tanda malware).
2. Unduh `opencrabs-bridge.exe` (dari Releases repo `opencrabs-windows`, tag `win-desktop-preview`), taruh di `C:\Users\<you>\`.
3. Satu kali setup, arahkan jembatan ke server lo. Data ini disimpan di env Windows lo, TIDAK di dalam binary:
   ```powershell
   setx OPENCRABS_SSH_TARGET <alias-vps-lo>
   setx OPENCRABS_REMOTE_BIN /home/<user>/.opencrabs/opencrabs
   ```
   Tutup dan buka ulang PowerShell setelah `setx` supaya variabel aktif (app yang di-start dari Start Menu juga baca env user baru ini).
4. Pastikan SSH ke server jalan tanpa password:
   ```powershell
   ssh <alias-vps>
   ```
   Kalau muncul `Too many authentication failures`, berarti key mesin ini belum terdaftar di `~/.ssh/authorized_keys` di VPS. Daftarkan dulu, jangan lanjut.
5. Tes jembatan:
   ```powershell
   & C:\Users\<you>\opencrabs-bridge.exe --version
   # harus jawab: opencrabs-acp-bridge 0.5.4
   & C:\Users\<you>\opencrabs-bridge.exe --selftest
   # harus jawab: SELFTEST PASS: ssh round-trip through pump works
   ```
6. Buka MonoCode -> Settings -> provider **OpenCrabs** -> isi **CLI path** dengan path bridge -> save.
7. Chat baru -> pilih agent **OpenCrabs**. Koneksi pertama butuh 10 sampai 30 detik (SSH handshake + boot server sekitar 17 detik). Init timeout build ini 120 detik, jadi santai saja.
8. Verifikasi:
   - Model picker terisi katalog live dari server, tanpa perlu kirim pesan dulu.
   - Tanya: "sebut path absolut binary yang lagi lo jalanin". Jawaban benar: `/home/<user>/.opencrabs/opencrabs` (bukan path Windows).

## Mode lokal (tanpa VPS)

Kosongkan CLI path. MonoCode akan mencari `opencrabs.exe` sendiri. Binary Windows bisa diambil dari repo `opencrabs-windows` (artifact CI atau release).

## Troubleshooting

- **"opencrabs exited" / "did not start"**: jalankan `ssh <alias>` manual dari PowerShell. Hampir selalu penyebabnya key/alias SSH, bukan aplikasinya.
- **Timeout saat connect**: baca `%USERPROFILE%\opencrabs-bridge.log`. Baris `STDIN-FIRST` / `STDOUT-FIRST` plus hitungan byte (`in=..B out=..B`) menunjukkan frame mati di mana. `in=0B` berarti aplikasi tidak pernah menulis; byte mengalir tapi client tetap timeout berarti arah baliknya yang tersangkut.
- **Picker model kosong**: probe katalog jalan otomatis saat picker dibuka; server butuh 10 sampai 20 detik untuk boot. Tunggu, buka ulang picker.
- **Output server kotor** (JSON dengan byte aneh di depan): pastikan `.bashrc` / profil shell non-interaktif di VPS tidak melakukan `printf` apa pun ke stdout. Tes cepat: `ssh <alias> "echo MARK"`, output harus persis `MARK` saja.
- **Config lama pindah**: folder data aplikasi ini `%APPDATA%\com.monocode.desktop` (identitas asli MonoCode). Setelah pindah dari build lain, isi ulang CLI path sekali.

## Catatan build fork

- Installer dan aset hanya dari halaman **Releases** repo ini. Auto-update in-app membutuhkan bucket Cloudflare R2; di fork ini fitur tersebut dinonaktifkan, jadi update dilakukan manual dengan mengunduh installer terbaru.

## Kredit

- **MonoCode**: [hardbeat920/monocode](https://github.com/hardbeat920/monocode). Nama dan basis kode dipertahankan.
- Adapter OpenCrabs + panduan ini: fork [adi805/monocode](https://github.com/adi805/monocode); pola adapter mengikuti referensi [moneyacademyKE/monocode](https://github.com/moneyacademyKE/monocode).
