const templates = [
  {
    id: "standard",
    name: "Padrão da escola",
    detail: "Cabeçalho institucional, margens limpas e questões numeradas.",
    instructions: "1. Transcreva para a Folha de Respostas a opção que julgar correta em cada questão, preenchendo o campo correspondente com caneta de tinta preta ou azul.\n2. Nesta prova, as questões são de múltipla escolha, com cinco alternativas cada uma, sempre na sequência A, B, C, D e E, das quais somente uma é correta. \n3. Em hipótese alguma, o aluno poderá sair da sala com qualquer material referente a prova. Só será permitido ao aluno entregar sua prova escrita após 60 (sessenta) minutos do seu início."
  }
];

const state = {
  templateId: "standard",
  questions: [],
  currentQuestion: null,
  currentImageDataUrl: ""
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
  questionAlternativesColumns: document.getElementById("questionAlternativesColumns"),
  questionImageFile: document.getElementById("questionImageFile"),
  questionImagePosition: document.getElementById("questionImagePosition"),
  clearQuestionImage: document.getElementById("clearQuestionImage"),
  questionImagePreviewWrap: document.getElementById("questionImagePreviewWrap"),
  questionImagePreview: document.getElementById("questionImagePreview"),
  rawQuestion: document.getElementById("rawQuestion"),
  stemOutput: document.getElementById("stemOutput"),
  alternativesOutput: document.getElementById("alternativesOutput"),
  toggleInstructionsBold: document.getElementById("toggleInstructionsBold"),
  toggleInstructionsItalic: document.getElementById("toggleInstructionsItalic"),
  toggleInstructionsUnderline: document.getElementById("toggleInstructionsUnderline"),
  toggleStemBold: document.getElementById("toggleStemBold"),
  toggleStemItalic: document.getElementById("toggleStemItalic"),
  toggleStemUnderline: document.getElementById("toggleStemUnderline"),
  sectionSubjectSelect: document.getElementById("sectionSubjectSelect"),
  sectionSubjectOtherWrap: document.getElementById("sectionSubjectOtherWrap"),
  sectionSubjectOther: document.getElementById("sectionSubjectOther"),
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

const IMAGE_MAX_DIMENSION = 1400;
const IMAGE_DEFAULT_QUALITY = 0.82;

function formatDate(value) {
  if (!value) {
    return new Intl.DateTimeFormat("pt-BR").format(new Date());
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInlineFormatting(value) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function wrapSelectionInTextarea(textarea, before, after) {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value;
  const selectedText = value.slice(start, end);

  if (!selectedText) {
    const insertion = `${before}${after}`;
    textarea.value = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
    const cursor = start + before.length;
    textarea.setSelectionRange(cursor, cursor);
    return;
  }

  const replacement = `${before}${selectedText}${after}`;
  textarea.value = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
  textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
}
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Falha ao ler imagem"));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(new Error("Falha ao ler imagem"));
    };
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao carregar imagem"));
    image.src = dataUrl;
  });
}

async function compressImageFile(file) {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);

  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  if (!originalWidth || !originalHeight) {
    return sourceDataUrl;
  }

  const scale = Math.min(
    1,
    IMAGE_MAX_DIMENSION / originalWidth,
    IMAGE_MAX_DIMENSION / originalHeight
  );
  const targetWidth = Math.max(1, Math.round(originalWidth * scale));
  const targetHeight = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return sourceDataUrl;
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const compressedDataUrl = canvas.toDataURL(mimeType, IMAGE_DEFAULT_QUALITY);

  return compressedDataUrl.length < sourceDataUrl.length
    ? compressedDataUrl
    : sourceDataUrl;
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
  elements.previewInstructions.innerHTML = renderInlineFormatting(payload.instructions);
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
      const normalizedAlternatives = Array.isArray(item.alternatives)
        ? item.alternatives
        : [];
      const imageDataUrl = item.imageDataUrl || "";
      const imagePosition = item.imagePosition || "top";
      const isAlternativesAside =
        imagePosition === "alternatives-left" ||
        imagePosition === "alternatives-right";
      const alternatives = normalizedAlternatives
        .map(
          (alternative) => `
            <div class="alternative">
              <strong>${alternative.label})</strong>
              <span>${alternative.text}</span>
            </div>
          `
        )
        .join("");

      const inlineImageMarkup =
        imageDataUrl && !isAlternativesAside
          ? `<img class="question-image" src="${imageDataUrl}" alt="Imagem da questão ${questionIndex}" />`
          : "";
      const questionBody = isAlternativesAside
        ? `
          <div class="question-body question-body-no-image">
            <div class="question-body-text">${renderInlineFormatting(item.stem || "[Enunciado pendente]")}</div>
          </div>
        `
        : `
          <div class="question-body question-body-${imagePosition}">
            ${imageDataUrl && imagePosition !== "bottom" ? inlineImageMarkup : ""}
            <div class="question-body-text">${renderInlineFormatting(item.stem || "[Enunciado pendente]")}</div>
            ${imageDataUrl && imagePosition === "bottom" ? inlineImageMarkup : ""}
          </div>
        `;

      const alternativesMarkup = alternatives
        ? `<div class="alternatives ${
            item.alternativesColumns === 2
              ? "alternatives-cols-2"
              : item.alternativesColumns === 3
                ? "alternatives-cols-3"
                : item.alternativesColumns === 4
                  ? "alternatives-cols-4"
                  : ""
          }">${alternatives}</div>`
        : "";

      const alternativesWithImage =
        isAlternativesAside && imageDataUrl && alternativesMarkup
          ? `
            <div class="question-alternatives-with-image ${
              imagePosition === "alternatives-left" ? "image-left" : "image-right"
            }">
              ${
                imagePosition === "alternatives-left"
                  ? `<img class="question-image question-image-aside" src="${imageDataUrl}" alt="Imagem da questão ${questionIndex}" />${alternativesMarkup}`
                  : `${alternativesMarkup}<img class="question-image question-image-aside" src="${imageDataUrl}" alt="Imagem da questão ${questionIndex}" />`
              }
            </div>
          `
          : alternativesMarkup;

      return `
        <article class="question-card">
          <div class="question-title">
            <span>Questão ${questionIndex}</span>
            <div class="question-actions">
              <span>${item.typeLabel}</span>
              <button class="danger remove-item" data-index="${index}" type="button">Remover</button>
            </div>
          </div>
          ${questionBody}
          ${alternativesWithImage}
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

  const manualStem = elements.stemOutput.value.trim();
  const fallbackStem = state.currentQuestion?.stem?.trim() ?? "";
  const finalStem = manualStem || fallbackStem;
  const alternatives = elements.alternativesOutput.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([A-Ea-e])(?:[\).:-]|\s+)?\s*(.+)$/);
      if (!match) {
        return { label: "", text: line };
      }

      return { label: match[1].toUpperCase(), text: match[2].trim() };
    });

  if (!finalStem && !alternatives.length) {
    elements.parserStatus.textContent = "Nada para adicionar ainda";
    return;
  }

  state.questions.push({
    kind: "question",
    stem: finalStem,
    alternatives,
    alternativesColumns: Number(elements.questionAlternativesColumns.value) || 1,
    imageDataUrl: state.currentImageDataUrl,
    imagePosition: elements.questionImagePosition.value || "top",
    typeLabel:
      state.currentQuestion?.typeLabel ??
      elements.questionType.options[elements.questionType.selectedIndex].textContent
  });

  elements.parserStatus.textContent = "Questão adicionada à prova";
  renderPreview();
}

function addSubjectBreak() {
  const selected = elements.sectionSubjectSelect.value;
  const manualName = elements.sectionSubjectOther.value.trim();
  const subjectName = selected === "OUTRO" ? manualName : elements.sectionSubjectSelect.options[elements.sectionSubjectSelect.selectedIndex].textContent;

  if (!subjectName) {
    elements.parserStatus.textContent = "Digite o nome da disciplina para inserir";
    return;
  }

  state.questions.push({
    kind: "subject-break",
    name: subjectName
  });

  if (selected === "OUTRO") {
    elements.sectionSubjectOther.value = "";
  }
  elements.parserStatus.textContent = "Disciplina inserida na prova";
  renderPreview();
}

function updateSubjectInputMode() {
  const isOther = elements.sectionSubjectSelect.value === "OUTRO";
  elements.sectionSubjectOtherWrap.classList.toggle("hidden-field", !isOther);
}

function clearQuestionEditor() {
  elements.rawQuestion.value = "";
  elements.stemOutput.value = "";
  elements.alternativesOutput.value = "";
  elements.questionImageFile.value = "";
  elements.questionImagePosition.value = "top";
  state.currentQuestion = null;
  state.currentImageDataUrl = "";
  updateQuestionImagePreview();
  elements.parserStatus.textContent = "Pronto para organizar";
}

function updateQuestionImagePreview() {
  const hasImage = Boolean(state.currentImageDataUrl);
  elements.questionImagePreviewWrap.classList.toggle("hidden-field", !hasImage);
  if (hasImage) {
    elements.questionImagePreview.src = state.currentImageDataUrl;
  } else {
    elements.questionImagePreview.removeAttribute("src");
  }
}

async function onQuestionImageSelected(file) {
  if (!file) {
    state.currentImageDataUrl = "";
    updateQuestionImagePreview();
    return;
  }

  if (!file.type.startsWith("image/")) {
    elements.parserStatus.textContent = "Selecione um arquivo de imagem valido";
    elements.questionImageFile.value = "";
    state.currentImageDataUrl = "";
    updateQuestionImagePreview();
    return;
  }

  elements.parserStatus.textContent = "Processando imagem...";

  try {
    state.currentImageDataUrl = await compressImageFile(file);
    elements.parserStatus.textContent = state.currentImageDataUrl
      ? "Imagem carregada e otimizada para esta questão"
      : "Falha ao carregar imagem";
  } catch {
    state.currentImageDataUrl = "";
    elements.parserStatus.textContent = "Falha ao processar imagem";
  }

  updateQuestionImagePreview();
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

function bindFormattingButtons() {
  elements.toggleStemBold.addEventListener("click", () => {
    wrapSelectionInTextarea(elements.stemOutput, "**", "**");
    elements.stemOutput.dispatchEvent(new Event("input", { bubbles: true }));
    persistToStorage();
  });

  elements.toggleStemItalic.addEventListener("click", () => {
    wrapSelectionInTextarea(elements.stemOutput, "*", "*");
    elements.stemOutput.dispatchEvent(new Event("input", { bubbles: true }));
    persistToStorage();
  });

  elements.toggleStemUnderline.addEventListener("click", () => {
    wrapSelectionInTextarea(elements.stemOutput, "__", "__");
    elements.stemOutput.dispatchEvent(new Event("input", { bubbles: true }));
    persistToStorage();
  });

  elements.toggleInstructionsBold.addEventListener("click", () => {
    wrapSelectionInTextarea(elements.examInstructions, "**", "**");
    elements.examInstructions.dispatchEvent(new Event("input", { bubbles: true }));
    persistToStorage();
  });

  elements.toggleInstructionsItalic.addEventListener("click", () => {
    wrapSelectionInTextarea(elements.examInstructions, "*", "*");
    elements.examInstructions.dispatchEvent(new Event("input", { bubbles: true }));
    persistToStorage();
  });

  elements.toggleInstructionsUnderline.addEventListener("click", () => {
    wrapSelectionInTextarea(elements.examInstructions, "__", "__");
    elements.examInstructions.dispatchEvent(new Event("input", { bubbles: true }));
    persistToStorage();
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
      ? data.questions.map((item) => ({
          kind: "question",
          alternativesColumns: 1,
          imageDataUrl: "",
          imagePosition: "top",
          ...item
        }))
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

  try {
    localStorage.setItem("prova-facil-mvp", JSON.stringify(data));
  } catch {
    elements.parserStatus.textContent = "Armazenamento cheio. Reduza imagens ou limpe a prova.";
  }
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

elements.sectionSubjectSelect.addEventListener("change", () => {
  updateSubjectInputMode();
});

elements.clearQuestion.addEventListener("click", () => {
  clearQuestionEditor();
  persistToStorage();
});

elements.questionImageFile.addEventListener("change", () => {
  const file = elements.questionImageFile.files?.[0];
  onQuestionImageSelected(file);
});

elements.clearQuestionImage.addEventListener("click", () => {
  elements.questionImageFile.value = "";
  state.currentImageDataUrl = "";
  updateQuestionImagePreview();
  elements.parserStatus.textContent = "Imagem removida desta questão";
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
bindFormattingButtons();
wirePersistence();
updateSubjectInputMode();
updateQuestionImagePreview();
organizeCurrentQuestion();
renderPreview();
persistToStorage();