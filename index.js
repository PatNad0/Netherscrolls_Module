Hooks.on("renderActorSheet", (app, html) => {
  const actor = app?.document ?? app?.actor;
  if (!actor) return;

  const appElement = app?.element ?? html;
  const header = appElement?.find?.(".window-header") ?? html.closest(".window-app").find(".window-header");
  if (!header?.length) return;

  if (header.find('[data-action="netherscrolls.sayHello"]').length) return;

  const label = game?.i18n?.localize("NETHERSCROLLS.SayHello") ?? "Say hello";
  const button = $(`
    <a class="header-button netherscrolls-hello-button" data-action="netherscrolls.sayHello">
      <i class="fas fa-comment"></i>${label}
    </a>
  `);

  button.on("click", () => {
    const actorName = actor?.name ?? "actor";
    const content =
      game?.i18n?.format("NETHERSCROLLS.HelloMessage", { name: actorName }) ??
      `helo from ${actorName}`;
    ChatMessage.create({ content });
  });

  const title = header.find(".window-title");
  if (title.length) {
    title.after(button);
  } else {
    header.append(button);
  }
});
