const NS_HELLO_ACTION = "netherscrolls.sayHello";

function nsPostHello(actor) {
  const actorName = actor?.name ?? "actor";
  const content =
    game?.i18n?.format("NETHERSCROLLS.HelloMessage", { name: actorName }) ??
    `helo from ${actorName}`;
  ChatMessage.create({ content });
}

Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
  const actor = app?.document ?? app?.actor;
  if (!actor) return;

  buttons.unshift({
    label: game?.i18n?.localize("NETHERSCROLLS.SayHello") ?? "HELO",
    class: "netherscrolls-hello-button",
    icon: "fas fa-comment",
    onclick: () => nsPostHello(actor)
  });
});

Hooks.on("renderActorSheet", (app, html) => {
  const actor = app?.document ?? app?.actor;
  if (!actor) return;

  const $html = html instanceof HTMLElement ? $(html) : html;
  const appElement = app?.element ?? $html;
  const header =
    appElement?.find?.(".window-header, .app-header") ??
    $html.closest(".window-app, .app").find(".window-header, .app-header");
  if (!header?.length) return;

  if (
    header.find(`[data-action="${NS_HELLO_ACTION}"]`).length ||
    header.find(".netherscrolls-hello-button").length
  )
    return;

  const label = game?.i18n?.localize("NETHERSCROLLS.SayHello") ?? "HELO";
  const button = $(`
    <a class="header-button netherscrolls-hello-button" data-action="${NS_HELLO_ACTION}" title="${label}">
      <i class="fas fa-comment"></i>${label}
    </a>
  `);

  button.on("click", () => nsPostHello(actor));

  const controls = header.find(".window-controls, .header-controls");
  if (controls.length) {
    controls.prepend(button);
    return;
  }

  const title = header.find(".window-title, .title");
  if (title.length) {
    title.after(button);
  } else {
    header.append(button);
  }
});
