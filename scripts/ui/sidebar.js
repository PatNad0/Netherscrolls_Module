/**
 * Provide the module sidebar entry and its two navigation actions.
 * Select the supported Foundry sidebar application without changing the transfer workflow.
 */
import { MODULE_ID } from "../core/constants.js";
import { NetherscrollsImportSettings } from "./transfer.js";

const NETHERSCROLLS_SIDEBAR_TAB = "netherscrolls-sidebar";

const NetherscrollsSidebarTab = createNetherscrollsSidebarTabClass();

/** Handle open module configuration. */
function openNetherscrollsModuleConfiguration() {
  const SettingsConfig = globalThis.foundry?.applications?.settings?.SettingsConfig;
  if (SettingsConfig)
    return new SettingsConfig({ initialCategory: MODULE_ID }).render({ force: true });
  return ui?.settings?.activate?.();
}

/** Handle open importer. */
function openNetherscrollsImporter() {
  return new NetherscrollsImportSettings().render({ force: true });
}

/** Create sidebar tab class. */
function createNetherscrollsSidebarTabClass() {
  const HandlebarsApplicationMixin =
    globalThis.foundry?.applications?.api?.HandlebarsApplicationMixin;
  const AbstractSidebarTab = globalThis.foundry?.applications?.sidebar?.AbstractSidebarTab;
  if (!HandlebarsApplicationMixin || !AbstractSidebarTab) return null;

  return class NetherscrollsSidebarTab extends HandlebarsApplicationMixin(AbstractSidebarTab) {
    static tabName = NETHERSCROLLS_SIDEBAR_TAB;

    static DEFAULT_OPTIONS = {
      id: NETHERSCROLLS_SIDEBAR_TAB,
      classes: ["netherscrolls-sidebar-tab"],
      window: {
        title: "Netherscrolls",
        icon: "fa-solid fa-scroll",
      },
      actions: {
        openModuleConfig: /** Handle open module config. */ () =>
          openNetherscrollsModuleConfiguration(),
        openImporter: /** Handle open importer. */ () => openNetherscrollsImporter(),
      },
    };

    static PARTS = {
      content: {
        template: `modules/${MODULE_ID}/templates/netherscrolls-sidebar-tab.hbs`,
        root: true,
      },
    };
  };
}

/** Register the module tab ahead of settings while retaining Foundry's existing settings descriptor. */
function registerNetherscrollsSidebarTab() {
  if (!NetherscrollsSidebarTab) return;

  const uiConfig = globalThis.CONFIG?.ui;
  if (!uiConfig) return;

  uiConfig[NETHERSCROLLS_SIDEBAR_TAB] = NetherscrollsSidebarTab;
  const Sidebar = uiConfig.sidebar;
  if (!Sidebar?.TABS) return;

  const descriptor = {
    icon: "fa-solid fa-scroll",
    tooltip: "Netherscrolls",
  };
  const settingsTab = Sidebar.TABS.settings;
  if (settingsTab) delete Sidebar.TABS.settings;
  Sidebar.TABS[NETHERSCROLLS_SIDEBAR_TAB] = descriptor;
  if (settingsTab) Sidebar.TABS.settings = settingsTab;
}

export { registerNetherscrollsSidebarTab };
