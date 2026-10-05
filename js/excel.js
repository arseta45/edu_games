let selectedExcelFile = null;

/**
 * Setup input Excel
 */
function initExcelImporter() {
  const input = document.getElementById("excelFile");

  const button = document.getElementById("importButton");

  input.addEventListener("change", (event) => {
    const file = event.target.files[0];

    selectedExcelFile = file || null;

    if (file) {
      document.getElementById("fileName").textContent = file.name;

      button.disabled = false;
    } else {
      document.getElementById("fileName").textContent =
        "Belum ada file dipilih";

      button.disabled = true;
    }
  });

  button.addEventListener("click", importExcel);
}

/**
 * Import Excel
 */
async function importExcel() {
  if (!selectedExcelFile) {
    return;
  }

  const result = document.getElementById("importResult");

  result.innerHTML = "⏳ Membaca file Excel...";

  try {
    const arrayBuffer = await selectedExcelFile.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
    });

    const sheetName = workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
    });

    if (!rows.length) {
      throw new Error("File Excel tidak memiliki data.");
    }

    let importedQuestions = 0;

    let bankCache = {};

    for (const row of rows) {
      const subject = String(row.mapel || "").trim();

      const className = String(row.kelas || "").trim();

      const bankName = String(row.materi || "Bank Soal").trim();

      const question = String(row.pertanyaan || "").trim();

      const optionA = String(row.opsi_a || "").trim();

      const optionB = String(row.opsi_b || "").trim();

      const optionC = String(row.opsi_c || "").trim();

      const optionD = String(row.opsi_d || "").trim();

      const correctAnswer = String(row.jawaban || "")
        .trim()
        .toUpperCase();

      /*
       * Validasi
       */

      if (
        !subject ||
        !className ||
        !question ||
        !optionA ||
        !optionB ||
        !optionC ||
        !optionD ||
        !correctAnswer
      ) {
        console.warn("Baris dilewati:", row);

        continue;
      }

      /*
       * Cari bank yang sudah ada
       */

      const cacheKey = `${subject}__${className}__${bankName}`;

      let bankId = bankCache[cacheKey];

      if (!bankId) {
        const existingBanks = await getAllBanks();

        const existing = existingBanks.find(
          (bank) =>
            bank.name === bankName &&
            bank.subject === subject &&
            String(bank.class) === String(className),
        );

        if (existing) {
          bankId = existing.id;
        } else {
          bankId = await addBank({
            name: bankName,

            subject,

            class: className,

            createdAt: new Date().toISOString(),
          });
        }

        bankCache[cacheKey] = bankId;
      }

      /*
       * Simpan soal
       */

      await addQuestion({
        bankId,

        subject,

        class: className,

        question,

        options: {
          A: optionA,

          B: optionB,

          C: optionC,

          D: optionD,
        },

        correctAnswer,

        createdAt: new Date().toISOString(),
      });

      importedQuestions++;
    }

    result.innerHTML = `
      <div class="success-message">
        ✅ Berhasil mengimport
        <strong>${importedQuestions}</strong>
        soal.
      </div>
    `;

    selectedExcelFile = null;

    document.getElementById("excelFile").value = "";

    document.getElementById("fileName").textContent = "Belum ada file dipilih";

    document.getElementById("importButton").disabled = true;

    await updateDashboardStats();
  } catch (error) {
    console.error(error);

    result.innerHTML = `
      <div class="error-message">
        ❌ Gagal import Excel:
        ${error.message}
      </div>
    `;
  }
}
