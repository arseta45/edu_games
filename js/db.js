/**
 * =========================================================
 * EDU GAME - DATABASE
 * IndexedDB
 * ========================================================= */

const DB_NAME = "EduGameDB";
const DB_VERSION = 2;

let db = null;

/* =========================================================
   INIT DATABASE
   ========================================================= */

function initDatabase() {
  return new Promise((resolve, reject) => {
    /*
     * Jika database sudah terbuka,
     * langsung gunakan database tersebut.
     */
    if (db) {
      resolve(db);

      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    /* =================================================
           ERROR
           ================================================= */

    request.onerror = () => {
      console.error("Database gagal dibuka:", request.error);

      reject(request.error);
    };

    /* =================================================
           BLOCKED
           ================================================= */

    request.onblocked = () => {
      console.warn(
        "Database diblokir. " +
          "Tutup tab aplikasi EduGame lain yang masih terbuka.",
      );
    };

    /* =================================================
           UPGRADE DATABASE
           ================================================= */

    request.onupgradeneeded = (event) => {
      try {
        /*
         * PENTING:
         *
         * transaction diambil dari event.
         * Jangan menggunakan event.transaction
         * jika event tidak tersedia.
         */

        const database = event.target.result;

        const transaction = event.target.transaction;

        console.log(
          "Upgrade database:",
          event.oldVersion,
          "->",
          event.newVersion,
        );

        /* =========================================
                   BANK SOAL
                   ========================================= */

        let bankStore;

        if (!database.objectStoreNames.contains("banks")) {
          bankStore = database.createObjectStore("banks", {
            keyPath: "id",
            autoIncrement: true,
          });

          bankStore.createIndex("name", "name", {
            unique: false,
          });

          bankStore.createIndex("subject", "subject", {
            unique: false,
          });

          bankStore.createIndex("class", "class", {
            unique: false,
          });
        } else {
          bankStore = transaction.objectStore("banks");
        }

        /* =========================================
                   SOAL
                   ========================================= */

        let questionStore;

        if (!database.objectStoreNames.contains("questions")) {
          questionStore = database.createObjectStore("questions", {
            keyPath: "id",
            autoIncrement: true,
          });
        } else {
          questionStore = transaction.objectStore("questions");
        }

        /*
         * Index bankId
         */

        if (!questionStore.indexNames.contains("bankId")) {
          questionStore.createIndex("bankId", "bankId", {
            unique: false,
          });
        }

        /*
         * Index subject
         */

        if (!questionStore.indexNames.contains("subject")) {
          questionStore.createIndex("subject", "subject", {
            unique: false,
          });
        }

        /*
         * Index class
         */

        if (!questionStore.indexNames.contains("class")) {
          questionStore.createIndex("class", "class", {
            unique: false,
          });
        }

        /* =========================================
                   GAME HISTORY
                   ========================================= */

        if (!database.objectStoreNames.contains("gameHistory")) {
          database.createObjectStore("gameHistory", {
            keyPath: "id",
            autoIncrement: true,
          });
        }

        console.log("Struktur database berhasil dibuat.");
      } catch (error) {
        console.error("Error saat upgrade database:", error);

        /*
         * Lempar error supaya transaksi
         * IndexedDB dibatalkan dengan jelas.
         */
        throw error;
      }
    };

    /* =================================================
           SUCCESS
           ================================================= */

    request.onsuccess = () => {
      db = request.result;

      /*
       * Jika database dihapus/ditutup dari tempat lain
       */
      db.onversionchange = () => {
        db.close();

        db = null;

        console.warn("Database ditutup karena ada perubahan versi.");
      };

      console.log("Database berhasil dibuka:", DB_NAME);

      resolve(db);
    };
  });
}

/* =========================================================
   ENSURE DATABASE
   ========================================================= */

function ensureDatabase() {
  if (db) {
    return Promise.resolve(db);
  }

  return initDatabase();
}

/* =========================================================
   BANK
   ========================================================= */

async function addBank(bank) {
  await ensureDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["banks"], "readwrite");

    const store = transaction.objectStore("banks");

    const request = store.add({
      name: bank.name || "",

      subject: bank.subject || "",

      class: String(bank.class || ""),
    });

    request.onsuccess = () => {
      console.log("Bank berhasil ditambahkan:", request.result);

      resolve(request.result);
    };

    request.onerror = () => {
      console.error("Gagal menambahkan bank:", request.error);

      reject(request.error);
    };
  });
}

/* =========================================================
   AMBIL SEMUA BANK
   ========================================================= */

async function getAllBanks() {
  await ensureDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["banks"], "readonly");

    const store = transaction.objectStore("banks");

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================================================
   FILTER BANK
   ========================================================= */

async function getFilteredBanks(subject, className) {
  const banks = await getAllBanks();

  const result = banks.filter((bank) => {
    return (
      String(bank.subject || "").trim() === String(subject || "").trim() &&
      String(bank.class || "").trim() === String(className || "").trim()
    );
  });

  console.log("Bank hasil filter:", result);

  return result;
}

/* =========================================================
   SOAL
   ========================================================= */

async function addQuestion(question) {
  await ensureDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readwrite");

    const store = transaction.objectStore("questions");

    /*
     * Ambil options jika dikirim dalam format:
     *
     * options: {
     *   A: "...",
     *   B: "...",
     *   C: "...",
     *   D: "..."
     * }
     */
    const options = question.options || {};

    const data = {
      bankId: Number(question.bankId),

      subject: question.subject || question.mapel || "",

      class: String(question.class || question.kelas || ""),

      question: question.question || question.pertanyaan || "",

      /*
       * Bisa menerima:
       *
       * optionA
       *
       * atau
       *
       * options.A
       */
      optionA: question.optionA ?? question.opsi_a ?? options.A ?? "",

      optionB: question.optionB ?? question.opsi_b ?? options.B ?? "",

      optionC: question.optionC ?? question.opsi_c ?? options.C ?? "",

      optionD: question.optionD ?? question.opsi_d ?? options.D ?? "",

      /*
       * Bisa menerima:
       *
       * answer
       *
       * correctAnswer
       *
       * jawaban
       */
      answer:
        question.answer ?? question.correctAnswer ?? question.jawaban ?? "",

      createdAt: question.createdAt || new Date().toISOString(),
    };

    console.log("Menyimpan soal:", data);

    const request = store.add(data);

    request.onsuccess = () => {
      console.log("Soal berhasil ditambahkan:", request.result);

      resolve(request.result);
    };

    request.onerror = () => {
      console.error("Gagal menambahkan soal:", request.error);

      reject(request.error);
    };
  });
}

/* =========================================================
   AMBIL SOAL BERDASARKAN BANK
   ========================================================= */

async function getQuestionsByBank(bankId) {
  await ensureDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readonly");

    const store = transaction.objectStore("questions");

    const index = store.index("bankId");

    const id = Number(bankId);

    const request = index.getAll(IDBKeyRange.only(id));

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================================================
   AMBIL SEMUA SOAL
   ========================================================= */

async function getAllQuestions() {
  await ensureDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readonly");

    const store = transaction.objectStore("questions");

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================================================
   HAPUS BANK + SOAL
   ========================================================= */

async function deleteBank(bankId) {
  await ensureDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["banks", "questions"], "readwrite");

    const bankStore = transaction.objectStore("banks");

    const questionStore = transaction.objectStore("questions");

    const id = Number(bankId);

    /*
     * Hapus semua soal yang memiliki
     * bankId tersebut.
     */

    const index = questionStore.index("bankId");

    const request = index.openCursor(IDBKeyRange.only(id));

    request.onsuccess = (event) => {
      const cursor = event.target.result;

      if (cursor) {
        cursor.delete();

        cursor.continue();
      } else {
        /*
         * Setelah semua soal terhapus,
         * hapus bank.
         */

        bankStore.delete(id);
      }
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      resolve(true);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.onabort = () => {
      reject(transaction.error);
    };
  });
}

/* =========================================================
   GAME HISTORY
   ========================================================= */

async function saveGameHistory(history) {
  await ensureDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["gameHistory"], "readwrite");

    const store = transaction.objectStore("gameHistory");

    const request = store.add(history);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}
