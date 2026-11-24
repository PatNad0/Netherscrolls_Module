/**
 * Show a progress window while a library or character import runs. The tracker owns the state
 * (steps, weights, counters) and the window only mirrors it, so a re-render mid-import, or no
 * window at all, never loses progress.
 */
import { IMPORT_TYPES, MODULE_ID } from "../core/constants.js";

const NETHERSCROLLS_PROGRESS_STEP_ICONS = {
  pending: "fa-regular fa-circle",
  active: "fa-solid fa-circle-notch fa-spin",
  done: "fa-solid fa-circle-check",
  error: "fa-solid fa-circle-xmark",
};

// The header icon once the import ends.
const NETHERSCROLLS_PROGRESS_STATE_ICONS = {
  done: "fa-solid fa-circle-check",
  warning: "fa-solid fa-triangle-exclamation",
  error: "fa-solid fa-circle-xmark",
};

// Share of the bar for each library phase. Writing documents is by far the slowest part.
const NETHERSCROLLS_LIBRARY_PHASE_WEIGHTS = { download: 20, clear: 5, import: 75 };

// Rough time per downloaded row, so the bar moves at a steady pace: a class fans out into its
// subclasses and class features, and a monster is a full Actor with embedded items.
const NETHERSCROLLS_LIBRARY_ROW_COST = { classes: 20, monsters: 3 };

// Character import stages (scripts/import/character.js) and how far along each one is.
const NETHERSCROLLS_CHARACTER_IMPORT_STAGES = [
  [/^loading foundry import payload/i, 0.05],
  [/^preparing actor data/i, 0.12],
  [/^resolving items/i, 0.2],
  [
    /^looking up imported library content \((\d+)\/(\d+)\)/i,
    /** Spread the lookups between resolving and writing the actor. */ (match) =>
      0.2 + 0.3 * (Number(match[1]) / Math.max(1, Number(match[2]))),
  ],
  [/^(updating existing|creating) foundry actor/i, 0.55],
  [/^linking actor/i, 0.6],
  [/^adding or updating \d+ items?/i, 0.65],
  [/^linking background/i, 0.75],
  [/^adding or updating \d+ effects?/i, 0.8],
  [/^repairing class features/i, 0.85],
  [
    /^importing companion (\d+) of (\d+)/i,
    /** Spread the companions over the end of the import. */ (match) =>
      0.88 + 0.1 * ((Number(match[1]) - 1) / Math.max(1, Number(match[2]))),
  ],
  [/^complete/i, 1],
];

let NetherscrollsImportProgressWindow = null;

/** Format a count for display. */
function formatNetherscrollsProgressNumber(value) {
  return Number(value ?? 0).toLocaleString();
}

/** Format elapsed milliseconds as m:ss. */
function formatNetherscrollsProgressElapsed(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Hold an import's progress and mirror it into its window when one is open. */
class NetherscrollsImportProgressTracker {
  /** Create a tracker with its ordered steps. */
  constructor({ title, icon, steps, counterLabel = null }) {
    this.title = title;
    this.icon = icon;
    this.detail = "Starting…";
    this.state = "running";
    this.counterLabel = counterLabel;
    this.steps = steps.map(
      /** Give every step its starting state. */ (step) => ({
        weight: 1,
        status: "pending",
        fraction: 0,
        detail: "",
        count: "",
        ...step,
      })
    );
    this.percent = 0;
    this.shownPercent = 0;
    this.documents = 0;
    this.startedAt = Date.now();
    this.finishedAt = null;
    this.app = null;
    this.element = null;
    this.timer = null;
    this.frame = null;
  }

  /** Whether the import is still running. */
  get running() {
    return this.state === "running";
  }

  /** Elapsed time of the import. */
  get elapsed() {
    return formatNetherscrollsProgressElapsed((this.finishedAt ?? Date.now()) - this.startedAt);
  }

  /** Retrieve a step by id. */
  getStep(id) {
    return (
      this.steps.find(/** Match the step id. */ (step) => step.id === id) ?? null
    );
  }

  /** Template context for a (re-)render. */
  getContext() {
    return {
      title: this.title,
      detail: this.detail,
      state: this.state,
      icon: NETHERSCROLLS_PROGRESS_STATE_ICONS[this.state] ?? this.icon,
      steps: this.steps.map(
        /** Add the status icon. */ (step) => ({
          ...step,
          statusIcon: NETHERSCROLLS_PROGRESS_STEP_ICONS[step.status],
        })
      ),
    };
  }

  /** Make a step the current one; every earlier unfinished step is done by then. */
  activate(id, detail = "") {
    const index = this.steps.findIndex(/** Match the step id. */ (step) => step.id === id);
    if (index < 0) return;
    for (const step of this.steps.slice(0, index)) {
      if (step.status !== "pending" && step.status !== "active") continue;
      step.status = "done";
      step.fraction = 1;
    }
    const step = this.steps[index];
    if (step.status === "pending") step.status = "active";
    if (detail) {
      step.detail = detail;
      this.detail = detail;
    }
    this.refresh();
  }

  /** Move a step forward (a step never goes backwards); a count alone does not start it. */
  update(id, { fraction = undefined, detail = undefined, count = undefined } = {}) {
    const step = this.getStep(id);
    if (!step) return;
    if (step.status === "pending" && (fraction !== undefined || detail !== undefined)) {
      step.status = "active";
    }
    if (Number.isFinite(fraction)) {
      step.fraction = Math.max(step.fraction, Math.min(1, Math.max(0, fraction)));
    }
    if (detail !== undefined) {
      step.detail = detail;
      if (step.status === "active") this.detail = detail;
    }
    if (count !== undefined) step.count = count;
    this.refresh();
  }

  /** Mark a step as finished. */
  complete(id, { detail = undefined, count = undefined } = {}) {
    const step = this.getStep(id);
    if (!step) return;
    step.status = "done";
    step.fraction = 1;
    if (detail !== undefined) step.detail = detail;
    if (count !== undefined) step.count = count;
    this.refresh();
  }

  /** Mark one step as failed while the others go on. */
  failStep(id, detail) {
    const step = this.getStep(id);
    if (!step) return;
    step.status = "error";
    step.fraction = 1;
    step.detail = detail;
    this.refresh();
  }

  /** Count saved documents for the footer. */
  addDocuments(count) {
    this.documents += Math.max(0, Number(count) || 0);
  }

  /** End the import successfully, or with a warning when a step failed. */
  finish({ title = undefined, detail = undefined } = {}) {
    for (const step of this.steps) {
      if (step.status !== "pending" && step.status !== "active") continue;
      step.status = "done";
      step.fraction = 1;
    }
    const failed = this.steps.some(/** Find a failed step. */ (step) => step.status === "error");
    this.end(failed ? "warning" : "done", { title, detail });
  }

  /** End the import with an error; the running step carries the message. */
  fail(error, { title = "Import failed", detail = undefined } = {}) {
    const message = error?.message ?? String(error ?? "Unknown error");
    const active = this.steps.filter(/** Running steps. */ (step) => step.status === "active");
    for (const step of active) {
      step.status = "error";
      step.detail = message;
    }
    this.end("error", { title, detail: detail ?? message });
  }

  /** Settle the final state. */
  end(state, { title = undefined, detail = undefined } = {}) {
    if (!this.running) return;
    this.state = state;
    this.finishedAt = Date.now();
    if (title) this.title = title;
    if (detail !== undefined) this.detail = detail;
    if (state !== "error") this.percent = 100;
    this.refresh();
    this.stopTimer();
  }

  /** Overall percentage from the weighted steps; it never goes backwards. */
  computePercent() {
    if (this.state === "done" || this.state === "warning") return 100;
    const total = this.steps.reduce(/** Sum weights. */ (sum, step) => sum + step.weight, 0);
    if (!total) return this.percent;
    const reached = this.steps.reduce(
      /** Sum weighted progress. */ (sum, step) => sum + step.weight * step.fraction,
      0
    );
    return Math.max(this.percent, Math.min(100, (reached / total) * 100));
  }

  /** Bind the rendered window. */
  attach(app) {
    this.app = app;
    this.element = app?.element?.querySelector?.("[data-ns-progress]") ?? null;
    if (!this.element) return;
    this.element
      .querySelector("[data-ns-progress-close]")
      ?.addEventListener("click", /** Close the finished window. */ () => app.close());
    if (this.running && !this.timer) {
      this.timer = setInterval(/** Tick the elapsed time. */ () => this.renderStats(), 1000);
    }
    this.refresh();
    this.animatePercent();
  }

  /** Release the window. */
  detach() {
    this.stopTimer();
    if (this.frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.frame);
    this.frame = null;
    this.element = null;
    this.app = null;
  }

  /** Stop the elapsed-time ticker. */
  stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Mirror the state into the window. */
  refresh() {
    this.percent = this.computePercent();
    const root = this.element;
    if (!root?.isConnected) return;
    root.dataset.state = this.state;
    this.app?.element?.classList?.toggle("is-running", this.running);

    const icon = root.querySelector("[data-ns-progress-icon]");
    if (icon) icon.className = NETHERSCROLLS_PROGRESS_STATE_ICONS[this.state] ?? this.icon;
    const title = root.querySelector("[data-ns-progress-title]");
    if (title) title.textContent = this.title;
    const detail = root.querySelector("[data-ns-progress-detail]");
    if (detail) detail.textContent = this.detail;

    const meter = root.querySelector("[data-ns-progress-meter]");
    meter?.setAttribute("aria-valuenow", String(Math.floor(this.percent)));
    // The quill rides the leading edge of the ink.
    for (const edge of root.querySelectorAll("[data-ns-progress-fill], [data-ns-progress-quill]")) {
      edge.style.transform = `translateX(${this.percent - 100}%)`;
    }

    for (const step of this.steps) {
      const item = root.querySelector(`[data-ns-step="${step.id}"]`);
      if (!item) continue;
      const changed = item.dataset.status !== step.status;
      item.dataset.status = step.status;
      const statusIcon = item.querySelector("[data-ns-step-icon]");
      if (statusIcon) statusIcon.className = NETHERSCROLLS_PROGRESS_STEP_ICONS[step.status];
      const count = item.querySelector("[data-ns-step-count]");
      if (count) count.textContent = step.count;
      const stepDetail = item.querySelector("[data-ns-step-detail]");
      if (stepDetail) stepDetail.textContent = step.detail;
      const bar = item.querySelector("[data-ns-step-fill]");
      if (bar) bar.style.transform = `scaleX(${step.fraction})`;
      if (changed && step.status === "active") this.revealStep(item);
    }

    const close = root.querySelector("[data-ns-progress-close]");
    if (close) close.hidden = this.running;
    const failed = this.state === "error";
    const closeIcon = root.querySelector("[data-ns-progress-close-icon]");
    if (closeIcon) closeIcon.className = failed ? "fa-solid fa-xmark" : "fa-solid fa-check";
    const closeLabel = root.querySelector("[data-ns-progress-close-label]");
    if (closeLabel) closeLabel.textContent = failed ? "Close" : "Done";
    this.renderStats();
  }

  /** Keep the running step visible in a long list. */
  revealStep(item) {
    item.scrollIntoView?.({ block: "nearest" });
  }

  /** Update the footer counters. */
  renderStats() {
    const stats = this.element?.querySelector?.("[data-ns-progress-stats]");
    if (!stats) return;
    const parts = [];
    if (this.counterLabel) {
      parts.push(`${formatNetherscrollsProgressNumber(this.documents)} ${this.counterLabel}`);
    }
    parts.push(this.elapsed);
    stats.textContent = parts.join(" · ");
  }

  /** Count the percentage up smoothly toward its target. */
  animatePercent() {
    if (this.frame || typeof requestAnimationFrame !== "function") return;
    const step = /** Draw one frame. */ () => {
      const label = this.element?.querySelector?.("[data-ns-progress-percent]");
      if (!label?.isConnected) {
        this.frame = null;
        return;
      }
      const gap = this.percent - this.shownPercent;
      this.shownPercent = Math.abs(gap) < 0.2 ? this.percent : this.shownPercent + gap * 0.12;
      label.textContent = `${Math.floor(this.shownPercent)}%`;
      // Once finished and caught up, there is nothing left to count.
      const settled = !this.running && this.shownPercent === this.percent;
      this.frame = settled ? null : requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }
}

/** Create the window class once Foundry's application API is available. */
function getNetherscrollsImportProgressWindowClass() {
  if (NetherscrollsImportProgressWindow) return NetherscrollsImportProgressWindow;
  const api = globalThis.foundry?.applications?.api;
  if (!api?.ApplicationV2 || !api?.HandlebarsApplicationMixin) return null;

  NetherscrollsImportProgressWindow = class NetherscrollsImportProgressWindowV2 extends (
    api.HandlebarsApplicationMixin(api.ApplicationV2)
  ) {
    static DEFAULT_OPTIONS = {
      classes: ["netherscrolls-progress-window"],
      window: {
        title: "Netherscrolls import",
        icon: "fa-solid fa-right-left",
        resizable: false,
      },
      position: {
        width: 400,
        height: "auto",
      },
    };

    static PARTS = {
      body: {
        template: `modules/${MODULE_ID}/templates/import-progress.hbs`,
      },
    };

    /** Keep the tracker this window mirrors. */
    constructor(tracker, options = {}) {
      super(options);
      this.netherscrollsTracker = tracker;
    }

    /** Prepare context. */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return { ...context, ...this.netherscrollsTracker.getContext() };
    }

    /** Handle render. */
    async _onRender(context, options) {
      await super._onRender(context, options);
      this.netherscrollsTracker.attach(this);
    }

    /** Stay open while the import runs: it is the only place its progress shows. */
    async close(options = {}) {
      if (this.netherscrollsTracker.running && !options.force) return this;
      this.netherscrollsTracker.detach();
      return super.close(options);
    }
  };
  return NetherscrollsImportProgressWindow;
}

/** Open a progress window; without Foundry's application API the tracker still works. */
function openNetherscrollsImportProgress({ title, icon, steps, counterLabel = null }) {
  const tracker = new NetherscrollsImportProgressTracker({ title, icon, steps, counterLabel });
  const WindowClass = getNetherscrollsImportProgressWindowClass();
  if (!WindowClass) return tracker;
  try {
    const app = new WindowClass(tracker);
    Promise.resolve(app.render({ force: true })).catch(
      /** The import goes on without its window. */ (err) =>
        console.warn(`${MODULE_ID} | The import progress window could not open.`, err)
    );
  } catch (err) {
    console.warn(`${MODULE_ID} | The import progress window could not open.`, err);
  }
  return tracker;
}

/** Retrieve the label and icon of a library request. */
function describeNetherscrollsLibraryRequest(request) {
  const type = IMPORT_TYPES.find(
    /** Match the type key. */ (entry) => entry.key === request?.typeKey
  );
  return {
    label: type?.label ?? String(request?.typeKey ?? "Content"),
    icon: type?.icon ?? "fa-solid fa-book",
  };
}

/** Summarize what a dataset import did. */
function describeNetherscrollsLibraryResult(typeKey, result) {
  const saved = /** Created plus updated. */ (entry) =>
    formatNetherscrollsProgressNumber((entry?.created ?? 0) + (entry?.updated ?? 0));
  const counts = result?.[typeKey] ?? {};
  const parts = [];
  if (typeKey === "classes") {
    parts.push(
      `${saved(counts.subclasses)} subclasses`,
      `${saved(counts.features)} class features`
    );
  }
  if (counts.failed) parts.push(`${formatNetherscrollsProgressNumber(counts.failed)} failed`);
  if (counts.review) parts.push(`${formatNetherscrollsProgressNumber(counts.review)} to review`);
  return { count: saved(counts), detail: parts.join(" · ") };
}

/** Open the library import window and translate `replaceNetherscrollsLibrary` events into it. */
function openNetherscrollsLibraryImportProgress(requests) {
  const described = requests.map(describeNetherscrollsLibraryRequest);
  const importId = /** Step id of a dataset. */ (index) => `import-${index}`;
  const tracker = openNetherscrollsImportProgress({
    title: "Importing the library",
    icon: "fa-solid fa-boxes-stacked",
    counterLabel: "documents saved",
    steps: [
      {
        id: "download",
        label: "Download from Netherscrolls",
        icon: "fa-solid fa-cloud-arrow-down",
        weight: NETHERSCROLLS_LIBRARY_PHASE_WEIGHTS.download,
      },
      {
        id: "clear",
        label: "Clear the previous library",
        icon: "fa-solid fa-broom",
        weight: NETHERSCROLLS_LIBRARY_PHASE_WEIGHTS.clear,
      },
      ...described.map(
        /** One step per dataset. */ ({ label, icon }, index) => ({
          id: importId(index),
          label,
          icon,
          weight: NETHERSCROLLS_LIBRARY_PHASE_WEIGHTS.import / Math.max(1, requests.length),
        })
      ),
    ],
  });
  const rows = requests.map(() => 0);
  const writes = requests.map(() => ({ planned: 0, written: 0 }));

  // Share the import part of the bar by expected work once every row count is known.
  const weighImports = /** Redistribute the import weights. */ () => {
    const costs = requests.map(
      /** Expected work of a dataset. */ (request, index) =>
        Math.max(1, rows[index] * (NETHERSCROLLS_LIBRARY_ROW_COST[request.typeKey] ?? 1))
    );
    const total = costs.reduce(/** Sum costs. */ (sum, cost) => sum + cost, 0);
    costs.forEach(
      /** Apply the share. */ (cost, index) => {
        const step = tracker.getStep(importId(index));
        if (step) step.weight = (NETHERSCROLLS_LIBRARY_PHASE_WEIGHTS.import * cost) / total;
      }
    );
  };

  const onProgress = /** Handle one `replaceNetherscrollsLibrary` event. */ (event) => {
    const index = event.index ?? 0;
    const label = described[index]?.label ?? "";
    switch (event.stage) {
      case "fetch": {
        tracker.activate("download");
        const pageShare = event.pages ? event.page / event.pages : 0;
        tracker.update("download", {
          fraction: (index + pageShare) / requests.length,
          detail:
            event.pages > 1
              ? `Downloading ${label.toLowerCase()} — page ${event.page} of ${event.pages}`
              : `Downloading ${label.toLowerCase()}…`,
        });
        break;
      }
      case "fetched": {
        rows[index] = Number(event.rows) || 0;
        tracker.update(importId(index), { count: formatNetherscrollsProgressNumber(rows[index]) });
        tracker.update("download", { fraction: (index + 1) / requests.length });
        if (index === requests.length - 1) weighImports();
        break;
      }
      case "clear": {
        const done = formatNetherscrollsProgressNumber(event.done);
        const total = formatNetherscrollsProgressNumber(event.total);
        tracker.activate("clear");
        tracker.update("clear", {
          fraction: event.total ? event.done / event.total : 0,
          detail: event.total
            ? `Removing old entries — ${done} of ${total}`
            : "Checking the previous library…",
        });
        break;
      }
      case "import":
        tracker.complete("clear");
        tracker.activate(importId(index), `Preparing ${label.toLowerCase()}…`);
        break;
      case "write": {
        const progress = writes[index];
        if (event.planned) progress.planned += event.planned;
        if (event.written) {
          progress.written += event.written;
          tracker.addDocuments(event.written);
        }
        if (!progress.planned) break;
        const written = formatNetherscrollsProgressNumber(progress.written);
        const planned = formatNetherscrollsProgressNumber(progress.planned);
        // Classes write several kinds of documents one after another; hold the last few percent
        // until the dataset reports it is done.
        tracker.update(importId(index), {
          fraction: Math.min(0.95, progress.written / progress.planned),
          detail: `Saving ${label.toLowerCase()} — ${written} of ${planned}`,
        });
        break;
      }
      case "imported":
        tracker.complete(
          importId(index),
          describeNetherscrollsLibraryResult(event.request?.typeKey, event.result)
        );
        break;
      default:
        break;
    }
  };

  return {
    tracker,
    onProgress,
    /** Show the finished state. */
    finish() {
      const documents = formatNetherscrollsProgressNumber(tracker.documents);
      tracker.finish({
        title: "Library imported",
        detail: `${documents} documents saved in ${tracker.elapsed}.`,
      });
    },
    /** Show the failure; before clearing started, nothing was changed. */
    fail(error) {
      const message = error?.message ?? String(error);
      const untouched = tracker.getStep("clear")?.status === "pending";
      tracker.fail(error, {
        title: "Library import failed",
        detail: untouched ? `${message} Your existing library was kept.` : message,
      });
    },
  };
}

/** How far a character import stage is, or null for an unknown stage. */
function getNetherscrollsCharacterStageFraction(stage) {
  const text = String(stage ?? "").trim();
  for (const [pattern, fraction] of NETHERSCROLLS_CHARACTER_IMPORT_STAGES) {
    const match = text.match(pattern);
    if (match) return typeof fraction === "function" ? fraction(match) : fraction;
  }
  return null;
}

/** Turn "creating Foundry actor..." into "Creating Foundry actor…". */
function formatNetherscrollsCharacterStage(stage) {
  const text = String(stage ?? "")
    .trim()
    .replace(/\.{3}$/, "…");
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

/** Open the character import window; one step per selected character. */
function openNetherscrollsCharacterImportProgress(characters) {
  const names = characters.map(
    /** Display name. */ (character) => character?.name ?? "Unnamed Character"
  );
  const stepId = /** Step id of a character. */ (index) => `character-${index}`;
  const tracker = openNetherscrollsImportProgress({
    title: names.length === 1 ? `Importing ${names[0]}` : `Importing ${names.length} characters`,
    icon: "fa-solid fa-users",
    steps: names.map(
      /** One step per character. */ (name, index) => ({
        id: stepId(index),
        label: name,
        icon: "fa-solid fa-user",
      })
    ),
  });

  return {
    tracker,
    /** A character starts. */
    start(index) {
      tracker.activate(stepId(index), "Loading the character…");
    },
    /** A character reached a stage of its import. */
    stage(index, stage) {
      const fraction = getNetherscrollsCharacterStageFraction(stage);
      const detail = formatNetherscrollsCharacterStage(stage);
      tracker.update(stepId(index), {
        ...(fraction === null ? {} : { fraction }),
        ...(detail ? { detail: `${names[index]}: ${detail}` } : {}),
      });
    },
    /** A character was imported. */
    done(index, result) {
      tracker.complete(stepId(index), {
        detail: result?.created ? "Created" : "Updated",
      });
    },
    /** A character failed; the others go on. */
    failed(index, error) {
      tracker.failStep(stepId(index), error?.message ?? String(error));
    },
    /** Show the finished state. */
    finish({ failed = 0 } = {}) {
      const imported = names.length - failed;
      tracker.finish({
        title: failed
          ? `${failed} of ${names.length} characters failed`
          : names.length === 1
            ? `${names[0]} imported`
            : `${names.length} characters imported`,
        detail: failed
          ? `${imported} imported. See the console for the failures.`
          : `Done in ${tracker.elapsed}.`,
      });
    },
    /** Show an error that stopped the whole import. */
    fail(error) {
      tracker.fail(error, { title: "Character import failed" });
    },
  };
}

export {
  NetherscrollsImportProgressTracker,
  getNetherscrollsCharacterStageFraction,
  openNetherscrollsCharacterImportProgress,
  openNetherscrollsImportProgress,
  openNetherscrollsLibraryImportProgress,
};
