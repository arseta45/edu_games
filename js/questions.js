/**
 * Mengambil semua mapel unik
 */
async function getSubjects() {

  const questions =
    await getAllQuestions();

  const subjects =
    [...new Set(
      questions
        .map(q => q.subject)
        .filter(Boolean)
    )];

  return subjects.sort();
}


/**
 * Mengambil semua kelas unik
 */
async function getClasses(subject = null) {

  const questions =
    await getAllQuestions();

  let filtered = questions;

  if (subject) {

    filtered =
      questions.filter(
        q => q.subject === subject
      );

  }

  const classes =
    [...new Set(
      filtered
        .map(q => String(q.class))
        .filter(Boolean)
    )];

  return classes.sort(
    (a, b) =>
      Number(a) - Number(b)
  );
}


/**
 * Mengambil bank berdasarkan filter
 */
async function getFilteredBanks(
  subject,
  className
) {

  const banks =
    await getAllBanks();

  return banks.filter(bank => {

    const matchSubject =
      !subject ||
      bank.subject === subject;

    const matchClass =
      !className ||
      String(bank.class) ===
      String(className);

    return (
      matchSubject &&
      matchClass
    );

  });

}


/**
 * Mengacak array
 */
function shuffleArray(array) {

  const result =
    [...array];

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    [
      result[i],
      result[j]
    ] =
    [
      result[j],
      result[i]
    ];

  }

  return result;
}


/**
 * Ambil soal acak
 */
async function getRandomQuestions(
  bankId,
  amount = 10
) {

  const questions =
    await getQuestionsByBank(
      bankId
    );

  const shuffled =
    shuffleArray(
      questions
    );

  return shuffled.slice(
    0,
    Math.min(
      amount,
      shuffled.length
    )
  );

}
