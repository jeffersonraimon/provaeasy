const templates = [
  {
    id: "standard",
    name: "Padrão da escola",
    detail: "Cabeçalho institucional, margens limpas e questões numeradas.",
    instructions: "1. Transcreva para a Folha de Respostas a opção que julgar correta em cada questão, preenchendo o campo correspondente com caneta de **tinta preta ou azul**.\n2. Nesta prova, as questões são de múltipla escolha, com cinco alternativas cada uma, sempre na sequência **A, B, C, D e E**, das quais somente uma é correta. \n3. Em hipótese alguma, o aluno poderá sair da sala com qualquer material referente a prova. Só será permitido ao aluno entregar sua prova escrita após 60 (sessenta) minutos do seu início."
  }
];

const state = {
  templateId: "standard",
  questions: [],
  currentQuestion: null,
  currentImageDataUrls: [],
  editingQuestionIndex: null
};

const EXAM_STORAGE_KEY = "prova-facil-mvp";
const EXAM_EXPORT_VERSION = 1;

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
  questionFontSize: document.getElementById("questionFontSize"),
  questionImageFile: document.getElementById("questionImageFile"),
  questionImagePosition: document.getElementById("questionImagePosition"),
  questionImageScalePercent: document.getElementById("questionImageScalePercent"),
  questionImageScaleDisplay: document.getElementById("questionImageScaleDisplay"),
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
  importExam: document.getElementById("importExam"),
  exportExam: document.getElementById("exportExam"),
  importExamFile: document.getElementById("importExamFile"),
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

function getTemplateById(templateId) {
  return templates.find((template) => template.id === templateId) || templates[0];
}

function formatDate(value) {
  if (!value) {
    return new Intl.DateTimeFormat("pt-BR").format(new Date());
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function getCurrentImageDataUrls() {
  return Array.isArray(state.currentImageDataUrls) ? state.currentImageDataUrls : [];
}

function normalizeAlternative(alternative, index) {
  const fallbackLabel = String.fromCharCode(97 + index);
  if (!alternative || typeof alternative !== "object") {
    return { label: fallbackLabel, text: "" };
  }

  return {
    label: String(alternative.label || fallbackLabel).toLowerCase(),
    text: String(alternative.text || "")
  };
}

function normalizeQuestion(item) {
  if (!item || typeof item !== "object") {
    return {
      kind: "question",
      type: "multiple",
      stem: "",
      alternatives: [],
      alternativesColumns: 1,
      fontSize: 13,
      imageDataUrls: [],
      imagePosition: "top",
      imageScalePercent: 100,
      typeLabel: "Múltipla escolha"
    };
  }

  if (item.kind === "subject-break") {
    return {
      kind: "subject-break",
      name: String(item.name || "")
    };
  }

  const alternatives = Array.isArray(item.alternatives)
    ? item.alternatives.map(normalizeAlternative)
    : [];
  const imageDataUrls = Array.isArray(item.imageDataUrls)
    ? item.imageDataUrls.filter((value) => typeof value === "string")
    : item.imageDataUrl && typeof item.imageDataUrl === "string"
      ? [item.imageDataUrl]
      : [];

  return {
    kind: "question",
    type: item.type || (alternatives.length ? "multiple" : "essay"),
    stem: String(item.stem || ""),
    alternatives,
    alternativesColumns: Number(item.alternativesColumns) || 1,
    fontSize: clampNumber(Number(item.fontSize) || 13, 10, 18),
    imageDataUrls,
    imagePosition: item.imagePosition || "top",
    imageScalePercent: clampNumber(Number(item.imageScalePercent) || 100, 10, 300),
    typeLabel: String(item.typeLabel || "")
  };
}

function normalizeExamData(data) {
  const defaultTemplate = getTemplateById(data?.templateId ?? "standard");

  return {
    version: Number(data?.version) || EXAM_EXPORT_VERSION,
    schoolName: typeof data?.schoolName === "string" ? data.schoolName : elements.schoolName.value,
    examTitle: typeof data?.examTitle === "string" ? data.examTitle : elements.examTitle.value,
    seriesName: typeof data?.seriesName === "string" ? data.seriesName : elements.seriesName.value,
    groupName: typeof data?.groupName === "string" ? data.groupName : elements.groupName.value,
    shiftName: typeof data?.shiftName === "string" ? data.shiftName : elements.shiftName.value,
    studentName: typeof data?.studentName === "string" ? data.studentName : elements.studentName.value,
    examDate: typeof data?.examDate === "string" ? data.examDate : elements.examDate.value,
    examInstructions:
      typeof data?.examInstructions === "string" ? data.examInstructions : elements.examInstructions.value,
    rawQuestion: typeof data?.rawQuestion === "string" ? data.rawQuestion : elements.rawQuestion.value,
    stemOutput: typeof data?.stemOutput === "string" ? data.stemOutput : elements.stemOutput.value,
    alternativesOutput:
      typeof data?.alternativesOutput === "string" ? data.alternativesOutput : elements.alternativesOutput.value,
    templateId: getTemplateById(data?.templateId ?? defaultTemplate.id).id,
    questions: Array.isArray(data?.questions) ? data.questions.map(normalizeQuestion) : [],
    currentQuestion:
      data?.currentQuestion && typeof data.currentQuestion === "object"
        ? {
            stem: String(data.currentQuestion.stem || ""),
            alternatives: Array.isArray(data.currentQuestion.alternatives)
              ? data.currentQuestion.alternatives.map(normalizeAlternative)
              : [],
            type: String(data.currentQuestion.type || "multiple"),
            typeLabel: String(data.currentQuestion.typeLabel || "")
          }
        : null,
    currentImageDataUrls: Array.isArray(data?.currentImageDataUrls)
      ? data.currentImageDataUrls.filter((value) => typeof value === "string")
      : [],
    editingQuestionIndex: Number.isInteger(data?.editingQuestionIndex)
      ? data.editingQuestionIndex
      : null
  };
}

function applyExamData(data) {
  const normalized = normalizeExamData(data);

  elements.schoolName.value = normalized.schoolName;
  elements.examTitle.value = normalized.examTitle;
  elements.seriesName.value = normalized.seriesName;
  elements.groupName.value = normalized.groupName;
  elements.shiftName.value = normalized.shiftName;
  elements.studentName.value = normalized.studentName;
  elements.examDate.value = normalized.examDate;
  elements.examInstructions.value = normalized.examInstructions;
  elements.rawQuestion.value = normalized.rawQuestion;
  elements.stemOutput.value = normalized.stemOutput;
  elements.alternativesOutput.value = normalized.alternativesOutput;
  state.templateId = normalized.templateId;
  state.questions = normalized.questions;
  state.currentQuestion = normalized.currentQuestion;
  state.currentImageDataUrls = normalized.currentImageDataUrls;
  state.editingQuestionIndex = normalized.editingQuestionIndex;

  if (!elements.examInstructions.value.trim()) {
    elements.examInstructions.value = getTemplateById(state.templateId).instructions;
  }

  renderTemplates();
  updateSubjectInputMode();
  updateQuestionImagePreview();
  renderPreview();
}

function getExamSnapshot() {
  return {
    version: EXAM_EXPORT_VERSION,
    schoolName: elements.schoolName.value,
    examTitle: elements.examTitle.value,
    seriesName: elements.seriesName.value,
    groupName: elements.groupName.value,
    shiftName: elements.shiftName.value,
    studentName: elements.studentName.value,
    examDate: elements.examDate.value,
    examInstructions: elements.examInstructions.value,
    rawQuestion: elements.rawQuestion.value,
    stemOutput: elements.stemOutput.value,
    alternativesOutput: elements.alternativesOutput.value,
    templateId: state.templateId,
    questions: state.questions,
    currentQuestion: state.currentQuestion,
    currentImageDataUrls: getCurrentImageDataUrls(),
    editingQuestionIndex: state.editingQuestionIndex
  };
}

function downloadTextFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.click();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function buildExamFileName() {
  const title = elements.examTitle.value.trim() || "prova";
  const safeTitle = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const datePart = elements.examDate.value || new Date().toISOString().slice(0, 10);

  return `${safeTitle || "prova"}-${datePart}.json`;
}

function exportExam() {
  const snapshot = getExamSnapshot();
  downloadTextFile(JSON.stringify(snapshot, null, 2), buildExamFileName(), "application/json");
  elements.parserStatus.textContent = "Prova exportada em JSON";
}

async function importExamFile(file) {
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    applyExamData(data);
    persistToStorage();
    elements.parserStatus.textContent = "Prova importada com sucesso";
  } catch {
    elements.parserStatus.textContent = "Não foi possível importar este arquivo JSON";
  } finally {
    elements.importExamFile.value = "";
  }
}

function getQuestionImageScalePercent() {
  const value = Number(elements.questionImageScalePercent.value);
  if (!Number.isFinite(value)) {
    return 100;
  }

  return clampNumber(value, 10, 300);
}

function getQuestionFontSize() {
  const value = Number(elements.questionFontSize.value);
  if (!Number.isFinite(value)) {
    return 13;
  }

  return clampNumber(value, 10, 18);
}

function setImageScaleUi(scaleValue) {
  const normalized = clampNumber(Number(scaleValue) || 100, 10, 300);
  const percent = ((normalized - 10) / 290) * 100;
  elements.questionImageScalePercent.value = String(normalized);
  elements.questionImageScaleDisplay.textContent = `${normalized}%`;
  elements.questionImageScalePercent.style.setProperty("--percent", `${percent}%`);
}

function getImageDimensionsForPosition(imagePosition, scalePercent) {
  const isAsideImage =
    imagePosition === "alternatives-left" || imagePosition === "alternatives-right";

  const baseWidth = isAsideImage ? 460 : 680;
  const baseHeight = isAsideImage ? 340 : 560;
  const factor = clampNumber(scalePercent, 10, 300) / 100;

  return {
    width: Math.round(baseWidth * factor),
    height: Math.round(baseHeight * factor)
  };
}

function getImageStyleAttribute(imagePosition, scalePercent) {
  const dimensions = getImageDimensionsForPosition(imagePosition, scalePercent);
  return `style="width: ${dimensions.width}px; max-width: ${dimensions.width}px; max-height: ${dimensions.height}px; height: auto; object-fit: contain;"`;
}

function renderQuestionImagesMarkup(
  imageDataUrls,
  altBase,
  imageClass = "question-image",
  scalePercent = 100,
  imagePosition = "top"
) {
  if (!imageDataUrls.length) {
    return "";
  }

  const styleAttribute = getImageStyleAttribute(imagePosition, scalePercent);

  return `
    <div class="question-images-stack">
      ${imageDataUrls
        .map(
          (imageDataUrl, index) => `
            <img class="${imageClass}" src="${imageDataUrl}" alt="${altBase} ${index + 1}" ${styleAttribute} />
          `
        )
        .join("")}
    </div>
  `;
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
        label: match[1].toLowerCase(),
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
    school: elements.schoolName.value.trim() || "COLÉGIO XXXXXXXXXXX",
    title: elements.examTitle.value.trim() || "SIMULADO DA X UNIDADE - XXXXX",
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
              <div class="question-actions">
                <button class="secondary item-action" data-action="move-up" data-index="${index}" type="button">↑</button>
                <button class="secondary item-action" data-action="move-down" data-index="${index}" type="button">↓</button>
              <button class="danger item-action remove-item" data-action="remove" data-index="${index}" type="button">Remover</button>
              </div>
            </div>
          </article>
        `;
      }

      questionIndex += 1;
      const normalizedAlternatives = Array.isArray(item.alternatives)
        ? item.alternatives
        : [];
      const imageDataUrls = Array.isArray(item.imageDataUrls)
        ? item.imageDataUrls
        : item.imageDataUrl
          ? [item.imageDataUrl]
          : [];
      const imagePosition = item.imagePosition || "top";
      const imageScalePercent = clampNumber(Number(item.imageScalePercent) || 100, 10, 300);
      const questionFontSize = clampNumber(Number(item.fontSize) || 13, 10, 18);
      const isAlternativesAside =
        imagePosition === "alternatives-left" ||
        imagePosition === "alternatives-right";
      const alternatives = normalizedAlternatives
        .map(
          (alternative) => `
            <div class="alternative">
              <strong>${String(alternative.label || "").toLowerCase()})</strong>
              <span>${alternative.text}</span>
            </div>
          `
        )
        .join("");

      const inlineImageMarkup =
        imageDataUrls.length && !isAlternativesAside
          ? renderQuestionImagesMarkup(
              imageDataUrls,
              `Imagem da questão ${questionIndex}`,
              "question-image",
              imageScalePercent,
              imagePosition
            )
          : "";
      const questionBody = isAlternativesAside
        ? `
          <div class="question-body question-body-no-image">
            <div class="question-body-text">${renderInlineFormatting(item.stem || "[Enunciado pendente]")}</div>
          </div>
        `
        : `
          <div class="question-body question-body-${imagePosition}">
            ${imageDataUrls.length && imagePosition !== "bottom" ? inlineImageMarkup : ""}
            <div class="question-body-text">${renderInlineFormatting(item.stem || "[Enunciado pendente]")}</div>
            ${imageDataUrls.length && imagePosition === "bottom" ? inlineImageMarkup : ""}
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
        isAlternativesAside && imageDataUrls.length && alternativesMarkup
          ? `
            <div class="question-alternatives-with-image ${
              imagePosition === "alternatives-left" ? "image-left" : "image-right"
            }">
              ${
                imagePosition === "alternatives-left"
                  ? `${renderQuestionImagesMarkup(imageDataUrls, `Imagem da questão ${questionIndex}`, "question-image question-image-aside", imageScalePercent, imagePosition)}${alternativesMarkup}`
                  : `${alternativesMarkup}${renderQuestionImagesMarkup(imageDataUrls, `Imagem da questão ${questionIndex}`, "question-image question-image-aside", imageScalePercent, imagePosition)}`
              }
            </div>
          `
          : alternativesMarkup;

      return `
        <article class="question-card" style="--question-font-size: ${questionFontSize}px;">
          <div class="question-title">
            <span>Questão ${questionIndex}</span>
            <div class="question-actions">
              <button class="secondary item-action" data-action="move-up" data-index="${index}" type="button">↑</button>
              <button class="secondary item-action" data-action="move-down" data-index="${index}" type="button">↓</button>
              <button class="secondary item-action" data-action="edit" data-index="${index}" type="button">Editar</button>
              <button class="danger item-action remove-item" data-action="remove" data-index="${index}" type="button">Remover</button>
            </div>
          </div>
          ${questionBody}
          ${alternativesWithImage}
        </article>
      `;
    })
    .join("");
}

function startEditingQuestion(index) {
  const item = state.questions[index];
  if (!item || item.kind !== "question") {
    return;
  }

  const normalizedAlternatives = Array.isArray(item.alternatives) ? item.alternatives : [];
  const imageDataUrls = Array.isArray(item.imageDataUrls)
    ? item.imageDataUrls
    : item.imageDataUrl
      ? [item.imageDataUrl]
      : [];

  const questionType = item.type || (normalizedAlternatives.length ? "multiple" : "essay");
  elements.questionType.value = questionType;
  elements.stemOutput.value = item.stem || "";
  elements.alternativesOutput.value = normalizedAlternatives
    .map((alternative, altIndex) => {
      const fallbackLabel = String.fromCharCode(97 + altIndex);
      const label = String(alternative.label || fallbackLabel).toLowerCase();
      return `${label}) ${alternative.text || ""}`.trim();
    })
    .join("\n");
  elements.rawQuestion.value = [
    elements.stemOutput.value,
    elements.alternativesOutput.value
  ]
    .filter(Boolean)
    .join("\n\n");
  elements.questionAlternativesColumns.value = String(Number(item.alternativesColumns) || 1);
  elements.questionFontSize.value = String(clampNumber(Number(item.fontSize) || 13, 10, 18));
  elements.questionImagePosition.value = item.imagePosition || "top";
  setImageScaleUi(item.imageScalePercent);
  state.currentImageDataUrls = [...imageDataUrls];
  state.currentQuestion = {
    stem: item.stem || "",
    alternatives: normalizedAlternatives,
    type: questionType,
    typeLabel:
      item.typeLabel ||
      elements.questionType.options[elements.questionType.selectedIndex].textContent
  };
  state.editingQuestionIndex = index;
  elements.addQuestion.textContent = "Salvar edição";
  elements.parserStatus.textContent = "Editando questão. Ajuste e clique em Salvar edição";
  updateQuestionImagePreview();
}

function swapItems(firstIndex, secondIndex) {
  const first = state.questions[firstIndex];
  const second = state.questions[secondIndex];
  state.questions[firstIndex] = second;
  state.questions[secondIndex] = first;

  if (state.editingQuestionIndex === firstIndex) {
    state.editingQuestionIndex = secondIndex;
  } else if (state.editingQuestionIndex === secondIndex) {
    state.editingQuestionIndex = firstIndex;
  }
}

function moveItem(index, direction) {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= state.questions.length ||
    targetIndex < 0 ||
    targetIndex >= state.questions.length
  ) {
    return;
  }

  swapItems(index, targetIndex);
  elements.parserStatus.textContent = "Item movido";
  renderPreview();
  persistToStorage();
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
  const manualStem = elements.stemOutput.value.trim();
  const manualAlternativesText = elements.alternativesOutput.value.trim();

  // Só tenta organizar se ambos os campos estiverem vazios
  if (!manualStem && !manualAlternativesText && !state.currentQuestion) {
    organizeCurrentQuestion();
  }

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

      return { label: match[1].toLowerCase(), text: match[2].trim() };
    });

  if (!finalStem && !alternatives.length) {
    elements.parserStatus.textContent = "Nada para adicionar ainda";
    return;
  }

  state.questions.push({
    kind: "question",
    type: state.currentQuestion?.type ?? elements.questionType.value,
    stem: finalStem,
    alternatives,
    alternativesColumns: Number(elements.questionAlternativesColumns.value) || 1,
    fontSize: getQuestionFontSize(),
    imageDataUrls: [...getCurrentImageDataUrls()],
    imagePosition: elements.questionImagePosition.value || "top",
    imageScalePercent: getQuestionImageScalePercent(),
    typeLabel:
      state.currentQuestion?.typeLabel ??
      elements.questionType.options[elements.questionType.selectedIndex].textContent
  });

  if (
    Number.isInteger(state.editingQuestionIndex) &&
    state.editingQuestionIndex >= 0 &&
    state.editingQuestionIndex < state.questions.length - 1
  ) {
    const updatedQuestion = state.questions.pop();
    state.questions[state.editingQuestionIndex] = updatedQuestion;
    elements.parserStatus.textContent = "Questão atualizada na prova";
  } else {
    elements.parserStatus.textContent = "Questão adicionada à prova";
  }

  state.editingQuestionIndex = null;
  elements.addQuestion.textContent = "Adicionar à prova";
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
  setImageScaleUi(100);
  elements.questionFontSize.value = "13";
  state.currentQuestion = null;
  state.currentImageDataUrls = [];
  state.editingQuestionIndex = null;
  elements.addQuestion.textContent = "Adicionar à prova";
  updateQuestionImagePreview();
  elements.parserStatus.textContent = "Pronto para organizar";
}

function updateQuestionImagePreview() {
  const imageDataUrls = getCurrentImageDataUrls();
  const hasImage = imageDataUrls.length > 0;
  elements.questionImagePreviewWrap.classList.toggle("hidden-field", !hasImage);
  elements.questionImagePreview.innerHTML = hasImage
    ? renderQuestionImagesMarkup(
        imageDataUrls,
        "Prévia da imagem",
        "",
        getQuestionImageScalePercent(),
        elements.questionImagePosition.value || "top"
      )
    : "";
}

async function onQuestionImageSelected(filesInput) {
  const files = Array.isArray(filesInput)
    ? filesInput
    : filesInput
      ? [filesInput]
      : [];
  if (!files.length) {
    state.currentImageDataUrls = [];
    updateQuestionImagePreview();
    return;
  }

  if (!files[0].type.startsWith("image/")) {
    elements.parserStatus.textContent = "Selecione um arquivo de imagem valido";
    elements.questionImageFile.value = "";
    state.currentImageDataUrls = [];
    updateQuestionImagePreview();
    return;
  }

  elements.parserStatus.textContent = "Processando imagem...";

  try {
    const imageDataUrls = [];
    for (const imageFile of files) {
      if (!imageFile.type.startsWith("image/")) {
        continue;
      }

      imageDataUrls.push(await compressImageFile(imageFile));
    }

    state.currentImageDataUrls = imageDataUrls;
    elements.parserStatus.textContent = imageDataUrls.length
      ? `Imagem${imageDataUrls.length > 1 ? "s" : ""} carregada${
          imageDataUrls.length > 1 ? "s" : ""
        } e otimizada${imageDataUrls.length > 1 ? "s" : ""} para esta questão`
      : "Falha ao carregar imagem";
  } catch {
    state.currentImageDataUrls = [];
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
  const saved = localStorage.getItem(EXAM_STORAGE_KEY);
  const defaultTemplate = getTemplateById("standard");
  if (!saved) {
    applyExamData({
      templateId: defaultTemplate.id,
      examInstructions: defaultTemplate.instructions,
      examDate: new Date().toISOString().slice(0, 10)
    });
    return;
  }

  try {
    applyExamData(JSON.parse(saved));
  } catch {
    applyExamData({
      templateId: defaultTemplate.id,
      examInstructions: defaultTemplate.instructions,
      examDate: new Date().toISOString().slice(0, 10)
    });
  }
}

function persistToStorage() {
  const data = getExamSnapshot();

  try {
    localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(data));
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
  const files = Array.from(elements.questionImageFile.files ?? []);
  onQuestionImageSelected(files);
});

elements.questionImageScalePercent.addEventListener("input", () => {
  const value = elements.questionImageScalePercent.value;
  setImageScaleUi(value);
  if (state.currentImageDataUrls.length) {
    updateQuestionImagePreview();
  }
});

elements.questionImageScalePercent.addEventListener("change", () => {
  if (state.currentImageDataUrls.length) {
    updateQuestionImagePreview();
  }
});

elements.questionImagePosition.addEventListener("change", () => {
  if (state.currentImageDataUrls.length) {
    updateQuestionImagePreview();
  }
});

elements.clearQuestionImage.addEventListener("click", () => {
  elements.questionImageFile.value = "";
  state.currentImageDataUrls = [];
  updateQuestionImagePreview();
  elements.parserStatus.textContent = "Imagens removidas desta questão";
});

elements.loadExample.addEventListener("click", () => {
  loadExample();
  persistToStorage();
});

elements.exportExam.addEventListener("click", () => {
  exportExam();
});

elements.importExam.addEventListener("click", () => {
  elements.importExamFile.value = "";
  elements.importExamFile.click();
});

elements.importExamFile.addEventListener("change", () => {
  const [file] = Array.from(elements.importExamFile.files ?? []);
  importExamFile(file);
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

  const actionTarget = target.closest("button[data-action]");
  if (!(actionTarget instanceof HTMLElement)) {
    return;
  }

  const action = actionTarget.dataset.action;
  const index = Number(actionTarget.dataset.index);
  if (!Number.isInteger(index) || index < 0 || index >= state.questions.length) {
    return;
  }

  if (action === "edit") {
    startEditingQuestion(index);
    persistToStorage();
    return;
  }

  if (action === "move-up") {
    moveItem(index, "up");
    return;
  }

  if (action === "move-down") {
    moveItem(index, "down");
    return;
  }

  if (action !== "remove") {
    return;
  }

  state.questions.splice(index, 1);
  if (state.editingQuestionIndex === index) {
    clearQuestionEditor();
  } else if (Number.isInteger(state.editingQuestionIndex) && state.editingQuestionIndex > index) {
    state.editingQuestionIndex -= 1;
  }

  elements.parserStatus.textContent = "Item removido da prova";
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

// Inicializar o gradiente do slider
const initialValue = elements.questionImageScalePercent.value || 100;
setImageScaleUi(initialValue);
organizeCurrentQuestion();
renderPreview();
persistToStorage();