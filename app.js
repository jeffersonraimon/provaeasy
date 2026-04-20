const templates = [
  {
    id: "standard",
    name: "Padrão da escola",
    detail: "Cabeçalho institucional, margens limpas e questões numeradas.",
    instructions: "Leia com atenção. Responda com letra legível e sem rasuras."
  },
  {
    id: "compact",
    name: "Formato compacto",
    detail: "Pensado para provas curtas e revisões rápidas.",
    instructions: "Use caneta azul ou preta e marque apenas uma alternativa."
  },
  {
    id: "essay",
    name: "Dissertativa",
    detail: "Deixa espaço maior para resposta escrita.",
    instructions: "Responda com desenvolvimento completo e argumentos claros."
  }
];

const state = {
  templateId: "standard",
  questions: [],
  currentQuestion: null
};

const elements = {
  templateList: document.getElementById("templateList"),
  schoolName: document.getElementById("schoolName"),
  examTitle: document.getElementById("examTitle"),
  seriesName: document.getElementById("seriesName"),
  groupName: document.getElementById("groupName"),
  shiftName: document.getElementById("shiftName"),
  studentName: document.getElementById("studentName"),
  examDate: document.getElementById("examDate"),
  examInstructions: document.getElementById("examInstructions"),
  questionType: document.getElementById("questionType"),
  rawQuestion: document.getElementById("rawQuestion"),
  stemOutput: document.getElementById("stemOutput"),
  alternativesOutput: document.getElementById("alternativesOutput"),
  sectionSubjectName: document.getElementById("sectionSubjectName"),
  parserStatus: document.getElementById("parserStatus"),
  questionCount: document.getElementById("questionCount"),
  previewSchool: document.getElementById("previewSchool"),
  previewTitle: document.getElementById("previewTitle"),
  previewDate: document.getElementById("previewDate"),
  previewSeries: document.getElementById("previewSeries"),
  previewGroup: document.getElementById("previewGroup"),
  previewShift: document.getElementById("previewShift"),
  previewStudent: document.getElementById("previewStudent"),
  previewInstructions: document.getElementById("previewInstructions"),
  questionList: document.getElementById("questionList"),
  loadExample: document.getElementById("loadExample"),
  organizeQuestion: document.getElementById("organizeQuestion"),
  clearQuestion: document.getElementById("clearQuestion"),
  addQuestion: document.getElementById("addQuestion"),
  addSubjectBreak: document.getElementById("addSubjectBreak"),
  printExam: document.getElementById("printExam"),
  clearExam: document.getElementById("clearExam")
};

const exampleQuestion = `A leitura crítica ajuda o estudante porque:

A) permite decorar rapidamente os textos.
B) desenvolve interpretação e reflexão.
C) substitui o estudo em sala.
D) elimina a necessidade de escrever.
E) dispensa a revisão final.`;

function formatDate(value) {
  if (!value) {
    return new Intl.DateTimeFormat("pt-BR").format(new Date());
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function parseQuestion(rawText, type) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { stem: "", alternatives: [] };
  }

  if (type === "essay") {
    return { stem: lines.join("\n"), alternatives: [] };
  }

  const alternativePattern = /^(?:[-*•]\s*)?([A-Ea-e]|[1-5])(?:[\).:-]|\s+)?\s*(.+)$/;
  const alternatives = [];
  const stemLines = [];

  for (const line of lines) {
    const match = line.match(alternativePattern);
    if (match) {
      alternatives.push({
        label: match[1].toUpperCase(),
        text: match[2].trim()
      });
      continue;
    }

    stemLines.push(line);
  }

  if (!alternatives.length) {
    return {
      stem: lines.join("\n"),
      alternatives: []
    };
  }

  return {
    stem: stemLines.join("\n"),
    alternatives
  };
}

function getPreviewPayload() {
  const dateValue = formatDate(elements.examDate.value);

  return {
    school: elements.schoolName.value.trim() || "CEON - COLÉGIO ESTADUAL OURO NEGRO",
    title: elements.examTitle.value.trim() || "Avaliação Bimestral",
    date: elements.examDate.value ? dateValue : "_____/_____/_____",
    series: elements.seriesName.value.trim() || "1ª",
    group: elements.groupName.value.trim() || "______",
    shift: elements.shiftName.value.trim() || "_____________",
    student:
      elements.studentName.value.trim() ||
      "_____________________________________________________",
    instructions: elements.examInstructions.value.trim(),
    type: elements.questionType.value
  };
}

function renderTemplates() {
  elements.templateList.innerHTML = "";

  templates.forEach((template) => {
    const fragment = document.getElementById("templateCard").content.cloneNode(true);
    const card = fragment.querySelector(".template-card");
    const name = fragment.querySelector(".template-name");
    const detail = fragment.querySelector(".template-detail");

    name.textContent = template.name;
    detail.textContent = template.detail;
    card.classList.toggle("active", template.id === state.templateId);
    card.addEventListener("click", () => {
      state.templateId = template.id;
      elements.examInstructions.value = template.instructions;
      renderTemplates();
      renderPreview();
      persistToStorage();
    });

    elements.templateList.appendChild(fragment);
  });
}

function renderPreview() {
  const payload = getPreviewPayload();
  const questionOnlyCount = state.questions.filter(
    (item) => item.kind !== "subject-break"
  ).length;

  elements.previewSchool.textContent = payload.school;
  elements.previewTitle.textContent = payload.title;
  elements.previewDate.textContent = payload.date;
  elements.previewSeries.textContent = payload.series;
  elements.previewGroup.textContent = payload.group;
  elements.previewShift.textContent = payload.shift;
  elements.previewStudent.textContent = payload.student;
  elements.previewInstructions.textContent = payload.instructions;
  elements.questionCount.textContent = `${questionOnlyCount} ${
    questionOnlyCount === 1 ? "questão" : "questões"
  }`;

  if (!state.questions.length) {
    elements.questionList.innerHTML = `
      <div class="empty-state">
        Nenhuma questão adicionada ainda. Cole o texto bruto, organize e clique em “Adicionar à prova”.
      </div>
    `;
    return;
  }

  let questionIndex = 0;
  elements.questionList.innerHTML = state.questions
    .map((item, index) => {
      if (item.kind === "subject-break") {
        return `
          <article class="subject-break-card">
            <div class="subject-break-line">
              <span class="subject-break-name">${item.name}</span>
              <button class="danger remove-item" data-index="${index}" type="button">Remover</button>
            </div>
          </article>
        `;
      }

      questionIndex += 1;
      const alternatives = item.alternatives
        .map(
          (alternative) => `
            <div class="alternative">
              <strong>${alternative.label})</strong>
              <span>${alternative.text}</span>
            </div>
          `
        )
        .join("");

      return `
        <article class="question-card">
          <div class="question-title">
            <span>Questão ${questionIndex}</span>
            <div class="question-actions">
              <span>${item.typeLabel}</span>
              <button class="danger remove-item" data-index="${index}" type="button">Remover</button>
            </div>
          </div>
          <div class="question-body">${item.stem || "[Enunciado pendente]"}</div>
          ${alternatives ? `<div class="alternatives">${alternatives}</div>` : ""}
        </article>
      `;
    })
    .join("");
}

function organizeCurrentQuestion() {
  const rawText = elements.rawQuestion.value.trim();
  if (!rawText) {
    state.currentQuestion = null;
    elements.stemOutput.value = "";
    elements.alternativesOutput.value = "";
    elements.parserStatus.textContent = "Cole um texto para começar";
    return;
  }

  const parsed = parseQuestion(rawText, elements.questionType.value);
  state.currentQuestion = {
    stem: parsed.stem,
    alternatives: parsed.alternatives,
    type: elements.questionType.value,
    typeLabel: elements.questionType.options[elements.questionType.selectedIndex].textContent
  };

  elements.stemOutput.value = parsed.stem;
  elements.alternativesOutput.value = parsed.alternatives
    .map((alternative) => `${alternative.label}) ${alternative.text}`)
    .join("\n");
  elements.parserStatus.textContent = parsed.alternatives.length ? "Questão organizada" : "Texto importado sem alternativas reconhecidas";
}

function addCurrentQuestion() {
  if (!state.currentQuestion) {
    organizeCurrentQuestion();
  }

  if (!state.currentQuestion || !state.currentQuestion.stem) {
    elements.parserStatus.textContent = "Nada para adicionar ainda";
    return;
  }

  state.questions.push({
    kind: "question",
    stem: elements.stemOutput.value.trim() || state.currentQuestion.stem,
    alternatives: elements.alternativesOutput.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([A-Ea-e])(?:[\).:-]|\s+)?\s*(.+)$/);
        if (!match) {
          return { label: "", text: line };
        }

        return { label: match[1].toUpperCase(), text: match[2].trim() };
      }),
    typeLabel: state.currentQuestion.typeLabel
  });

  elements.parserStatus.textContent = "Questão adicionada à prova";
  renderPreview();
}

function addSubjectBreak() {
  const subjectName = elements.sectionSubjectName.value.trim();
  if (!subjectName) {
    elements.parserStatus.textContent = "Digite o nome da disciplina para inserir";
    return;
  }

  state.questions.push({
    kind: "subject-break",
    name: subjectName
  });

  elements.sectionSubjectName.value = "";
  elements.parserStatus.textContent = "Disciplina inserida na prova";
  renderPreview();
}

function clearQuestionEditor() {
  elements.rawQuestion.value = "";
  elements.stemOutput.value = "";
  elements.alternativesOutput.value = "";
  state.currentQuestion = null;
  elements.parserStatus.textContent = "Pronto para organizar";
}

function loadExample() {
  elements.questionType.value = "multiple";
  elements.rawQuestion.value = exampleQuestion;
  organizeCurrentQuestion();
}

function bindLivePreview() {
  const liveFields = [
    elements.schoolName,
    elements.examTitle,
    elements.seriesName,
    elements.groupName,
    elements.shiftName,
    elements.studentName,
    elements.examDate,
    elements.examInstructions
  ];

  liveFields.forEach((field) => {
    field.addEventListener("input", renderPreview);
  });

  elements.questionType.addEventListener("change", () => {
    organizeCurrentQuestion();
  });
}

function hydrateFromStorage() {
  const saved = localStorage.getItem("prova-facil-mvp");
  if (!saved) {
    elements.examDate.valueAsDate = new Date();
    return;
  }

  try {
    const data = JSON.parse(saved);
    elements.schoolName.value = data.schoolName ?? elements.schoolName.value;
    elements.examTitle.value = data.examTitle ?? elements.examTitle.value;
    elements.seriesName.value = data.seriesName ?? elements.seriesName.value;
    elements.groupName.value = data.groupName ?? elements.groupName.value;
    elements.shiftName.value = data.shiftName ?? elements.shiftName.value;
    elements.studentName.value = data.studentName ?? elements.studentName.value;
    elements.examDate.value = data.examDate ?? elements.examDate.value;
    elements.examInstructions.value = data.examInstructions ?? elements.examInstructions.value;
    state.templateId = data.templateId ?? state.templateId;
    state.questions = Array.isArray(data.questions)
      ? data.questions.map((item) => ({ kind: "question", ...item }))
      : [];
  } catch {
    elements.examDate.valueAsDate = new Date();
  }
}

function persistToStorage() {
  const data = {
    schoolName: elements.schoolName.value,
    examTitle: elements.examTitle.value,
    seriesName: elements.seriesName.value,
    groupName: elements.groupName.value,
    shiftName: elements.shiftName.value,
    studentName: elements.studentName.value,
    examDate: elements.examDate.value,
    examInstructions: elements.examInstructions.value,
    templateId: state.templateId,
    questions: state.questions
  };

  localStorage.setItem("prova-facil-mvp", JSON.stringify(data));
}

function wirePersistence() {
  const fields = [
    elements.schoolName,
    elements.examTitle,
    elements.seriesName,
    elements.groupName,
    elements.shiftName,
    elements.studentName,
    elements.examDate,
    elements.examInstructions
  ];

  fields.forEach((field) => {
    field.addEventListener("input", () => {
      persistToStorage();
    });
  });
}

elements.organizeQuestion.addEventListener("click", () => {
  organizeCurrentQuestion();
  persistToStorage();
});

elements.addQuestion.addEventListener("click", () => {
  addCurrentQuestion();
  persistToStorage();
});

elements.addSubjectBreak.addEventListener("click", () => {
  addSubjectBreak();
  persistToStorage();
});

elements.clearQuestion.addEventListener("click", () => {
  clearQuestionEditor();
  persistToStorage();
});

elements.loadExample.addEventListener("click", () => {
  loadExample();
  persistToStorage();
});

elements.printExam.addEventListener("click", () => {
  window.print();
});

elements.clearExam.addEventListener("click", () => {
  if (!state.questions.length) {
    elements.parserStatus.textContent = "A prova ja esta vazia";
    return;
  }

  state.questions = [];
  elements.parserStatus.textContent = "Todas as questoes foram removidas";
  renderPreview();
  persistToStorage();
});

elements.questionList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (!target.classList.contains("remove-item")) {
    return;
  }

  const index = Number(target.dataset.index);
  if (!Number.isInteger(index) || index < 0 || index >= state.questions.length) {
    return;
  }

  state.questions.splice(index, 1);
  elements.parserStatus.textContent = "Questão removida da prova";
  renderPreview();
  persistToStorage();
});

hydrateFromStorage();
renderTemplates();
bindLivePreview();
wirePersistence();
organizeCurrentQuestion();
renderPreview();
persistToStorage();