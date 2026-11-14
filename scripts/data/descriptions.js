/**
 * Render structured content and progression tables through shared HTML helpers.
 * Normalize equivalent sections before combining them so imports do not repeat descriptions.
 */
import { escapeHtml, toTrimmedStringOrNull } from "../core/utils.js";

/** Normalize inferred feature title. */
function normalizeNetherscrollsInferredFeatureTitle(value) {
  const title = toTrimmedStringOrNull(
    String(value ?? "").replace(/^[\s*\u2022\-\u2013\u2014]+/, "")
  );
  if (!title) return null;
  if (/^(?:-|\u2013|\u2014|none|n\/a|null)$/i.test(title)) return null;
  if (/^\+?\d+(?:d\d+)?$/i.test(title)) return null;
  return title;
}

/** Retrieve html value. */
function getNetherscrollsHtmlValue(value) {
  return toTrimmedStringOrNull(value) ?? "";
}

/** Handle join html sections. */
function joinNetherscrollsHtmlSections(sections) {
  const normalized = new Set();
  const uniqueSections = [];
  for (const section of sections) {
    const html = toTrimmedStringOrNull(section);
    if (!html) continue;

    const key = normalizeNetherscrollsHtmlSectionKey(html);
    if (key && normalized.has(key)) continue;
    if (key) normalized.add(key);
    uniqueSections.push(html);
  }
  return uniqueSections.join("\n");
}

/** Normalize html section key. */
function normalizeNetherscrollsHtmlSectionKey(value) {
  return stripNetherscrollsHtmlTags(value).toLowerCase().replace(/\s+/g, " ").trim();
}

/** Retrieve progression table. */
function getNetherscrollsProgressionTable(source) {
  const table =
    source?.presentation?.progressionTable ??
    source?.progressionTable ??
    source?.presentation?.progression ??
    source?.progression;
  if (!table || typeof table !== "object") return null;
  const columns = Array.isArray(table.columns) ? table.columns : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];
  if (!columns.length || !rows.length) return null;
  return {
    columns,
    rows,
    spellcasting:
      table.spellcasting ??
      source?.presentation?.progressionTable?.spellcasting ??
      source?.progressionTable?.spellcasting ??
      source?.presentation?.progression?.spellcasting ??
      source?.progression?.spellcasting ??
      {},
  };
}

/** Retrieve progression column label. */
function getNetherscrollsProgressionColumnLabel(column) {
  if (typeof column === "string") return column;
  return (
    toTrimmedStringOrNull(
      column?.label ?? column?.title ?? column?.name ?? column?.key ?? column?.id
    ) ?? ""
  );
}

/** Format progression cell. */
function formatNetherscrollsProgressionCell(value) {
  if (Array.isArray(value))
    return value.map(formatNetherscrollsProgressionCell).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    if (value.name || value.title) return toTrimmedStringOrNull(value.name ?? value.title) ?? "";
    return Object.values(value).map(formatNetherscrollsProgressionCell).filter(Boolean).join(", ");
  }
  return String(value ?? "");
}

/** Render blocks. */
function renderNetherscrollsBlocks(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks.map(renderNetherscrollsBlock).filter(Boolean).join("\n");
}

/** Render block. */
function renderNetherscrollsBlock(block) {
  const type = toTrimmedStringOrNull(block?.type)?.toLowerCase();
  if (type === "p" || Array.isArray(block?.paragraphs)) {
    return (Array.isArray(block?.paragraphs) ? block.paragraphs : [])
      .map(
        /** Transform each entry while render block. */ (paragraph) =>
          `<p>${escapeHtml(String(paragraph ?? ""))}</p>`
      )
      .join("");
  }
  if (["heading", "h1", "h2", "h3", "h4"].includes(type)) {
    return `<h2>${escapeHtml(String(block?.text ?? block?.title ?? ""))}</h2>`;
  }
  if (type === "list") return renderNetherscrollsListBlock(block);
  if (type === "table") return renderNetherscrollsTableBlock(block);
  if (type === "html") return getNetherscrollsHtmlValue(block?.html);
  return "";
}

/** Render list block. */
function renderNetherscrollsListBlock(block) {
  const items = Array.isArray(block?.items) ? block.items : [];
  if (!items.length) return "";
  const tag = block?.ordered ? "ol" : "ul";
  const html = items
    .map(
      /** Transform each entry while render list block. */ (item) => {
        const paragraphs = Array.isArray(item?.paragraphs)
          ? item.paragraphs
          : [item?.text ?? item?.title ?? item];
        const content = paragraphs
          .map(
            /** Transform each entry while render list block. */ (paragraph) =>
              escapeHtml(String(paragraph ?? ""))
          )
          .filter(Boolean)
          .join("<br>");
        return content ? `<li>${content}</li>` : "";
      }
    )
    .filter(Boolean)
    .join("");
  return html ? `<${tag}>${html}</${tag}>` : "";
}

/** Render table block. */
function renderNetherscrollsTableBlock(block) {
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const headerRows = Array.isArray(block?.header) ? block.header : [];
  const rows = Array.isArray(block?.rows) ? block.rows : [];
  if (!columns.length && !headerRows.length && !rows.length) return "";

  const headerSource = headerRows.length ? headerRows : columns.length ? [columns] : [];
  const header = headerSource.length
    ? `<thead>${headerSource.map(/** Transform each entry while render table block. */ (row) => `<tr>${renderNetherscrollsTableCells(row, "th")}</tr>`).join("")}</thead>`
    : "";
  const body = rows.length
    ? `<tbody>${rows.map(/** Transform each entry while render table block. */ (row) => `<tr>${renderNetherscrollsTableCells(row, "td")}</tr>`).join("")}</tbody>`
    : "";
  return `<table>${header}${body}</table>`;
}

/** Render table cells. */
function renderNetherscrollsTableCells(row, tag) {
  const cells = Array.isArray(row) ? row : [row];
  return cells
    .map(
      /** Transform each entry while render table cells. */ (cell) =>
        `<${tag}>${escapeHtml(formatNetherscrollsProgressionCell(cell))}</${tag}>`
    )
    .join("");
}

/** Retrieve blocks text. */
function getNetherscrollsBlocksText(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks.map(getNetherscrollsBlockText).filter(Boolean).join(" ");
}

/** Retrieve block text. */
function getNetherscrollsBlockText(block) {
  const type = toTrimmedStringOrNull(block?.type)?.toLowerCase();
  if (["heading", "h1", "h2", "h3", "h4"].includes(type)) {
    return toTrimmedStringOrNull(block?.text ?? block?.title ?? block?.name) ?? "";
  }
  if (type === "html") return stripNetherscrollsHtmlTags(block?.html);
  if (Array.isArray(block?.paragraphs))
    return block.paragraphs
      .map(
        /** Transform each entry while retrieve block text. */ (paragraph) =>
          String(paragraph ?? "")
      )
      .join(" ");
  if (type === "list" && Array.isArray(block?.items)) {
    return block.items
      .map(
        /** Transform each entry while retrieve block text. */ (item) =>
          Array.isArray(item?.paragraphs) ? item.paragraphs : [item?.text ?? item?.title ?? item]
      )
      .flat()
      .map(
        /** Transform each entry while retrieve block text. */ (paragraph) =>
          String(paragraph ?? "")
      )
      .join(" ");
  }
  if (type === "table") {
    return [block?.columns, block?.header, block?.rows]
      .flat(3)
      .map(/** Transform each entry while retrieve block text. */ (cell) => String(cell ?? ""))
      .join(" ");
  }
  return "";
}

/** Extract first html heading title. */
function extractNetherscrollsFirstHtmlHeadingTitle(value) {
  const html = getNetherscrollsHtmlValue(value);
  if (!html) return null;
  const match = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(html);
  return match
    ? normalizeNetherscrollsInferredFeatureTitle(stripNetherscrollsHtmlTags(match[1]))
    : null;
}

/** Handle strip html tags. */
function stripNetherscrollsHtmlTags(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return "";
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export {
  extractNetherscrollsFirstHtmlHeadingTitle,
  formatNetherscrollsProgressionCell,
  getNetherscrollsBlocksText,
  getNetherscrollsHtmlValue,
  getNetherscrollsProgressionColumnLabel,
  getNetherscrollsProgressionTable,
  joinNetherscrollsHtmlSections,
  normalizeNetherscrollsInferredFeatureTitle,
  renderNetherscrollsBlocks,
  stripNetherscrollsHtmlTags,
};
