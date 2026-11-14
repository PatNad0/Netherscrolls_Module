/**
 * Expose effect inspection and conditional roll controls through Foundry applications.
 * Keep interactive controls separate from effect evaluation and persistence.
 */

/** Create foundry effect inspection. */
function createFoundryEffectInspection({
  MODULE,
  NS,
  adjustPool,
  collect,
  collectState,
  contextChoices,
  contextFor,
  endEffect,
  expression,
  hasNative,
  list,
  prepareDC,
  report,
  rollHitDie,
}) {
  /** Append context controls. */
  function appendContextControls(app) {
    const subject = app.config?.subject ?? app.activity;
    const actor = subject?.actor ?? (subject?.documentName === "Actor" ? subject : null);
    if (
      !actor ||
      !hasNative(actor) ||
      !app.element?.querySelector ||
      app.element.querySelector("[data-ns-context]")
    )
      return;
    const choices = new Map();
    // Grants are not applied at roll time, so their conditions are not offered here.
    for (const effect of collect(actor).effects)
      if (!NS.isGrantStat(effect.stat))
        for (const [filter, values] of Object.entries(effect.filters ?? {})) {
          const key = NS.FILTERS[filter];
          if (!key || key === "rollType") continue;
          const set = choices.get(key) ?? new Set();
          for (const value of values) set.add(value);
          choices.set(key, set);
        }
    if (!choices.size) return;
    const form = app.element.matches("form") ? app.element : app.element.querySelector("form");
    if (!form) return;
    const fieldset = document.createElement("fieldset");
    fieldset.dataset.nsContext = "true";
    const legend = document.createElement("legend");
    legend.textContent = "NS effect conditions";
    fieldset.append(legend);
    const context = contextFor(subject, "check");
    const labels = {
      spellClass: "Casting class",
      featureTags: "Feature tags",
      attackKind: "Attack kind",
      damageType: "Damage type",
      weaponId: "NS weapon ID",
      against: "Against",
    };
    for (const [key, values] of choices) {
      const label = document.createElement("label");
      label.className = "form-group";
      const caption = document.createElement("span");
      caption.textContent = labels[key];
      label.append(caption);
      const select = document.createElement("select");
      select.name = `nsEffectContext.${key}`;
      for (const value of ["", ...values]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value || "Automatic";
        select.append(option);
      }
      if (values.has(context[key])) select.value = context[key];
      select.addEventListener(
        "change",
        /** Handle the user event while append context controls. */ () => {
          const selected = { ...contextChoices.get(subject) };
          if (select.value) selected[key] = key === "featureTags" ? [select.value] : select.value;
          else delete selected[key];
          contextChoices.set(subject, selected);
          prepareDC(actor, subject);
        }
      );
      label.append(select);
      fieldset.append(label);
    }
    (form.querySelector(".form-footer") ?? form.querySelector("footer"))?.before(fieldset);
    if (!fieldset.isConnected) form.append(fieldset);
  }

  /** Handle roll native. */
  async function rollNative(actor, stat, context = {}) {
    const { result } = collectState(actor, context);
    if (!(stat in result.values)) throw new Error(`Unknown NS roll stat: ${stat}`);
    const roll = new Roll(`1d20 + (${expression(result, stat)})`);
    await roll.evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `${actor.name}: ${stat}`,
    });
    return roll;
  }

  /** Handle inspect. */
  function inspect(actor) {
    const { result, effects } = collectState(actor);
    const escape = /** Escape. */ (value) =>
      String(value).replace(
        /[&<>"']/g,
        /** Perform the callback while handle inspect. */
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
      );
    const rows = Object.entries(result.values).filter(
      /** Keep entries that satisfy the condition while handle inspect. */ ([key]) =>
        !/\.(misc|bonus|prof)$/.test(key)
    );
    const sourceRows = effects
      .map(
        /** Transform each entry while handle inspect. */
        (entry) =>
          `<tr><td>${escape(entry.source ?? "")}</td><td>${escape(entry.stat)}${entry.mode ? ` (${escape(entry.mode)})` : ""}</td><td>${escape(entry.grant ?? entry.bonus)}${entry.upToMax ? " (up to the maximum)" : ""}</td><td>${entry._nsKind === "active" ? "Active (Foundry)" : "Passive (Netherscrolls)"}</td></tr>`
      )
      .join("");
    // Grants are sets and roll modes, applied by D&D5e; listed here for reference.
    const grantRows = Object.entries(result.grants ?? {})
      .map(
        /** Transform each entry while handle inspect. */
        ([stat, values]) =>
          `<tr><td>${escape(stat)}</td><td>${escape(
            /rollMode$/i.test(stat) ? NS.rollMode(values) : values.join(", ")
          )}</td></tr>`
      )
      .join("");
    const content = `<table><thead><tr><th>NS stat</th><th>Total</th><th>Action</th></tr></thead><tbody>${rows
      .map(
        /** Transform each entry while handle inspect. */
        ([key, value]) =>
          `<tr><td>${escape(key)}</td><td>${escape(result.formulas[key] ?? value)}</td><td>${
            /^(skills|tools|savingThrows)\./.test(key)
              ? `<button type="button" data-ns-roll="${escape(key)}">Roll</button>`
              : /^hitDice\.current/.test(key)
                ? `<button type="button" data-ns-hit-die="${escape(key.split(".").at(-1))}">Roll &amp; spend</button>`
                : /^(spellSlots\.current|currency\.|Ressources\..+\.CurrentQty)/.test(key)
                  ? `<button type="button" data-ns-spend="${escape(key)}">Spend 1</button>`
                  : ""
          }</td></tr>`
      )
      .join("")}</tbody></table>
      ${grantRows ? `<h3>Granted</h3><table><thead><tr><th>NS stat</th><th>Values</th></tr></thead><tbody>${grantRows}</tbody></table>` : ""}
      ${sourceRows ? `<h3>Applied effects</h3><table><thead><tr><th>Source</th><th>Stat</th><th>Bonus</th><th>Kind</th></tr></thead><tbody>${sourceRows}</tbody></table>` : ""}
      ${list(actor.effects)
        .filter(
          /** Keep entries that satisfy the condition while handle inspect. */ (e) =>
            e.flags?.[MODULE]?.nsRuntimeEffect && !e.disabled
        )
        .map(
          /** Transform each entry while handle inspect. */
          (e) =>
            `<p>${escape(e.name)} <button type="button" data-ns-end="${escape(e.id)}">End effect</button></p>`
        )
        .join("")}`;
    const DialogClass = globalThis.foundry?.applications?.api?.DialogV2;
    if (DialogClass)
      return new DialogClass({
        window: { title: `${actor.name}: NS effects` },
        content,
        buttons: [{ action: "close", label: "Close" }],
        render: /** Render. */ (_event, dialog) => {
          for (const button of dialog.element.querySelectorAll("[data-ns-roll]"))
            button.addEventListener(
              "click",
              /** Handle the user event while handle inspect. */ () =>
                rollNative(actor, button.dataset.nsRoll, {
                  rollType: button.dataset.nsRoll.startsWith("savingThrows") ? "save" : "check",
                }).catch(
                  /** Handle the operation failure while handle inspect. */ (error) =>
                    report(actor, error)
                )
            );
          for (const button of dialog.element.querySelectorAll("[data-ns-spend]"))
            button.addEventListener(
              "click",
              /** Handle the user event while handle inspect. */ () =>
                adjustPool(actor, button.dataset.nsSpend, -1)
                  .then(
                    /** Handle the completed operation while handle inspect. */ () => {
                      dialog.close();
                      inspect(actor);
                    }
                  )
                  .catch(
                    /** Handle the operation failure while handle inspect. */ (error) =>
                      report(actor, error)
                  )
            );
          for (const button of dialog.element.querySelectorAll("[data-ns-end]"))
            button.addEventListener(
              "click",
              /** Handle the user event while handle inspect. */ () =>
                endEffect(actor, button.dataset.nsEnd)
                  .then(
                    /** Handle the completed operation while handle inspect. */ () => {
                      dialog.close();
                      inspect(actor);
                    }
                  )
                  .catch(
                    /** Handle the operation failure while handle inspect. */ (error) =>
                      report(actor, error)
                  )
            );
          for (const button of dialog.element.querySelectorAll("[data-ns-hit-die]"))
            button.addEventListener(
              "click",
              /** Handle the user event while handle inspect. */ () =>
                rollHitDie(actor, button.dataset.nsHitDie)
                  .then(
                    /** Handle the completed operation while handle inspect. */ () => {
                      dialog.close();
                      inspect(actor);
                    }
                  )
                  .catch(
                    /** Handle the operation failure while handle inspect. */ (error) =>
                      report(actor, error)
                  )
            );
        },
      }).render({ force: true });
  }

  return { appendContextControls, inspect, rollNative };
}

export { createFoundryEffectInspection };
