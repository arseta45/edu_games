/**
 * =========================================================
 * EDU GAME - APP.JS
 * ========================================================= */

/* =========================================================
   INISIALISASI APLIKASI
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    /*
     * Database harus dibuka terlebih dahulu
     */
    await ensureDatabase();

    /*
     * Inisialisasi Excel importer
     */
    if (typeof initExcelImporter === "function") {
      initExcelImporter();
    }

    /*
     * Update statistik dashboard
     */
    await updateDashboardStats();

    console.log("EduGame siap digunakan.");
  } catch (error) {
    console.error("Gagal menjalankan aplikasi:", error);

    console.error("Nama error:", error?.name);

    console.error("Pesan error:", error?.message);

    alert(
      "Database tidak dapat dibuka. " +
        "Silakan cek Console browser untuk detail error.",
    );
  }
});

/* =========================================================
   NAVIGASI HALAMAN
   ========================================================= */

function showPage(pageId) {
  /*
   * Sembunyikan semua halaman
   */
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  /*
   * Tampilkan halaman yang dipilih
   */
  const page = document.getElementById(pageId);

  if (page) {
    page.classList.add("active");
  }

  /*
   * Kembali ke posisi paling atas
   */
  window.scrollTo(0, 0);
}

/* =========================================================
   UPDATE STATISTIK DASHBOARD
   ========================================================= */

async function updateDashboardStats() {
  try {
    /*
     * Pastikan database sudah siap
     */
    await ensureDatabase();

    /*
     * Ambil semua soal
     */
    const questions = await getAllQuestions();

    /*
     * Ambil semua bank soal
     */
    const banks = await getAllBanks();

    /*
     * Ambil daftar mata pelajaran unik
     */
    const subjects = new Set(
      questions
        .map((question) => String(question.subject || "").trim())
        .filter((subject) => subject !== ""),
    );

    /*
     * Total soal
     */
    const totalQuestions = document.getElementById("totalQuestions");

    if (totalQuestions) {
      totalQuestions.textContent = questions.length;
    }

    /*
     * Total mata pelajaran
     */
    const totalSubjects = document.getElementById("totalSubjects");

    if (totalSubjects) {
      totalSubjects.textContent = subjects.size;
    }

    /*
     * Total bank soal
     */
    const totalBanks = document.getElementById("totalBanks");

    if (totalBanks) {
      totalBanks.textContent = banks.length;
    }
  } catch (error) {
    console.error("Gagal memperbarui statistik:", error);

    throw error;
  }
}

/* =========================================================
   TAMPILKAN BANK SOAL
   ========================================================= */

async function showQuestionBanks() {
  try {
    /*
     * Pastikan database siap
     */
    await ensureDatabase();

    /*
     * Ambil semua bank
     */
    const banks = await getAllBanks();

    /*
     * Ambil container
     */
    const container = document.getElementById("bankList");

    if (!container) {
      console.warn("Element #bankList tidak ditemukan.");

      return;
    }

    /*
     * Kosongkan container
     */
    container.innerHTML = "";

    /*
     * Jika belum ada bank
     */
    if (!banks.length) {
      container.innerHTML = `
                <div class="empty-state">

                    <h3>
                        Belum ada bank soal
                    </h3>

                    <p>
                        Silakan import file Excel terlebih dahulu.
                    </p>

                </div>
            `;
    } else {
      /*
       * Tampilkan setiap bank
       */
      for (const bank of banks) {
        /*
         * Ambil jumlah soal
         */
        const questions = await getQuestionsByBank(bank.id);

        /*
         * Buat element bank
         */
        const item = document.createElement("div");

        item.className = "bank-item";

        /*
         * Isi HTML
         */
        item.innerHTML = `

                    <div>

                        <h3>
                            ${escapeHtml(bank.name || "")}
                        </h3>

                        <p>

                            ${escapeHtml(bank.subject || "")}

                            • Kelas

                            ${escapeHtml(bank.class || "")}

                            •

                            ${questions.length}
                            soal

                        </p>

                    </div>


                    <div class="bank-actions">

                        <span>
                            📚
                        </span>

                        <button
                            type="button"
                            class="delete-bank-button"
                        >
                            🗑️ Hapus
                        </button>

                    </div>

                `;

        /*
         * Tambahkan ke container
         */
        container.appendChild(item);

        /*
         * Tombol hapus
         */
        const deleteButton = item.querySelector(".delete-bank-button");

        deleteButton.addEventListener("click", async () => {
          /*
           * Konfirmasi
           */
          const confirmed = confirm(
            `Hapus bank soal "${bank.name}"?\n\n` +
              `Semua ${questions.length} soal di dalam bank ini juga akan dihapus.`,
          );

          if (!confirmed) {
            return;
          }

          try {
            /*
             * Disable tombol
             */
            deleteButton.disabled = true;

            deleteButton.textContent = "Menghapus...";

            /*
             * Hapus bank + soal
             */
            await deleteBank(bank.id);

            /*
             * Refresh daftar bank
             */
            await showQuestionBanks();

            /*
             * Refresh statistik
             */
            await updateDashboardStats();
          } catch (error) {
            console.error("Gagal menghapus bank soal:", error);

            alert("Gagal menghapus bank soal.");

            /*
             * Aktifkan kembali tombol
             */
            deleteButton.disabled = false;

            deleteButton.textContent = "🗑️ Hapus";
          }
        });
      }
    }

    /*
     * Tampilkan halaman bank soal
     */
    showPage("questionBankPage");
  } catch (error) {
    console.error("Gagal menampilkan bank soal:", error);

    alert("Gagal mengambil data bank soal.");
  }
}

/* =========================================================
   BUKA GAME
   ========================================================= */

function openGame(gameName) {
  if (gameName === "tarik-tambang") {
    window.location.href = "games/tarik-tambang.html";
    return;
  }

  if (gameName === "panjat-pinang") {
    window.location.href = "games/panjat-pinang.html";
    return;
  }

  if (gameName === "balap-karung") {
    window.location.href = "games/balap-karung.html";
    return;
  }

  console.warn("Game tidak ditemukan:", gameName);
}

/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");
}
