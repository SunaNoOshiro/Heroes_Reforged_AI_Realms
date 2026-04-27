#!/usr/bin/env node
/**
 * Curate UI screen packages by hand-authored data.
 *
 * The first batch defines visual anchors. Later batches keep the same
 * screen-specific standard without falling back to generic scaffolds.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SCREENS_DIR = join(ROOT, "docs", "architecture", "wiki", "screens");
const PLAN_PATH = join(ROOT, "docs", "architecture", "wiki", "screen-curation-plan.md");

const COMMON_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 800px; height: 600px; overflow: hidden; background: #070504; }
  body { color: #f1dd9b; font-family: Georgia, "Times New Roman", serif; }
  svg { width: 800px; height: 600px; display: block; background: #130b07; }
  .gold { fill: #f5d77a; }
  .soft { fill: #d8bd76; }
  .tiny { fill: #ead6a3; font: 10px ui-monospace, Menlo, monospace; }
  .small { fill: #f4dfac; font: 12px Georgia, serif; }
  .label { fill: #fff0b8; font: 700 13px Georgia, serif; }
  .title { fill: #ffe28a; font: 700 25px Georgia, serif; letter-spacing: .6px; }
  .huge { fill: #f8d96a; font: 700 58px Georgia, serif; letter-spacing: 1px; }
  .frame { fill: none; stroke: #d9b245; stroke-width: 4; }
  .innerFrame { fill: none; stroke: #3c190c; stroke-width: 2; }
  .panel { fill: #382012; stroke: #c49a42; stroke-width: 1.5; }
  .redPanel { fill: #6f0d0b; stroke: #d7ad45; stroke-width: 1.5; }
  .wood { fill: #3d2413; stroke: #8b6229; stroke-width: 1; }
  .slot { fill: #27180f; stroke: #8d6a30; stroke-width: 1; }
  .slotHot { fill: #623516; stroke: #ffdf76; stroke-width: 1.5; filter: url(#glow); }
  .button { cursor: pointer; }
  .button rect.outer { fill: #4f2713; stroke: #e1bd55; stroke-width: 1.4; }
  .button rect.inner { fill: #7e431f; stroke: #2b1308; stroke-width: .7; }
  .button text { fill: #ffe59a; font: 700 12px Georgia, serif; }
  .button:hover rect.outer { filter: url(#glow); stroke: #fff1a8; }
  .rightChrome { fill: #51311b; stroke: #dbb85a; stroke-width: 2; }
  .resource { fill: #0f4618; stroke: #d0b052; stroke-width: 1; }
  .status { fill: #2c190e; stroke: #d6ad4a; stroke-width: 1; }
  .hex { fill: rgba(87,111,47,.28); stroke: rgba(210,232,73,.78); stroke-width: .9; }
  .path { fill: none; stroke: #ffeb82; stroke-width: 3; stroke-dasharray: 8 7; animation: dash 1s linear infinite; }
  .pulse { animation: pulse 1.4s ease-in-out infinite; }
  .float { animation: floatUp 1.8s ease-out infinite; }
  .modal { animation: modalIn .18s ease-out both; }
  @keyframes pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
  @keyframes dash { to { stroke-dashoffset: -30; } }
  @keyframes floatUp { 0% { opacity: 0; transform: translateY(10px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(-22px); } }
  @keyframes modalIn { from { opacity: 0; transform: scale(.985) translateY(6px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
`;

const screens = {
  "01-main-menu": {
    number: "01",
    title: "Main Menu",
    system: "menus",
    archetype: "curated-menu",
    refs: [],
    description: "Boot shell menu with full-bleed fantasy painting, title treatment, icon-backed menu buttons, and no gameplay state loaded.",
    visual: "Full-screen illustrated backdrop, ornate gold border, oversized game title at upper-left, and vertical icon-backed command buttons on the right.",
    mechanics: "Routes only into setup, save/load, high scores, credits/options, or quit confirmation. No deterministic gameplay state is created until New Game completes setup.",
    animation: "Storm/cloud shimmer, title glint, hovered command icon glow, pressed command depresses, and route fade after guard approval.",
    components: ["MainMenuShell", "BackdropPainting", "LogoTitle", "CommandStack", "VersionLabel", "RouteFadeOverlay"],
    bindings: [
      ["menu.commands", "state.shell.availableCommands", "Controls enabled by shell mode and platform capabilities."],
      ["lastSaveAvailable", "state.persistence.hasLoadableSave", "Load button is disabled when no compatible save manifest exists."],
      ["quitGuard", "state.shell.quitRequiresConfirmation", "Quit opens confirmation instead of closing immediately when required."],
    ],
    actions: [
      ["New Game", "`mainMenu.newGame`", "navigation", "`02-new-game-setup`", "`OPEN_NEW_GAME_SETUP`", "Creates local setup draft only."],
      ["Load Game", "`mainMenu.loadGame`", "navigation", "`55-save-load`", "`OPEN_LOAD_GAME`", "Reads save manifests; does not load until a slot is confirmed."],
      ["High Score", "`mainMenu.highScore`", "navigation", "`57-high-scores`", "`OPEN_HIGH_SCORES`", "Reads completed-game score records."],
      ["Credits", "`mainMenu.credits`", "navigation", "`05-intro-cinematic`", "`OPEN_CREDITS_OR_INTRO`", "Routes to presentation-only cinematic shell."],
      ["Quit", "`mainMenu.quit`", "navigation", "`60-confirmation-dialog`", "`REQUEST_QUIT_CONFIRMATION`", "No gameplay mutation."],
    ],
    html: menuHtml,
    diagram: {
      load: ["App boot", "Shell asset manifest", "Localization", "Command availability", "Main menu view"],
      command: ["Pointer/key", "Command guard", "Route request", "Fade animation", "Destination screen"],
      animation: ["Idle storm", "Hover glow", "Button press", "Route fade"],
    },
  },
  "07-adventure-map": {
    number: "07",
    title: "Adventure Map",
    system: "adventure",
    archetype: "curated-adventure-map",
    refs: [],
    description: "Primary strategic map with terrain viewport, fog of war, object interaction, hero path preview, minimap, army/hero sidebars, resources, and date.",
    visual: "Large map viewport dominates the screen, with a narrow right command/minimap panel and a thin resource/date strip along the bottom.",
    mechanics: "Hero selection, path preview, tile movement, object visits, fog reveal, town/hero focus, spell targeting, and end-turn all dispatch deterministic commands.",
    animation: "Dotted path marches, hero steps tile-by-tile after reducer acceptance, fog peels from revealed tiles, minimap box tracks viewport, status messages scroll.",
    components: ["AdventureMapScreen", "MapViewport", "FogMask", "PathPreview", "ObjectLayer", "RightCommandPanel", "MiniMap", "HeroArmyPanel", "ResourceDateBar", "StatusLine"],
    bindings: [
      ["map.tiles", "state.adventure.visibleTiles", "Rendered from scenario map plus fog visibility."],
      ["selectedHero", "state.adventure.selectedHeroId", "Controls portrait, movement points, army, and path preview."],
      ["pathPreview", "state.ui.adventure.pathPreview", "UI draft until confirmed movement command."],
      ["resources", "state.players.active.resources", "Authoritative player resources."],
      ["date", "state.calendar.currentDate", "Month/week/day text and end-turn state."],
    ],
    actions: [
      ["Select hero", "`adventure.selectHero`", "local-ui", "Current screen", "`SELECT_ADVENTURE_HERO`", "Updates selected hero draft and side panel."],
      ["Preview path", "`adventure.previewPath`", "local-ui", "Current screen", "`PREVIEW_HERO_PATH`", "Computes visible route without spending movement."],
      ["Move hero", "`adventure.moveHero`", "command", "Current screen or object dialog", "`MOVE_HERO_ALONG_PATH`", "Consumes movement, reveals fog, may trigger object visit."],
      ["Open town", "`adventure.openTown`", "navigation", "`24-town-screen`", "`OPEN_TOWN_SCREEN`", "Routes if selected town is owned/visible."],
      ["Cast adventure spell", "`adventure.castSpell`", "navigation", "`17-adventure-spell-targeting`", "`OPEN_ADVENTURE_SPELL_TARGETING`", "Creates spell targeting UI draft."],
      ["End turn", "`adventure.endTurn`", "command", "Current screen or AI turn indicator", "`END_PLAYER_TURN`", "Commits turn transition and calendar updates."],
    ],
    html: adventureHtml,
    diagram: {
      load: ["Scenario map", "Fog visibility", "Hero/town selectors", "Asset resolver", "Adventure view model"],
      command: ["Tile click", "Pathfinder preview", "Move command", "Reducer", "Fog/object result"],
      animation: ["Path pulse", "Step movement", "Fog reveal", "Status line"],
    },
  },
  "24-town-screen": {
    number: "24",
    title: "Town Screen",
    system: "town",
    archetype: "curated-town",
    refs: [],
    description: "Town management panorama with clickable building hotspots, town/visiting hero armies, construction state, recruit/service entry points, resources, and exit back to adventure.",
    visual: "Faction panorama fills the upper screen; bottom red-brown management strip contains town portrait, garrison rows, visiting hero rows, service icons, and resource strip.",
    mechanics: "Building inspection, one-build-per-day construction, recruitment, mage guild/tavern/market routing, garrison transfer, visiting hero context, and exit use town selectors and commands.",
    animation: "Building hotspots glow on hover, newly built structures brighten in the panorama, recruit counts tick, army drag ghosts snap between legal slots.",
    components: ["TownScreen", "TownPanorama", "BuildingHotspots", "TownHeader", "TownGarrisonRow", "VisitingHeroRow", "ServiceButtons", "BuildStatePlaque", "ResourceDateBar"],
    bindings: [
      ["town.id", "state.towns.selectedTownId", "Current town context."],
      ["town.buildings", "state.towns.byId[selected].buildings", "Controls hotspots, built state, and availability."],
      ["dailyBuild", "state.towns.byId[selected].builtToday", "Disables construction after one build."],
      ["garrison", "state.towns.byId[selected].garrison", "Town army row."],
      ["visitingHero", "state.adventure.visitingHeroId", "Visiting hero army row and hero portrait."],
    ],
    actions: [
      ["Select building", "`town.selectBuilding`", "local-ui", "Current screen", "`SELECT_TOWN_BUILDING`", "Highlights hotspot and updates status line."],
      ["Open build tree", "`town.openBuildTree`", "navigation", "`30-build-tree`", "`OPEN_BUILD_TREE`", "Routes with selected town context."],
      ["Recruit creatures", "`town.recruit`", "navigation", "`25-building-recruitment-dialog`", "`OPEN_RECRUITMENT_DIALOG`", "Opens dwelling/town recruit contract."],
      ["Open mage guild", "`town.mageGuild`", "navigation", "`29-mage-guild`", "`OPEN_MAGE_GUILD`", "Uses visiting hero eligibility if present."],
      ["Transfer army", "`town.transferArmy`", "command", "Current screen", "`TRANSFER_TOWN_ARMY_STACK`", "Moves stack after ownership/capacity checks."],
      ["Exit town", "`town.exit`", "navigation", "`07-adventure-map`", "`CLOSE_TOWN_SCREEN`", "Returns to adventure map focus."],
    ],
    html: townHtml,
    diagram: {
      load: ["Town selector", "Building registry", "Hero/town garrisons", "Service availability", "Town view model"],
      command: ["Building/service click", "Availability guard", "Route or command", "Reducer", "Refresh town"],
      animation: ["Hotspot glow", "Build flash", "Recruit tick", "Army snap"],
    },
  },
  "25-building-recruitment-dialog": {
    number: "25",
    title: "Building / Recruitment Dialog",
    system: "town",
    archetype: "curated-town-recruitment",
    curation: "curated-pass-2",
    variant: "recruitment",
    refs: [],
    description: "Town dwelling recruitment dialog with creature portrait, dwelling selection, available growth, quantity controls, total cost, and destination stack preview.",
    visual: "Town panorama is dimmed behind a red-and-bronze service panel: dwelling list left, creature art and stats center, quantity/cost/army destination on the right.",
    mechanics: "Recruit validates town ownership, built dwelling, available stock, resource cost, and army capacity before creating or merging a stack.",
    animation: "Dwelling row highlights, quantity counter ticks, max button fills the slider, accepted recruits slide toward the destination army slot.",
    components: ["RecruitmentDialog", "DwellingList", "CreaturePortrait", "CreatureStats", "QuantityStepper", "CostPanel", "DestinationArmyPreview", "ConfirmCancelButtons"],
    bindings: [
      ["town.id", "state.towns.selectedTownId", "Town providing dwelling stock."],
      ["dwelling.stock", "state.towns.byId[selected].dwellingStock", "Available creatures by dwelling."],
      ["selectedDwelling", "state.ui.town.selectedDwellingId", "Local recruitment selection."],
      ["recruitQuantity", "state.ui.town.recruitQuantity", "Local draft until confirmed."],
      ["destinationArmy", "state.townRecruit.destinationArmy", "Hero or garrison target slots."],
    ],
    actions: [
      ["Select dwelling", "`recruit.selectDwelling`", "local-ui", "Current screen", "`SELECT_RECRUIT_DWELLING`", "Updates selected creature, stock, and cost preview."],
      ["Change quantity", "`recruit.changeQuantity`", "local-ui", "Current screen", "`SET_RECRUIT_QUANTITY`", "Updates local quantity and total cost."],
      ["Max quantity", "`recruit.max`", "local-ui", "Current screen", "`SET_MAX_RECRUIT_QUANTITY`", "Chooses max legal quantity from stock/resources/capacity."],
      ["Recruit", "`recruit.confirm`", "command", "Current screen", "`RECRUIT_UNITS`", "Spends resources, decrements stock, updates destination army."],
      ["Cancel", "`recruit.cancel`", "navigation", "`24-town-screen`", "`CLOSE_RECRUITMENT_DIALOG`", "Discards recruitment draft."],
    ],
    html: townServiceHtml,
    diagram: {
      load: ["Town selector", "Dwelling stock", "Unit registry", "Resource selector", "Recruitment view model"],
      command: ["Quantity input", "Cost/capacity guard", "RECRUIT_UNITS", "Reducer stock/army update", "Refresh dialog"],
      animation: ["Dwelling highlight", "Counter tick", "Stack slide", "Resource flash"],
    },
  },
  "26-marketplace": {
    number: "26",
    title: "Marketplace",
    system: "town",
    archetype: "curated-town-marketplace",
    curation: "curated-pass-2",
    variant: "marketplace",
    refs: [],
    description: "Resource exchange screen with offer resource, receive resource, rate calculation, quantity slider, resource ledger, and trade confirmation.",
    visual: "A trade board with two opposing resource grids, arrowed exchange lane, rate plaque, and player resource ledger along the footer.",
    mechanics: "Trade rates derive from owned marketplaces and ruleset constants; only confirmed trades mutate player resources.",
    animation: "Selected resources brighten, the exchange arrow pulses, offered amount counts down, received amount counts up after reducer acceptance.",
    components: ["MarketplaceDialog", "OfferResourceGrid", "ReceiveResourceGrid", "ExchangeRatePlaque", "QuantitySlider", "ResultPreview", "ResourceLedger"],
    bindings: [
      ["player.resources", "state.players.active.resources", "Current resource balances."],
      ["market.rates", "state.marketplace.currentRates", "Rates derived from market count and ruleset."],
      ["selectedOffer", "state.ui.marketplace.offerResource", "Local offered resource."],
      ["selectedReceive", "state.ui.marketplace.receiveResource", "Local received resource."],
      ["tradeAmount", "state.ui.marketplace.amount", "Local amount before confirm."],
    ],
    actions: [
      ["Select offer", "`market.selectOffer`", "local-ui", "Current screen", "`SELECT_MARKET_OFFER_RESOURCE`", "Updates rate preview and valid receive targets."],
      ["Select receive", "`market.selectReceive`", "local-ui", "Current screen", "`SELECT_MARKET_RECEIVE_RESOURCE`", "Updates output preview."],
      ["Change amount", "`market.changeAmount`", "local-ui", "Current screen", "`SET_MARKET_TRADE_AMOUNT`", "Updates draft quantity and result."],
      ["Trade", "`market.trade`", "command", "Current screen", "`TRADE_RESOURCES`", "Commits resource exchange."],
      ["Close", "`market.close`", "navigation", "`24-town-screen`", "`CLOSE_MARKETPLACE`", "Returns to town."],
    ],
    html: townServiceHtml,
    diagram: {
      load: ["Player resources", "Marketplace count", "Ruleset rates", "Trade draft", "Marketplace view model"],
      command: ["Select resources", "Rate preview", "TRADE_RESOURCES", "Reducer balances", "Ledger update"],
      animation: ["Resource glow", "Arrow pulse", "Count down/up", "Ledger flash"],
    },
  },
  "27-thieves-guild": {
    number: "27",
    title: "Thieves Guild",
    system: "town",
    archetype: "curated-thieves-guild",
    curation: "curated-pass-2",
    variant: "thieves",
    refs: [],
    description: "Information ranking screen showing opponents, towns, heroes, resources, artifacts, army strength, and intelligence columns allowed by guild access.",
    visual: "A wide ranking parchment with player banners down the left and intelligence columns across the top, with covered cells for unavailable information.",
    mechanics: "Visible columns depend on thieves guild access and scenario visibility rules; the screen reads intelligence state and does not mutate gameplay.",
    animation: "Columns reveal left-to-right based on intelligence level, selected player row glows, unavailable cells stay covered.",
    components: ["ThievesGuildDialog", "PlayerBannerRows", "IntelligenceColumns", "CoveredCells", "RankSortHeader", "CloseButton"],
    bindings: [
      ["players", "state.players.all", "Player order and colors."],
      ["intelligenceLevel", "state.townServices.thievesGuildLevel", "Controls visible columns."],
      ["rankings", "state.intelligence.rankings", "Computed ranking rows."],
      ["selectedPlayer", "state.ui.thievesGuild.selectedPlayerId", "Local selected row."],
    ],
    actions: [
      ["Select player", "`thieves.selectPlayer`", "local-ui", "Current screen", "`SELECT_THIEVES_GUILD_ROW`", "Highlights row and detail footer."],
      ["Change sort", "`thieves.sort`", "local-ui", "Current screen", "`SORT_THIEVES_GUILD_COLUMN`", "Changes local sort order only."],
      ["Close", "`thieves.close`", "navigation", "`24-town-screen`", "`CLOSE_THIEVES_GUILD`", "Returns to tavern/town context."],
    ],
    html: townServiceHtml,
    diagram: {
      load: ["Player records", "Guild access", "Visibility rules", "Ranking selectors", "Thieves guild view"],
      command: ["Column/row input", "Visibility guard", "Local sort/select", "No gameplay reducer", "Refresh table"],
      animation: ["Column reveal", "Row glow", "Covered cells", "Close fade"],
    },
  },
  "28-tavern": {
    number: "28",
    title: "Tavern",
    system: "town",
    archetype: "curated-tavern",
    curation: "curated-pass-2",
    variant: "tavern",
    refs: [],
    description: "Tavern recruitment and rumor screen with two hero offer cards, hire cost, weekly hero pool, rumor text, and thieves guild entry.",
    visual: "Two large hero cards dominate the panel; a rumor parchment sits below them and the thieves guild button is framed as a separate service entry.",
    mechanics: "Hiring validates available hero pool, player gold, town/hero capacity, and weekly refresh rules before creating the hero.",
    animation: "Hero card lifts on hover, hired card slides toward roster, rumor parchment unfurls, thieves guild entry glows on focus.",
    components: ["TavernDialog", "HeroOfferCardA", "HeroOfferCardB", "RumorParchment", "HireCostPanel", "ThievesGuildButton", "CloseButton"],
    bindings: [
      ["heroPool", "state.tavern.weeklyHeroOffers", "Two current recruitable heroes."],
      ["playerGold", "state.players.active.resources.gold", "Hire cost availability."],
      ["selectedOffer", "state.ui.tavern.selectedHeroId", "Local selected hero card."],
      ["rumor", "state.tavern.currentRumorId", "Localized rumor text."],
    ],
    actions: [
      ["Select hero offer", "`tavern.selectHero`", "local-ui", "Current screen", "`SELECT_TAVERN_HERO`", "Updates selected hero details."],
      ["Hire hero", "`tavern.hireHero`", "command", "Current screen", "`HIRE_TAVERN_HERO`", "Spends gold and adds hero to town/roster."],
      ["Open thieves guild", "`tavern.thievesGuild`", "navigation", "`27-thieves-guild`", "`OPEN_THIEVES_GUILD`", "Routes to intelligence screen."],
      ["Close", "`tavern.close`", "navigation", "`24-town-screen`", "`CLOSE_TAVERN`", "Returns to town."],
    ],
    html: townServiceHtml,
    diagram: {
      load: ["Town tavern", "Hero pool", "Player gold", "Rumor localization", "Tavern view"],
      command: ["Select/hire", "Gold and slot guard", "HIRE_TAVERN_HERO", "Reducer roster update", "Refresh offers"],
      animation: ["Card lift", "Gold flash", "Roster slide", "Rumor unfurl"],
    },
  },
  "29-mage-guild": {
    number: "29",
    title: "Mage Guild",
    system: "town",
    archetype: "curated-mage-guild",
    curation: "curated-pass-2",
    variant: "mageGuild",
    refs: [],
    description: "Mage guild spell learning screen with spell shelves by level, hero wisdom/magic-school eligibility, known spell state, and learn feedback.",
    visual: "Five vertical shelves hold spell icons by level; the visiting hero context and mana/wisdom summary sit in a side plaque.",
    mechanics: "Learning validates town mage guild level, hero presence, wisdom requirements, known spell duplication, and spell registry scope.",
    animation: "Eligible spell icons glow, learned spells stamp into the hero spell list, locked shelves remain dark.",
    components: ["MageGuildDialog", "SpellLevelShelves", "SpellIconGrid", "HeroEligibilityPlaque", "KnownSpellMarkers", "LearnCloseButtons"],
    bindings: [
      ["town.mageGuildLevel", "state.towns.byId[selected].mageGuildLevel", "Available spell shelf levels."],
      ["guildSpells", "state.towns.byId[selected].mageGuildSpells", "Spell IDs offered by level."],
      ["visitingHero", "state.adventure.visitingHeroId", "Hero that can learn spells."],
      ["hero.knownSpells", "state.heroes.byId[visiting].knownSpells", "Known spell markers."],
      ["hero.wisdom", "state.heroes.byId[visiting].skills.wisdom", "Eligibility for higher spell levels."],
    ],
    actions: [
      ["Select spell", "`mageGuild.selectSpell`", "local-ui", "Current screen", "`SELECT_GUILD_SPELL`", "Updates spell detail and eligibility."],
      ["Learn spell", "`mageGuild.learnSpell`", "command", "Current screen", "`LEARN_SPELL`", "Adds spell to hero if eligible."],
      ["Close", "`mageGuild.close`", "navigation", "`24-town-screen`", "`CLOSE_MAGE_GUILD`", "Returns to town."],
    ],
    html: townServiceHtml,
    diagram: {
      load: ["Town guild level", "Guild spell records", "Hero wisdom", "Known spells", "Mage guild view"],
      command: ["Select spell", "Eligibility guard", "LEARN_SPELL", "Hero spell update", "Known marker"],
      animation: ["Shelf glow", "Spell stamp", "Locked dim", "Close book"],
    },
  },
  "30-build-tree": {
    number: "30",
    title: "Town Hall / Build Tree",
    system: "town",
    archetype: "curated-build-tree",
    curation: "curated-pass-2",
    variant: "buildTree",
    refs: [],
    description: "Town construction graph with built, available, locked, and selected building nodes, prerequisite links, resource cost, and one-build-per-day guard.",
    visual: "A branching construction diagram fills the panel: built nodes are lit, available nodes glow, locked nodes are dark, and selected building details sit to the right.",
    mechanics: "Build validates ownership, prerequisites, resources, town hall/castle rules, and daily build flag before committing construction.",
    animation: "Available node pulses, prerequisite path lights, resource cost flashes, newly built structure brightens into town panorama.",
    components: ["BuildTreeDialog", "BuildingGraph", "PrerequisiteLinks", "SelectedBuildingDetails", "CostPanel", "BuiltTodayPlaque", "BuildCloseButtons"],
    bindings: [
      ["town.buildings", "state.towns.byId[selected].buildings", "Built nodes."],
      ["availableBuildings", "state.towns.byId[selected].availableBuilds", "Available nodes from prerequisite graph."],
      ["selectedBuilding", "state.ui.buildTree.selectedBuildingId", "Local selected node."],
      ["player.resources", "state.players.active.resources", "Cost availability."],
      ["builtToday", "state.towns.byId[selected].builtToday", "Daily build guard."],
    ],
    actions: [
      ["Select building", "`buildTree.selectBuilding`", "local-ui", "Current screen", "`SELECT_BUILDING_NODE`", "Updates detail and cost panel."],
      ["Build", "`buildTree.build`", "command", "Current screen", "`BUILD_BUILDING`", "Spends resources and marks building built."],
      ["Close", "`buildTree.close`", "navigation", "`24-town-screen`", "`CLOSE_BUILD_TREE`", "Returns to town."],
    ],
    html: townServiceHtml,
    diagram: {
      load: ["Town buildings", "Prerequisite graph", "Player resources", "Built today flag", "Build tree view"],
      command: ["Select node", "Prereq/resource guard", "BUILD_BUILDING", "Reducer town update", "Town panorama refresh"],
      animation: ["Node pulse", "Prereq trace", "Resource flash", "Structure glow"],
    },
  },
  "38-combat-screen": {
    number: "38",
    title: "Combat Screen",
    system: "battle",
    archetype: "curated-combat",
    refs: [],
    description: "Tactical combat board with hex grid, stack placement, active unit, hero portraits, action bar, target highlights, damage feedback, and combat log.",
    visual: "Battlefield art covers most of the screen with translucent hexes; army stacks sit on battlefield sides, hero portraits frame the top, and a command/log bar anchors the bottom.",
    mechanics: "Initiative order, movement, melee/ranged attack, wait, defend, spell casting, morale/luck, death, surrender, retreat, and victory checks are deterministic reducer commands.",
    animation: "Active stack halo pulses, legal movement hexes glow, attack lunge/recoil and projectile arcs play after command acceptance, damage floats from reducer result.",
    components: ["CombatScreen", "Battlefield", "HexOverlay", "ArmyStacks", "ActiveStackHalo", "TargetPreview", "HeroPortraits", "ActionBar", "CombatLog"],
    bindings: [
      ["battle.phase", "state.battle.phase", "Tactics, active turn, animation lock, or result phase."],
      ["activeStack", "state.battle.activeStackId", "Current initiative actor."],
      ["legalHexes", "state.battle.legalTargets", "Reducer/combat rules output."],
      ["combatLog", "state.battle.log", "Localized event log from deterministic outcomes."],
      ["pendingAnimation", "state.ui.battle.pendingAnimation", "Presentation-only timeline from reducer result."],
    ],
    actions: [
      ["Select target hex", "`combat.selectTarget`", "local-ui", "Current screen", "`PREVIEW_COMBAT_TARGET`", "Highlights legal movement/attack/cast target."],
      ["Move stack", "`combat.moveStack`", "command", "Current screen", "`MOVE_COMBAT_STACK`", "Updates stack hex and initiative state."],
      ["Attack", "`combat.attack`", "command", "Current screen or battle results", "`RESOLVE_COMBAT_ATTACK`", "Applies deterministic damage, retaliation, morale/luck, death."],
      ["Cast spell", "`combat.castSpell`", "navigation", "`44-combat-spell-targeting`", "`OPEN_COMBAT_SPELL_TARGETING`", "Creates combat spell targeting draft."],
      ["Wait", "`combat.wait`", "command", "Current screen", "`WAIT_COMBAT_STACK`", "Moves active stack later in initiative order."],
      ["Defend", "`combat.defend`", "command", "Current screen", "`DEFEND_COMBAT_STACK`", "Applies defend state and advances initiative."],
    ],
    html: combatHtml,
    diagram: {
      load: ["Battle seed/state", "Ruleset formulas", "Stack registry", "Terrain assets", "Combat view model"],
      command: ["Target input", "Legality guard", "Combat command", "Reducer result", "Animation event"],
      animation: ["Active halo", "Move path", "Attack/projectile", "Damage float"],
    },
  },
  "39-battle-results": {
    number: "39",
    title: "Battle Results",
    system: "battle",
    archetype: "curated-battle-results",
    curation: "curated-pass-2",
    variant: "battleResults",
    refs: [],
    description: "Post-combat result panel with victory/defeat banner, experience gain, casualties, spoils, captured artifacts, and continue routing.",
    visual: "A centered results parchment sits over a dim battlefield with two casualty columns, experience ribbon, spoils row, and a large continue check button.",
    mechanics: "Applies battle outcome exactly once: surviving stacks, hero experience, artifacts, spoils, retreat/surrender state, and victory-condition triggers.",
    animation: "Outcome banner drops in, experience bar fills, spoils appear in sequence, continue button glows after all results are acknowledged.",
    components: ["BattleResultsDialog", "OutcomeBanner", "ExperienceBar", "AttackerCasualties", "DefenderCasualties", "SpoilsRow", "ContinueButton"],
    bindings: [
      ["battle.outcome", "state.battle.result.outcome", "Win/loss/retreat/surrender outcome."],
      ["experience", "state.battle.result.experienceGained", "Hero XP reward."],
      ["casualties", "state.battle.result.casualties", "Lost stacks by side."],
      ["spoils", "state.battle.result.spoils", "Resources/artifacts gained."],
      ["nextRoute", "state.battle.result.returnRoute", "Adventure, town, defeat, or campaign route."],
    ],
    actions: [
      ["Acknowledge result", "`battleResults.continue`", "command", "`07-adventure-map` or `42-victory-defeat-cinematic`", "`ACKNOWLEDGE_BATTLE_RESULT`", "Finalizes result routing and clears battle phase."],
      ["Inspect casualties", "`battleResults.inspectCasualties`", "local-ui", "Current screen", "`SELECT_BATTLE_RESULT_ROW`", "Highlights casualty detail only."],
      ["Inspect spoils", "`battleResults.inspectSpoils`", "local-ui", "Current screen", "`SELECT_BATTLE_SPOILS_ITEM`", "Shows artifact/resource tooltip."],
    ],
    html: battleModalHtml,
    diagram: {
      load: ["Resolved battle result", "Hero XP rules", "Spoils records", "Return route", "Battle results view"],
      command: ["Continue", "One-shot result guard", "ACKNOWLEDGE_BATTLE_RESULT", "Reducer route update", "Adventure/cinematic"],
      animation: ["Banner drop", "XP fill", "Spoils reveal", "Continue glow"],
    },
  },
  "40-pre-battle-dialog": {
    number: "40",
    title: "Pre-Battle Dialog",
    system: "battle",
    archetype: "curated-pre-battle",
    curation: "curated-pass-2",
    variant: "preBattle",
    refs: [],
    description: "Encounter confirmation dialog comparing attacker and defender heroes/armies, terrain context, tactics availability, and fight/retreat/auto-resolve choices.",
    visual: "Two opposing hero/army panels face each other over a battlefield preview, with terrain/siege information between them and action buttons along the bottom.",
    mechanics: "Initializes tactical combat only after guard checks for encounter legality, army state, terrain, siege context, and optional tactics phase.",
    animation: "Army strength bars fill, crossed-swords emblem pulses, fight route fades into battlefield, retreat disabled state shakes when illegal.",
    components: ["PreBattleDialog", "AttackerPanel", "DefenderPanel", "TerrainPreview", "ArmyComparison", "TacticsIndicator", "FightRetreatButtons"],
    bindings: [
      ["attacker", "state.pendingBattle.attacker", "Attacking hero/army."],
      ["defender", "state.pendingBattle.defender", "Defending hero/army or neutral stack."],
      ["terrain", "state.pendingBattle.terrainId", "Battlefield terrain context."],
      ["tacticsAvailable", "state.pendingBattle.tacticsAvailable", "Whether tactics phase can start."],
      ["retreatAllowed", "state.pendingBattle.retreatAllowed", "Retreat button guard."],
    ],
    actions: [
      ["Fight", "`preBattle.fight`", "command", "`38-combat-screen` or `45-tactics-phase`", "`START_TACTICAL_BATTLE`", "Creates deterministic battle state."],
      ["Auto resolve", "`preBattle.autoResolve`", "command", "`39-battle-results`", "`AUTO_RESOLVE_BATTLE`", "Runs deterministic auto-resolve."],
      ["Retreat", "`preBattle.retreat`", "command", "`07-adventure-map`", "`RETREAT_BEFORE_BATTLE`", "Cancels encounter if legal."],
      ["Inspect army", "`preBattle.inspectArmy`", "local-ui", "Current screen", "`SELECT_PRE_BATTLE_STACK`", "Shows stack detail tooltip."],
    ],
    html: battleModalHtml,
    diagram: {
      load: ["Pending encounter", "Terrain resolver", "Army comparison", "Tactics guard", "Pre-battle view"],
      command: ["Fight/auto/retreat", "Encounter guard", "Battle init command", "Reducer phase update", "Combat/results route"],
      animation: ["Strength fill", "Swords pulse", "Route fade", "Disabled shake"],
    },
  },
  "41-surrender-cost-dialog": {
    number: "41",
    title: "Surrender Cost Dialog",
    system: "battle",
    archetype: "curated-surrender",
    curation: "curated-pass-2",
    variant: "surrender",
    refs: [],
    description: "Combat surrender confirmation with ransom cost, available gold, surviving army value, hero survival outcome, and accept/decline controls.",
    visual: "A compact parchment modal overlays the active battlefield, with a large gold cost plaque, survivor summary, and accept/decline buttons.",
    mechanics: "Surrender cost derives from surviving army value and ruleset; accepting spends gold and resolves battle with hero survival route.",
    animation: "Gold cost plaque pulses, accept button glows only when affordable, accepted modal folds into battle result routing.",
    components: ["SurrenderCostDialog", "GoldCostPlaque", "SurvivorSummary", "AvailableGold", "OutcomeText", "AcceptDeclineButtons"],
    bindings: [
      ["survivingArmyValue", "state.battle.surrender.armyValue", "Cost basis."],
      ["surrenderCost", "state.battle.surrender.cost", "Computed ransom."],
      ["availableGold", "state.players.active.resources.gold", "Affordability guard."],
      ["heroOutcome", "state.battle.surrender.heroOutcome", "Hero survival and return route."],
    ],
    actions: [
      ["Accept surrender", "`surrender.accept`", "command", "`39-battle-results`", "`ACCEPT_BATTLE_SURRENDER`", "Spends gold and resolves battle as surrender."],
      ["Decline", "`surrender.decline`", "navigation", "`38-combat-screen`", "`CLOSE_SURRENDER_DIALOG`", "Returns to active battle."],
    ],
    html: battleModalHtml,
    diagram: {
      load: ["Active battle", "Surviving army value", "Ruleset cost", "Player gold", "Surrender view"],
      command: ["Accept/decline", "Affordability guard", "ACCEPT_BATTLE_SURRENDER", "Reducer result", "Battle results"],
      animation: ["Cost pulse", "Affordability glow", "Modal fold", "Result fade"],
    },
  },
  "42-victory-defeat-cinematic": {
    number: "42",
    title: "Victory / Defeat Cinematic",
    system: "battle",
    archetype: "curated-outcome-cinematic",
    curation: "curated-pass-2",
    variant: "outcomeCinematic",
    refs: [],
    description: "Letterboxed campaign/scenario outcome screen with victory or defeat art, score summary, narration text, skip/continue controls, and next-route decision.",
    visual: "A wide illustrated panel is framed by black letterbox bars; narration parchment and score medallions sit below the art.",
    mechanics: "Displays already-finalized outcome state and routes to high scores, campaign next mission, main menu, or replay without changing battle results.",
    animation: "Outcome art slowly pans, narration types in, score medallions appear one by one, continue cross-fades to destination.",
    components: ["OutcomeCinematic", "LetterboxArt", "NarrationPanel", "ScoreMedallions", "CampaignCarryoverSummary", "ContinueSkipButtons"],
    bindings: [
      ["outcome", "state.scenario.outcome", "Victory/defeat/campaign outcome."],
      ["score", "state.scenario.finalScore", "Score breakdown."],
      ["carryover", "state.campaign.carryoverDraft", "Campaign hero/artifact carryover summary."],
      ["nextRoute", "state.scenario.outcomeRoute", "High scores, next mission, or main menu."],
    ],
    actions: [
      ["Continue", "`outcome.continue`", "navigation", "`57-high-scores` or `01-main-menu`", "`CONTINUE_FROM_OUTCOME`", "Routes according to finalized outcome."],
      ["Skip narration", "`outcome.skip`", "local-ui", "Current screen", "`SKIP_OUTCOME_NARRATION`", "Completes text and pan animation."],
      ["Replay battle", "`outcome.replay`", "navigation", "`38-combat-screen`", "`REQUEST_BATTLE_REPLAY_VIEW`", "Opens replay presentation when available."],
    ],
    html: battleModalHtml,
    diagram: {
      load: ["Scenario outcome", "Score breakdown", "Carryover draft", "Presentation assets", "Outcome cinematic"],
      command: ["Continue/skip", "Outcome route guard", "Route event", "Presentation transition", "Destination"],
      animation: ["Art pan", "Text type", "Medallion reveal", "Cross-fade"],
    },
  },
  "43-siege-combat": {
    number: "43",
    title: "Siege Combat Variant",
    system: "battle",
    archetype: "curated-siege-combat",
    curation: "curated-pass-2",
    variant: "siege",
    refs: [],
    description: "Siege battlefield variant with walls, gate, towers, moat, catapult target preview, breaching state, and defender/attacker stack placement.",
    visual: "The battlefield is split by a large castle wall: defender stacks occupy battlements/right side, attackers approach from the left, and wall/gate targets are highlighted.",
    mechanics: "Extends combat with wall segments, gate blocking, tower shots, moat penalties, catapult targeting, and breach state in deterministic battle commands.",
    animation: "Catapult arcs toward selected wall, impact dust plays after reducer result, breached wall segment darkens, tower shot flashes from battlement.",
    components: ["SiegeCombatScreen", "Battlefield", "CastleWalls", "GateAndMoat", "TowerNodes", "CatapultTargetPreview", "ArmyStacks", "ActionBar"],
    bindings: [
      ["wallState", "state.battle.siege.wallSegments", "HP/breach state by segment."],
      ["gateState", "state.battle.siege.gate", "Gate open/broken/blocked state."],
      ["towerState", "state.battle.siege.towers", "Tower ammo and targeting."],
      ["catapultTarget", "state.ui.battle.catapultTarget", "Local selected siege target."],
      ["activeStack", "state.battle.activeStackId", "Current combat actor."],
    ],
    actions: [
      ["Select wall target", "`siege.selectWall`", "local-ui", "Current screen", "`SELECT_CATAPULT_TARGET`", "Highlights wall/gate target."],
      ["Fire catapult", "`siege.fireCatapult`", "command", "Current screen", "`FIRE_CATAPULT`", "Applies deterministic wall damage."],
      ["Move stack", "`siege.moveStack`", "command", "Current screen", "`MOVE_COMBAT_STACK`", "Handles moat/gate passability."],
      ["Attack", "`siege.attack`", "command", "Current screen or battle results", "`RESOLVE_COMBAT_ATTACK`", "Resolves stack attack with siege modifiers."],
    ],
    html: battleVariantHtml,
    diagram: {
      load: ["Battle state", "Siege structures", "Wall HP", "Terrain/moat", "Siege view"],
      command: ["Wall/hex target", "Siege guard", "FIRE_CATAPULT or attack", "Reducer siege result", "Impact animation"],
      animation: ["Target glow", "Catapult arc", "Impact dust", "Wall crumble"],
    },
  },
  "44-combat-spell-targeting": {
    number: "44",
    title: "Combat Spell Targeting",
    system: "battle",
    archetype: "curated-combat-spell-targeting",
    curation: "curated-pass-2",
    variant: "combatSpellTargeting",
    refs: [],
    description: "Combat spell targeting overlay with selected spell, mana cost, area-of-effect shape, legal hexes, immune targets, and cancel/confirm controls.",
    visual: "The active battlefield is darkened under luminous target hexes; a spell card at the top shows spell school, mana, mastery, and valid target instructions.",
    mechanics: "Validates combat spell scope, hero turn, mana, mastery, target shape, immunity, and friendly/enemy restrictions before casting.",
    animation: "Valid hexes pulse, selected area locks, spell glyph flares, rejected immune targets flash red with status text.",
    components: ["CombatSpellTargeting", "BattlefieldDimmer", "SpellCard", "AreaOverlay", "ImmuneMarkers", "ManaCost", "ConfirmCancelButtons"],
    bindings: [
      ["selectedSpell", "state.ui.battle.selectedSpellId", "Spell chosen from spellbook."],
      ["casterHero", "state.battle.activeHeroId", "Hero casting context."],
      ["mana", "state.heroes.byId[caster].mana", "Mana affordability."],
      ["legalTargets", "state.battle.spellTargeting.legalTargets", "Rules output for spell target shape."],
      ["immuneTargets", "state.battle.spellTargeting.immuneTargets", "Stacks that reject this spell."],
    ],
    actions: [
      ["Hover target", "`combatSpell.hoverTarget`", "local-ui", "Current screen", "`PREVIEW_COMBAT_SPELL_TARGET`", "Updates target area preview."],
      ["Cast", "`combatSpell.cast`", "command", "`38-combat-screen`", "`CAST_COMBAT_SPELL`", "Spends mana and applies spell effects."],
      ["Cancel", "`combatSpell.cancel`", "navigation", "`38-combat-screen`", "`CANCEL_COMBAT_SPELL_TARGETING`", "Returns to combat without casting."],
    ],
    html: battleVariantHtml,
    diagram: {
      load: ["Selected spell", "Caster hero", "Mana selector", "Targeting rules", "Target overlay"],
      command: ["Hover/click hex", "Spell target guard", "CAST_COMBAT_SPELL", "Reducer spell effects", "Combat view"],
      animation: ["Hex pulse", "Area lock", "Glyph flare", "Error flash"],
    },
  },
  "45-tactics-phase": {
    number: "45",
    title: "Combat Tactics Phase",
    system: "battle",
    archetype: "curated-tactics-phase",
    curation: "curated-pass-2",
    variant: "tactics",
    refs: [],
    description: "Pre-combat tactics deployment phase with legal placement zones, draggable friendly stacks, locked enemy side, remaining placement moves, and start battle action.",
    visual: "The battlefield appears before initiative starts with shaded deployment columns, movable friendly stack markers, locked enemy stacks, and a tactics command strip.",
    mechanics: "Allows stack repositioning only within legal tactics rows/columns before initiative begins; starting battle freezes deployment and enters combat phase.",
    animation: "Legal deployment cells glow, stack drag ghost snaps to allowed hex, illegal placement flashes red, start battle wipes away zone overlays.",
    components: ["TacticsPhaseScreen", "DeploymentZone", "FriendlyStacks", "EnemyPreview", "MoveBudgetPlaque", "StartBattleButton", "IllegalPlacementFeedback"],
    bindings: [
      ["tacticsAvailable", "state.battle.tactics.enabled", "Whether phase is active."],
      ["deploymentZone", "state.battle.tactics.legalHexes", "Allowed placement hexes."],
      ["friendlyStacks", "state.battle.armies.attacker.stacks", "Movable stack positions."],
      ["enemyPreview", "state.battle.armies.defender.stacks", "Locked enemy placement."],
      ["remainingMoves", "state.battle.tactics.remainingMoves", "Tactics move budget."],
    ],
    actions: [
      ["Drag stack", "`tactics.dragStack`", "local-ui", "Current screen", "`PREVIEW_TACTICS_MOVE`", "Shows legal/illegal drop target."],
      ["Place stack", "`tactics.placeStack`", "command", "Current screen", "`PLACE_TACTICS_STACK`", "Moves stack within legal deployment zone."],
      ["Start battle", "`tactics.startBattle`", "command", "`38-combat-screen`", "`START_BATTLE_AFTER_TACTICS`", "Freezes deployment and begins initiative."],
      ["Reset placement", "`tactics.reset`", "command", "Current screen", "`RESET_TACTICS_PLACEMENT`", "Restores original placement."],
    ],
    html: battleVariantHtml,
    diagram: {
      load: ["Pending battle", "Tactics skill", "Legal zones", "Army stacks", "Tactics view"],
      command: ["Drag/drop", "Zone guard", "PLACE_TACTICS_STACK", "Reducer placement", "Start combat"],
      animation: ["Zone glow", "Drag ghost", "Illegal flash", "Overlay wipe"],
    },
  },
  "46-hero-screen": {
    number: "46",
    title: "Hero Screen",
    system: "hero",
    archetype: "curated-hero",
    refs: [],
    description: "Hero management sheet with portrait, primary stats, specialty, experience, secondary skills, equipment paper doll, backpack, army, minimap/sidebar context, and dismiss/quest/spell routes.",
    visual: "A large parchment/stone hero sheet overlays the adventure sidebar style: stats and skills on the left, paper doll and artifacts in the center, army row along the bottom, map/sidebar context on the right.",
    mechanics: "Artifact equip/unequip, backpack drag/drop, army stack movement, hero dismissal guard, quest log, spellbook access, and right-click detail consume hero selectors and validated commands.",
    animation: "Artifact drag ghosts follow cursor, legal equipment slots glow, accepted artifacts snap into place, skill and stat tooltips fade in.",
    components: ["HeroScreen", "HeroPortrait", "PrimaryStats", "SpecialtyPanel", "SecondarySkills", "PaperDoll", "ArtifactSlots", "Backpack", "HeroArmyRow", "SidebarContext"],
    bindings: [
      ["hero.id", "state.heroes.selectedHeroId", "Current hero context."],
      ["hero.primaryStats", "state.heroes.byId[selected].stats", "Attack, defense, power, knowledge."],
      ["hero.skills", "state.heroes.byId[selected].secondarySkills", "Skill grid and tooltips."],
      ["hero.equipment", "state.heroes.byId[selected].equipment", "Paper doll slots."],
      ["hero.backpack", "state.heroes.byId[selected].backpack", "Backpack inventory."],
      ["hero.army", "state.heroes.byId[selected].army", "Army row and stack operations."],
    ],
    actions: [
      ["Equip artifact", "`hero.equipArtifact`", "command", "Current screen", "`EQUIP_HERO_ARTIFACT`", "Moves artifact from backpack to legal slot."],
      ["Unequip artifact", "`hero.unequipArtifact`", "command", "Current screen", "`UNEQUIP_HERO_ARTIFACT`", "Moves equipment to backpack if capacity allows."],
      ["Open spell book", "`hero.openSpellBook`", "navigation", "`47-spell-book`", "`OPEN_HERO_SPELLBOOK`", "Routes with selected hero and spell context."],
      ["Open quest log", "`hero.questLog`", "navigation", "`11-quest-log`", "`OPEN_QUEST_LOG`", "Routes to active quest list."],
      ["Split stack", "`hero.splitStack`", "navigation", "`51-split-stack-dialog`", "`OPEN_SPLIT_STACK_DIALOG`", "Creates stack split draft."],
      ["Dismiss hero", "`hero.dismiss`", "navigation", "`60-confirmation-dialog`", "`REQUEST_DISMISS_HERO`", "Requires explicit confirmation."],
    ],
    html: heroHtml,
    diagram: {
      load: ["Hero selector", "Artifact registry", "Skill registry", "Army state", "Hero view model"],
      command: ["Drag/click", "Slot legality guard", "Hero command", "Reducer", "Snap/refresh"],
      animation: ["Drag ghost", "Slot glow", "Snap equip", "Tooltip fade"],
    },
  },
  "47-spell-book": {
    number: "47",
    title: "Spell Book",
    system: "hero",
    archetype: "curated-spellbook",
    refs: [],
    description: "Open spellbook view with school tabs, two-page spell grid, known/disabled spell states, mastery-derived details, mana cost, and cast/close controls.",
    visual: "Open parchment book centered on a darkened backdrop, with side tabs for spell schools, left/right pages, icon slots, selected spell details, and brass cast/close buttons.",
    mechanics: "Known spell list, school filters, wisdom/mastery gating, adventure/combat scope, mana cost, and target mode determine whether Cast routes to targeting or remains disabled.",
    animation: "Book opens with page lift, school tabs flip pages, selected spell glows, disabled spell icons desaturate, Cast transitions into targeting overlay.",
    components: ["SpellBookScreen", "BookBackdrop", "SchoolTabs", "LeftPageSpellGrid", "RightPageSpellGrid", "SelectedSpellDetails", "ManaFooter", "CastCloseButtons"],
    bindings: [
      ["hero.spells", "state.heroes.byId[selected].knownSpells", "Known spell IDs."],
      ["spellbook.school", "state.ui.spellbook.selectedSchool", "Local school filter."],
      ["selectedSpell", "state.ui.spellbook.selectedSpellId", "Local selected spell."],
      ["mana", "state.heroes.byId[selected].mana", "Current and max spell points."],
      ["castContext", "state.ui.spellbook.castContext", "Adventure or combat scope controls enabled spells."],
    ],
    actions: [
      ["Select school", "`spellbook.selectSchool`", "local-ui", "Current screen", "`SELECT_SPELL_SCHOOL_TAB`", "Changes local filter/page."],
      ["Turn page", "`spellbook.turnPage`", "local-ui", "Current screen", "`TURN_SPELLBOOK_PAGE`", "Changes local page index."],
      ["Select spell", "`spellbook.selectSpell`", "local-ui", "Current screen", "`SELECT_SPELL`", "Updates selected spell detail and cast enabled state."],
      ["Cast spell", "`spellbook.cast`", "navigation", "`17-adventure-spell-targeting` or `44-combat-spell-targeting`", "`BEGIN_SPELL_TARGETING`", "Creates targeting draft if mana and context are valid."],
      ["Close", "`spellbook.close`", "navigation", "`46-hero-screen` or previous screen", "`CLOSE_SPELLBOOK`", "Returns to owning screen."],
    ],
    html: spellBookHtml,
    diagram: {
      load: ["Hero spells", "Spell registry", "Mastery rules", "Mana selector", "Spellbook view model"],
      command: ["School/page/spell input", "Cast guard", "Targeting route", "Spell command", "Reducer result"],
      animation: ["Book open", "Page flip", "Spell glow", "Targeting fade"],
    },
  },
};

const adventurePass3 = {
  "08-kingdom-overview": {
    number: "08",
    title: "Kingdom Overview",
    system: "adventure",
    archetype: "curated-adventure-ledger",
    curation: "curated-pass-3",
    variant: "kingdomOverview",
    refs: [],
    description: "Adventure-layer kingdom ledger showing owned towns, heroes, daily income, movement status, and strategic warnings without changing gameplay state.",
    visual: "A parchment ledger overlays the dimmed adventure map: town rows on the left, hero rows on the right, resource income strip at the bottom, and small brass row selectors.",
    mechanics: "Summarizes owned towns, heroes, income, garrison pressure, and movement readiness. Selecting a row focuses a town or hero; no gameplay command is committed until a route opens another screen.",
    animation: "Ledger slides up over the map, selected rows receive a brass outline, resource deltas count upward after day/week changes, and close fades back to map focus.",
    components: ["KingdomOverview", "TownLedger", "HeroLedger", "DailyIncomeStrip", "StrategicWarnings", "CloseButton"],
    bindings: [
      ["townRows", "state.players.active.townIds", "Owned towns with build, income, and garrison summary."],
      ["heroRows", "state.players.active.heroIds", "Owned heroes with movement, mana, army strength, and location."],
      ["incomeTotals", "selectors.economy.dailyIncomeByResource", "Daily income preview from town and mine ownership."],
      ["selectedRow", "state.ui.kingdomOverview.selectedRowId", "Local focus row for keyboard and pointer navigation."],
      ["warnings", "selectors.adventure.kingdomWarnings", "Threats, idle heroes, empty towns, and blocked build state."],
    ],
    actions: [
      ["Click town row", "`kingdom.selectTown`", "navigation", "`24-town-screen`", "`OPEN_TOWN_SCREEN`", "Sets selected town context; no economy mutation."],
      ["Click hero row", "`kingdom.selectHero`", "navigation", "`46-hero-screen`", "`OPEN_HERO_SCREEN`", "Sets selected hero context and preserves adventure camera."],
      ["Focus on map", "`kingdom.focusMap`", "navigation", "`07-adventure-map`", "`FOCUS_ADVENTURE_ENTITY`", "Centers camera on the selected town or hero."],
      ["Close", "`kingdom.close`", "navigation", "`07-adventure-map`", "`CLOSE_KINGDOM_OVERVIEW`", "Returns to previous adventure selection."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Player selector", "Town IDs", "Hero IDs", "Income selectors", "Kingdom ledger model"],
      command: ["Row input", "Ownership guard", "Focus context", "Route request", "Town/hero/map screen"],
      animation: ["Ledger slide", "Row outline", "Income tick", "Map fade"],
    },
  },
  "09-map-object-dialog": {
    number: "09",
    title: "Map Object Dialog",
    system: "adventure",
    archetype: "curated-map-object-dialog",
    curation: "curated-pass-3",
    variant: "mapObjectDialog",
    refs: [],
    description: "Generic adventure object visit dialog for shrines, events, guarded rewards, signs, one-shot pickups, and choice prompts.",
    visual: "The map remains visible behind a centered carved dialog with object portrait, message parchment, reward/cost preview, and OK/Cancel buttons.",
    mechanics: "Visit resolution reads the object record, visit state, guard requirement, reward table, and hero eligibility before dispatching a deterministic object interaction command.",
    animation: "Dialog pops from the object position, portrait glows, reward icons sparkle on accepted visits, and rejected visits shake the message parchment.",
    components: ["MapObjectDialog", "ObjectPortrait", "ObjectMessage", "RequirementPanel", "RewardPreview", "DialogButtons"],
    bindings: [
      ["objectId", "state.ui.adventure.pendingObjectVisit.objectId", "Map object selected by movement or click."],
      ["heroId", "state.adventure.selectedHeroId", "Visiting hero context."],
      ["visitRecord", "state.mapObjects.byId[objectId]", "Object type, visited flags, rewards, requirements, and scripts."],
      ["rewardPreview", "selectors.mapObjects.previewVisitReward", "Visible deterministic reward/cost preview."],
      ["guardResult", "selectors.mapObjects.visitGuard", "Eligibility, disabled reason, and command availability."],
    ],
    actions: [
      ["Accept", "`mapObject.accept`", "command", "`07-adventure-map`", "`VISIT_MAP_OBJECT`", "Applies reward, visit flag, teleport, quest, or event result."],
      ["Decline", "`mapObject.decline`", "navigation", "`07-adventure-map`", "`CANCEL_MAP_OBJECT_VISIT`", "Closes without mutating gameplay."],
      ["Right-click portrait", "`mapObject.details`", "navigation", "`18-map-object-tooltip`", "`OPEN_OBJECT_TOOLTIP`", "Shows public object details."],
      ["Open quest source", "`mapObject.quest`", "navigation", "`11-quest-log`", "`OPEN_RELATED_QUEST`", "Focuses related quest entry when the object is a quest source."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Hero movement result", "Object record", "Visit flags", "Reward preview", "Object dialog"],
      command: ["Accept click", "Visit guard", "Object command", "Reducer result", "Map refresh"],
      animation: ["Object pop", "Portrait glow", "Reward sparkle", "Map return"],
    },
  },
  "10-puzzle-map": {
    number: "10",
    title: "Puzzle Map",
    system: "adventure",
    archetype: "curated-puzzle-map",
    curation: "curated-pass-3",
    variant: "puzzleMap",
    refs: [],
    description: "Obelisk puzzle map view revealing grail-location fragments according to visited obelisks.",
    visual: "A large torn parchment map fills the center with square fragment tiles, hidden soot masks, revealed terrain hints, and an obelisk progress plaque.",
    mechanics: "Revealed tiles are derived from visited obelisk count and scenario grail metadata. Clicking a revealed tile only changes local focus unless a map jump is explicitly requested.",
    animation: "New fragments peel open with parchment curl, hidden fragments shimmer subtly, and focused clue tiles pulse with a gold border.",
    components: ["PuzzleMapScreen", "FragmentGrid", "ObeliskProgress", "GrailHintPanel", "MapJumpButton", "CloseButton"],
    bindings: [
      ["obeliskProgress", "state.players.active.obelisksVisited", "Visited count and total obelisks."],
      ["fragmentGrid", "selectors.grail.revealedPuzzleFragments", "Visible fragment mask from deterministic scenario data."],
      ["selectedFragment", "state.ui.puzzleMap.selectedFragment", "Local selected clue tile."],
      ["grailRegionHint", "selectors.grail.visibleRegionHint", "Text/region hint allowed by current reveal progress."],
      ["mapJumpTarget", "selectors.grail.selectedFragmentMapFocus", "Optional camera focus for revealed clue."],
    ],
    actions: [
      ["Select fragment", "`puzzle.selectFragment`", "local-ui", "Current screen", "`SELECT_PUZZLE_FRAGMENT`", "Updates local clue focus."],
      ["Jump to map", "`puzzle.jumpToMap`", "navigation", "`07-adventure-map`", "`FOCUS_GRAIL_HINT_REGION`", "Centers adventure camera on the revealed region only."],
      ["Close", "`puzzle.close`", "navigation", "`07-adventure-map`", "`CLOSE_PUZZLE_MAP`", "Returns to previous adventure context."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Scenario grail data", "Visited obelisks", "Reveal mask", "Fragment sprites", "Puzzle map"],
      command: ["Fragment input", "Reveal guard", "Local focus", "Optional map focus", "Adventure return"],
      animation: ["Parchment open", "Tile peel", "Clue pulse", "Close fold"],
    },
  },
  "11-quest-log": {
    number: "11",
    title: "Quest Log",
    system: "adventure",
    archetype: "curated-quest-log",
    curation: "curated-pass-3",
    variant: "questLog",
    refs: [],
    description: "Adventure quest ledger listing active, completed, failed, and repeatable map-object quests with requirements, deadlines, and rewards.",
    visual: "Tabbed parchment book over the map with active quest list on the left, selected quest details on the right, reward slots, and source/focus controls.",
    mechanics: "Quest state is read from scenario quest records and hero/player progress. The log can focus a source object or reveal completion requirements; it does not grant rewards.",
    animation: "Quest tabs flip pages, newly updated quests stamp a seal, selected objectives underline, and source focus closes through a map fade.",
    components: ["QuestLog", "QuestTabs", "QuestList", "QuestDetails", "RequirementChecklist", "RewardSlots", "SourceFocusButton"],
    bindings: [
      ["questFilter", "state.ui.questLog.filter", "Local tab: active, completed, failed, or all."],
      ["questRows", "selectors.quests.visibleQuestRows", "Quest rows visible to the active player."],
      ["selectedQuest", "state.ui.questLog.selectedQuestId", "Local selected quest."],
      ["requirements", "selectors.quests.selectedQuestRequirements", "Artifacts, creatures, resources, hero level, or deadline."],
      ["rewardPreview", "selectors.quests.selectedQuestRewards", "Visible reward slots from quest registry."],
    ],
    actions: [
      ["Select quest", "`questLog.selectQuest`", "local-ui", "Current screen", "`SELECT_QUEST_LOG_ENTRY`", "Updates selected details only."],
      ["Change tab", "`questLog.changeTab`", "local-ui", "Current screen", "`SET_QUEST_LOG_FILTER`", "Filters rows without mutating quests."],
      ["Show source", "`questLog.showSource`", "navigation", "`07-adventure-map`", "`FOCUS_QUEST_SOURCE`", "Centers camera on a known quest source object."],
      ["Close", "`questLog.close`", "navigation", "`07-adventure-map` or previous screen", "`CLOSE_QUEST_LOG`", "Returns to caller."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Quest registry", "Player progress", "Hero inventory", "Visible quest rows", "Quest log"],
      command: ["Tab/row input", "Visibility guard", "Local selection", "Optional source focus", "Caller return"],
      animation: ["Book open", "Tab flip", "Seal stamp", "Map fade"],
    },
  },
  "12-creature-bank-loot": {
    number: "12",
    title: "Creature Bank Loot",
    system: "adventure",
    archetype: "curated-bank-loot",
    curation: "curated-pass-3",
    variant: "creatureBankLoot",
    refs: [],
    description: "Post-combat creature bank reward dialog showing cleared bank state, losses, reward bundles, and collection result.",
    visual: "A dark treasure vault panel overlays the map with defeated guards at left, reward chests and artifacts center, and surviving hero army summary at right.",
    mechanics: "Rewards are granted only after the linked combat reducer returns victory. Collection marks the bank visited, applies reward records, and returns to adventure.",
    animation: "Chest lids open, coins sparkle, artifact slot glows, reward numbers float upward, and the bank object dims on return to map.",
    components: ["CreatureBankLootDialog", "DefeatedGuardPanel", "RewardBundleGrid", "CasualtySummary", "CollectButton"],
    bindings: [
      ["bankId", "state.ui.adventure.pendingBankReward.bankId", "Cleared bank object."],
      ["combatResult", "state.combat.lastResult", "Victory result and casualties from battle reducer."],
      ["rewardBundle", "selectors.creatureBanks.rewardBundle", "Gold, resources, artifacts, and creatures to collect."],
      ["visitedFlag", "state.mapObjects.byId[bankId].visitedBy", "Determines if reward was already claimed."],
      ["heroArmy", "state.heroes.byId[selected].army", "Post-combat army summary."],
    ],
    actions: [
      ["Collect", "`bankLoot.collect`", "command", "`07-adventure-map`", "`COLLECT_CREATURE_BANK_REWARD`", "Applies rewards and visited flag once."],
      ["Inspect reward", "`bankLoot.inspectReward`", "navigation", "`50-creature-info` or `18-map-object-tooltip`", "`OPEN_REWARD_DETAILS`", "Shows creature/artifact/resource detail."],
      ["Close after collected", "`bankLoot.close`", "navigation", "`07-adventure-map`", "`CLOSE_BANK_REWARD`", "Returns after reward state is resolved."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Combat victory", "Bank object", "Reward table", "Casualty result", "Loot dialog"],
      command: ["Collect click", "Unclaimed guard", "Reward command", "Reducer applies bundle", "Dim bank on map"],
      animation: ["Vault open", "Coin sparkle", "Artifact glow", "Object dim"],
    },
  },
  "13-hill-fort": {
    number: "13",
    title: "Hill Fort",
    system: "adventure",
    archetype: "curated-hill-fort",
    curation: "curated-pass-3",
    variant: "hillFort",
    refs: [],
    description: "Hill Fort upgrade service where eligible hero stacks can be upgraded for calculated resource costs.",
    visual: "Stone fort service window with current army slots on the left, upgrade arrows in the center, upgraded creature targets and cost ledger on the right.",
    mechanics: "Each stack upgrade checks creature upgrade path, town/faction rules, hero ownership, resource cost, and destination army capacity before dispatching upgrade commands.",
    animation: "Eligible stack slots glow, selected stack marches across an arrow, upgraded portrait flashes, and resource cost ticks down after the command resolves.",
    components: ["HillFortDialog", "CurrentArmySlots", "UpgradePathList", "CostLedger", "UpgradeButtons", "CloseButton"],
    bindings: [
      ["heroArmy", "state.heroes.byId[selected].army", "Hero stacks available for upgrade."],
      ["upgradeTargets", "selectors.creatures.availableHillFortUpgrades", "Upgrade path and target creature records."],
      ["selectedStack", "state.ui.hillFort.selectedStackIndex", "Local selected army slot."],
      ["costPreview", "selectors.economy.upgradeCostPreview", "Gold/resource cost for selected quantity."],
      ["resources", "state.players.active.resources", "Available resources for command guard."],
    ],
    actions: [
      ["Select stack", "`hillFort.selectStack`", "local-ui", "Current screen", "`SELECT_HILL_FORT_STACK`", "Updates selected upgrade preview."],
      ["Upgrade selected", "`hillFort.upgradeSelected`", "command", "Current screen", "`UPGRADE_ARMY_STACK`", "Spends resources and replaces stack creature ID/count."],
      ["Upgrade all", "`hillFort.upgradeAll`", "command", "Current screen", "`UPGRADE_ALL_ELIGIBLE_STACKS`", "Applies all legal upgrades in deterministic order."],
      ["Close", "`hillFort.close`", "navigation", "`07-adventure-map`", "`CLOSE_HILL_FORT`", "Returns to visited fort tile."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Hero army", "Creature upgrade registry", "Resources", "Cost selector", "Hill Fort view"],
      command: ["Stack selection", "Upgrade guard", "Upgrade command", "Reducer updates army", "Cost feedback"],
      animation: ["Slot glow", "Arrow march", "Portrait flash", "Gold tick"],
    },
  },
  "14-war-machine-factory": {
    number: "14",
    title: "War Machine Factory",
    system: "adventure",
    archetype: "curated-war-machine-factory",
    curation: "curated-pass-3",
    variant: "warMachineFactory",
    refs: [],
    description: "Adventure shop for buying ballista, ammo cart, first aid tent, or catapult-related war machine services where rules allow.",
    visual: "Workshop storefront panel with machine bays, price tags, hero equipment rack, and stock/ownership markers.",
    mechanics: "Purchases validate hero ownership, machine slot availability, shop stock, resource cost, and existing machine state before committing.",
    animation: "Machine bay lights on hover, purchase stamps SOLD, gold count ticks down, and the acquired machine slides into the hero rack.",
    components: ["WarMachineFactory", "MachineBayGrid", "HeroMachineRack", "PriceLedger", "BuyButton", "CloseButton"],
    bindings: [
      ["shopStock", "state.mapObjects.byId[factoryId].warMachineStock", "Available machines and restock flags."],
      ["heroMachines", "state.heroes.byId[selected].warMachines", "Hero-owned machine slots."],
      ["selectedMachine", "state.ui.warMachineFactory.selectedMachineId", "Local selected machine."],
      ["price", "selectors.economy.selectedWarMachinePrice", "Gold cost and affordability."],
      ["resources", "state.players.active.resources.gold", "Gold available for purchase guard."],
    ],
    actions: [
      ["Select machine", "`warFactory.selectMachine`", "local-ui", "Current screen", "`SELECT_WAR_MACHINE`", "Updates price and slot preview."],
      ["Buy", "`warFactory.buy`", "command", "Current screen", "`BUY_WAR_MACHINE`", "Spends gold, updates hero machine slot, decrements stock when limited."],
      ["Close", "`warFactory.close`", "navigation", "`07-adventure-map`", "`CLOSE_WAR_MACHINE_FACTORY`", "Returns to adventure map."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Factory object", "Hero machine slots", "Shop stock", "Gold selector", "Factory shop view"],
      command: ["Machine input", "Affordability guard", "Purchase command", "Reducer updates hero", "Sold stamp"],
      animation: ["Bay glow", "Sold stamp", "Gold tick", "Machine slide"],
    },
  },
  "15-underground-toggle": {
    number: "15",
    title: "Underground Layer Toggle",
    system: "adventure",
    archetype: "curated-layer-toggle",
    curation: "curated-pass-3",
    variant: "undergroundToggle",
    refs: [],
    description: "Adventure map layer switcher for surface and underground views, including gate focus and known subterranean entrance state.",
    visual: "Split map overlay shows surface in warm greens above and underground in cold stone below, with a central brass lever and gate markers.",
    mechanics: "Layer switch changes camera/render context and selected layer. It does not move heroes unless a valid subterranean gate or monolith transition is explicitly used.",
    animation: "Screen wipes vertically between layers, minimap palette swaps, known gates pulse, and unavailable layer buttons clank with disabled feedback.",
    components: ["UndergroundToggle", "SurfacePreview", "UndergroundPreview", "GateMarkerList", "LayerLever", "CloseButton"],
    bindings: [
      ["activeLayer", "state.adventure.activeLayer", "Surface or underground render context."],
      ["hasUnderground", "state.scenario.layers.underground.enabled", "Controls underground button availability."],
      ["knownGates", "selectors.adventure.knownSubterraneanGates", "Visible gates and two-way links."],
      ["selectedGate", "state.ui.layerToggle.selectedGateId", "Local selected gate marker."],
      ["cameraFocus", "state.adventure.camera", "Camera target updated by focus actions."],
    ],
    actions: [
      ["Switch surface", "`layer.surface`", "command", "`07-adventure-map`", "`SET_ADVENTURE_LAYER`", "Sets active layer to surface and refreshes camera."],
      ["Switch underground", "`layer.underground`", "command", "`07-adventure-map`", "`SET_ADVENTURE_LAYER`", "Sets active layer to underground if scenario supports it."],
      ["Focus gate", "`layer.focusGate`", "navigation", "`07-adventure-map`", "`FOCUS_SUBTERRANEAN_GATE`", "Centers camera on selected known gate."],
      ["Close", "`layer.close`", "navigation", "`07-adventure-map`", "`CLOSE_LAYER_TOGGLE`", "Keeps current layer unchanged."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Scenario layers", "Active layer", "Known gates", "Camera selector", "Layer toggle view"],
      command: ["Layer/gate input", "Layer availability guard", "Set layer or focus", "Camera update", "Map render"],
      animation: ["Vertical wipe", "Palette swap", "Gate pulse", "Map settle"],
    },
  },
  "16-view-world": {
    number: "16",
    title: "View World",
    system: "adventure",
    archetype: "curated-view-world",
    curation: "curated-pass-3",
    variant: "viewWorld",
    refs: [],
    description: "Full-world overview for View Air/View Earth style spells and strategic map scanning.",
    visual: "Almost full-screen parchment world map with colored ownership pins, fog masks, layer tabs, and a small focus/detail plaque.",
    mechanics: "Visible world data respects spell type, fog of war, scouting rules, and layer. Selection can focus an allowed object or return to the caster context.",
    animation: "Cloud/fog masks part over legal regions, ownership pins twinkle, selected focus ring expands, and return zooms back to adventure camera.",
    components: ["ViewWorldScreen", "WorldMapCanvas", "FogMaskLegend", "LayerTabs", "ObjectPins", "FocusPlaque"],
    bindings: [
      ["spellContext", "state.ui.viewWorld.spellContext", "View Air, View Earth, or strategic overview source."],
      ["visibleWorld", "selectors.spells.viewWorldVisibleObjects", "Objects revealed under spell and scouting rules."],
      ["selectedFocus", "state.ui.viewWorld.selectedObjectId", "Local selected map pin."],
      ["activeLayer", "state.adventure.activeLayer", "Surface/underground tab."],
      ["manaPreview", "selectors.spells.viewWorldManaCost", "Mana cost already paid or pending by caller context."],
    ],
    actions: [
      ["Select pin", "`viewWorld.selectPin`", "local-ui", "Current screen", "`SELECT_VIEW_WORLD_PIN`", "Updates detail plaque."],
      ["Change layer", "`viewWorld.changeLayer`", "local-ui", "Current screen", "`SET_VIEW_WORLD_LAYER`", "Changes overview layer without moving adventure camera."],
      ["Focus selected", "`viewWorld.focusSelected`", "navigation", "`07-adventure-map`", "`FOCUS_VIEW_WORLD_TARGET`", "Centers map on legal selected target."],
      ["Close", "`viewWorld.close`", "navigation", "`07-adventure-map` or `47-spell-book`", "`CLOSE_VIEW_WORLD`", "Returns to spell/adventure caller."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Spell context", "Fog rules", "Object selectors", "Layer filter", "World overview"],
      command: ["Pin/layer input", "Visibility guard", "Local focus", "Optional camera route", "Caller return"],
      animation: ["Fog part", "Pin twinkle", "Focus ring", "Camera zoom"],
    },
  },
  "17-adventure-spell-targeting": {
    number: "17",
    title: "Adventure Spell Targeting",
    system: "adventure",
    archetype: "curated-adventure-spell-targeting",
    curation: "curated-pass-3",
    variant: "adventureSpellTargeting",
    refs: [],
    description: "Adventure map targeting overlay for map spells such as Town Portal, Dimension Door, Fly, Water Walk, View Air, and View Earth.",
    visual: "Adventure map darkens under a spell banner; legal target tiles glow blue/gold, illegal targets mark red, and the cursor/status line changes to targeting mode.",
    mechanics: "Target legality checks spell scope, terrain, hero skills, mana, daily cast limits, town ownership, object blocks, and movement rules before command dispatch.",
    animation: "Legal tiles pulse, cursor rune rotates, invalid target flashes red, accepted cast draws a magic trail and then resolves camera/hero movement.",
    components: ["AdventureSpellTargeting", "SpellBanner", "LegalTargetOverlay", "InvalidTargetMarkers", "ManaCostPanel", "CancelButton"],
    bindings: [
      ["selectedSpell", "state.ui.spellTargeting.spellId", "Spell chosen from spell book or command panel."],
      ["casterHero", "state.adventure.selectedHeroId", "Hero paying mana and receiving outcome."],
      ["legalTargets", "selectors.spells.adventureLegalTargets", "Tiles/objects/towns legal for this spell."],
      ["mana", "state.heroes.byId[caster].mana", "Current mana and cost guard."],
      ["targetDraft", "state.ui.spellTargeting.hoverTarget", "Local hover/selected target."],
    ],
    actions: [
      ["Hover target", "`advSpell.hoverTarget`", "local-ui", "Current screen", "`PREVIEW_ADVENTURE_SPELL_TARGET`", "Updates target draft and status text."],
      ["Cast on target", "`advSpell.cast`", "command", "`07-adventure-map` or target result screen", "`CAST_ADVENTURE_SPELL`", "Spends mana and applies spell result."],
      ["Open world view", "`advSpell.viewWorld`", "navigation", "`16-view-world`", "`OPEN_VIEW_WORLD_FROM_SPELL`", "Routes for View Air/View Earth style spells."],
      ["Cancel", "`advSpell.cancel`", "navigation", "`47-spell-book` or `07-adventure-map`", "`CANCEL_SPELL_TARGETING`", "Discards target draft."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Spellbook choice", "Caster hero", "Mana selector", "Target rules", "Target overlay"],
      command: ["Target input", "Spell legality guard", "Cast command", "Reducer applies spell", "Map/caller route"],
      animation: ["Rune cursor", "Tile pulse", "Invalid flash", "Magic trail"],
    },
  },
  "18-map-object-tooltip": {
    number: "18",
    title: "Map Object Tooltip",
    system: "adventure",
    archetype: "curated-object-tooltip",
    curation: "curated-pass-3",
    variant: "mapObjectTooltip",
    refs: [],
    description: "Right-click informational tooltip for adventure map objects, heroes, towns, resources, and guarded encounters.",
    visual: "Compact black-and-bronze tooltip floats near the hovered object with portrait, public name, ownership/guard hints, and no command buttons unless pinned.",
    mechanics: "Tooltip data is presentation-only and visibility-filtered; hidden army counts, rewards, or ownership stay masked when fog/scouting rules require it.",
    animation: "Tooltip fades in after hold delay, tracks the object anchor, pins with a brass tack, and fades out without changing gameplay state.",
    components: ["MapObjectTooltip", "TooltipAnchor", "ObjectPortrait", "PublicInfoRows", "PinState", "CloseHotspot"],
    bindings: [
      ["hoverObject", "state.ui.adventure.hoverObjectId", "Object under pointer or controller focus."],
      ["publicInfo", "selectors.mapObjects.publicTooltipInfo", "Name, type, owner, and visible hints."],
      ["hiddenGuard", "selectors.scouting.hiddenTooltipFields", "Masked fields due to fog/scouting rules."],
      ["pinState", "state.ui.tooltips.pinnedObjectId", "Local pinned tooltip state."],
      ["anchorPosition", "state.ui.pointer.anchorRect", "Screen-space placement only."],
    ],
    actions: [
      ["Right-click object", "`tooltip.open`", "local-ui", "Current screen", "`OPEN_OBJECT_TOOLTIP`", "Sets tooltip hover/pin draft."],
      ["Pin tooltip", "`tooltip.pin`", "local-ui", "Current screen", "`PIN_OBJECT_TOOLTIP`", "Keeps tooltip visible while pointer moves."],
      ["Open details", "`tooltip.details`", "navigation", "`09-map-object-dialog` or `50-creature-info`", "`OPEN_TOOLTIP_DETAIL`", "Routes when the object has a detailed viewer."],
      ["Close", "`tooltip.close`", "local-ui", "Current screen", "`CLOSE_OBJECT_TOOLTIP`", "Clears tooltip UI draft only."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Hover object", "Scouting visibility", "Public info selector", "Anchor rect", "Tooltip"],
      command: ["Right-click/hold", "Visibility guard", "Local tooltip draft", "Optional detail route", "Tooltip close"],
      animation: ["Hold delay", "Fade in", "Pin tack", "Fade out"],
    },
  },
  "19-status-bar": {
    number: "19",
    title: "Status Bar",
    system: "adventure",
    archetype: "curated-status-bar",
    curation: "curated-pass-3",
    variant: "statusBar",
    refs: [],
    description: "Adventure status line and message history strip showing hover descriptions, command feedback, resource changes, and disabled reasons.",
    visual: "The bottom status strip is expanded into a scrollable message drawer with the map still visible above and resource/date chrome locked in place.",
    mechanics: "Status messages are UI feedback derived from hover context, command results, and localized errors. They do not control reducers or alter replay state.",
    animation: "New messages slide in from the left, resource deltas glow, pinned messages receive a wax seal, and drawer expansion pushes no gameplay layout.",
    components: ["AdventureStatusBar", "MessageTicker", "MessageHistoryDrawer", "PinnedMessage", "ResourceDeltaBadges"],
    bindings: [
      ["hoverContext", "state.ui.adventure.hoverContext", "Current hover/focus description."],
      ["latestMessage", "state.ui.messages.latest", "Most recent localized status event."],
      ["messageHistory", "state.ui.messages.history", "Client-side message history, not replay authoritative."],
      ["resourceDeltas", "selectors.economy.lastVisibleDeltas", "Recent command-result deltas."],
      ["drawerOpen", "state.ui.statusBar.drawerOpen", "Local expanded/collapsed state."],
    ],
    actions: [
      ["Expand drawer", "`status.expand`", "local-ui", "Current screen", "`EXPAND_STATUS_HISTORY`", "Shows recent UI feedback."],
      ["Pin message", "`status.pinMessage`", "local-ui", "Current screen", "`PIN_STATUS_MESSAGE`", "Pins selected visible message locally."],
      ["Clear local history", "`status.clear`", "local-ui", "Current screen", "`CLEAR_STATUS_HISTORY`", "Clears client-only history, not gameplay records."],
      ["Collapse drawer", "`status.collapse`", "local-ui", "Current screen", "`COLLAPSE_STATUS_HISTORY`", "Returns to single-line status strip."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Hover context", "Command feedback", "Localization", "Message history", "Status bar"],
      command: ["Hover/result input", "Message formatter", "Local history draft", "Drawer controls", "Visible feedback"],
      animation: ["Message slide", "Delta glow", "Wax pin", "Drawer fold"],
    },
  },
  "20-mine-visit-dialog": {
    number: "20",
    title: "Mine Visit Dialog",
    system: "adventure",
    archetype: "curated-mine-visit",
    curation: "curated-pass-3",
    variant: "mineVisit",
    refs: [],
    description: "Mine capture or visit dialog showing resource type, current owner, guard state, income, and flagging outcome.",
    visual: "Mine entrance portrait and colored ownership flag sit beside resource yield text, guard/visited state, and Claim/Leave controls.",
    mechanics: "Capturing a mine validates hero position, guard resolution, player ownership, and mine rules before changing owner and updating daily income.",
    animation: "Flag cloth unfurls in the active player color, resource icon sparkles, income text ticks, and map mine sprite changes owner color on close.",
    components: ["MineVisitDialog", "MinePortrait", "OwnerFlag", "IncomePreview", "GuardSummary", "ClaimLeaveButtons"],
    bindings: [
      ["mineId", "state.ui.adventure.pendingMineVisit.mineId", "Visited mine object."],
      ["mineRecord", "state.mapObjects.byId[mineId]", "Resource type, owner, guard, and income."],
      ["activePlayer", "state.turn.activePlayerId", "Player color for flagging."],
      ["dailyIncome", "selectors.economy.mineIncomePreview", "Income gained if claimed."],
      ["guardState", "selectors.mapObjects.mineGuardState", "Unfought, defeated, or none."],
    ],
    actions: [
      ["Claim mine", "`mine.claim`", "command", "`07-adventure-map`", "`CLAIM_MINE`", "Changes owner and updates income selectors."],
      ["Fight guard", "`mine.fightGuard`", "navigation", "`40-pre-battle-dialog`", "`START_MINE_GUARD_BATTLE`", "Routes to combat if guards block capture."],
      ["Leave", "`mine.leave`", "navigation", "`07-adventure-map`", "`CLOSE_MINE_DIALOG`", "No ownership change."],
      ["Right-click resource", "`mine.resourceInfo`", "navigation", "`18-map-object-tooltip`", "`OPEN_RESOURCE_TOOLTIP`", "Shows resource type details."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Hero visit", "Mine object", "Owner/resource", "Guard state", "Mine dialog"],
      command: ["Claim/fight input", "Guard/ownership check", "Claim or battle route", "Income refresh", "Flag animation"],
      animation: ["Flag unfurl", "Resource sparkle", "Income tick", "Map recolor"],
    },
  },
  "21-external-dwelling": {
    number: "21",
    title: "External Dwelling",
    system: "adventure",
    archetype: "curated-external-dwelling",
    curation: "curated-pass-3",
    variant: "externalDwelling",
    refs: [],
    description: "Adventure creature dwelling recruitment window for map dwellings outside towns.",
    visual: "Dwelling facade panel with creature portrait, weekly stock, quantity stepper, cost preview, and hero army destination row.",
    mechanics: "Recruitment validates dwelling ownership/visit state, weekly stock, resource cost, hero army capacity, and creature merge legality.",
    animation: "Creature portrait breathes, stock counter ticks down, recruited stack slides into destination slot, and empty dwelling greys out.",
    components: ["ExternalDwellingDialog", "DwellingPortrait", "CreatureOffer", "QuantityStepper", "CostPreview", "DestinationArmyRow"],
    bindings: [
      ["dwellingId", "state.ui.adventure.pendingDwellingId", "Visited external dwelling."],
      ["dwellingStock", "state.mapObjects.byId[dwellingId].stock", "Weekly available creature count."],
      ["selectedQuantity", "state.ui.externalDwelling.quantity", "Local recruit draft."],
      ["destinationArmy", "state.heroes.byId[selected].army", "Hero army receiving recruits."],
      ["costPreview", "selectors.economy.externalDwellingCost", "Cost and affordability for quantity."],
    ],
    actions: [
      ["Change quantity", "`dwelling.quantity`", "local-ui", "Current screen", "`SET_EXTERNAL_DWELLING_QUANTITY`", "Updates cost and destination preview."],
      ["Recruit", "`dwelling.recruit`", "command", "Current screen", "`RECRUIT_EXTERNAL_DWELLING_UNITS`", "Spends resources, decrements stock, updates hero army."],
      ["Max", "`dwelling.max`", "local-ui", "Current screen", "`SET_EXTERNAL_DWELLING_MAX`", "Chooses max legal quantity."],
      ["Close", "`dwelling.close`", "navigation", "`07-adventure-map`", "`CLOSE_EXTERNAL_DWELLING`", "Returns to map."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Dwelling object", "Weekly stock", "Hero army", "Resources", "Recruit dialog"],
      command: ["Quantity/recruit input", "Stock/cost/capacity guard", "Recruit command", "Army and stock update", "Dwelling feedback"],
      animation: ["Portrait breath", "Counter tick", "Stack slide", "Grey out"],
    },
  },
  "22-garrison-structure": {
    number: "22",
    title: "Garrison Structure",
    system: "adventure",
    archetype: "curated-garrison-structure",
    curation: "curated-pass-3",
    variant: "garrisonStructure",
    refs: [],
    description: "Adventure garrison transfer screen for moving stacks between visiting hero and standalone garrison structure.",
    visual: "Two horizontal army rows face each other inside a stone gate frame, with hero portrait left, garrison banner right, and split/swap controls between them.",
    mechanics: "Transfers validate ownership, locked garrison flags, stack compatibility, one-creature-left rules where applicable, and capacity before reducer updates both armies.",
    animation: "Dragged stack ghost follows the cursor, legal slots glow, swaps crossfade, and rejected drops snap back with a dull thud.",
    components: ["GarrisonStructureScreen", "HeroArmyRow", "GarrisonArmyRow", "StackDragLayer", "TransferControls", "CloseButton"],
    bindings: [
      ["heroArmy", "state.heroes.byId[selected].army", "Visiting hero stack row."],
      ["garrisonArmy", "state.mapObjects.byId[garrisonId].army", "Structure stack row."],
      ["selectedStack", "state.ui.garrisonTransfer.selectedStackRef", "Local drag/click selection."],
      ["transferRules", "selectors.armies.garrisonTransferRules", "Ownership, lock, capacity, and merge legality."],
      ["splitDraft", "state.ui.garrisonTransfer.splitQuantity", "Local split quantity before command."],
    ],
    actions: [
      ["Drag stack", "`garrison.dragStack`", "local-ui", "Current screen", "`START_GARRISON_STACK_DRAG`", "Creates drag draft only."],
      ["Drop stack", "`garrison.dropStack`", "command", "Current screen", "`TRANSFER_GARRISON_STACK`", "Moves, merges, swaps, or rejects stack transfer."],
      ["Split stack", "`garrison.splitStack`", "navigation", "`51-split-stack-dialog`", "`OPEN_SPLIT_STACK_DIALOG`", "Creates split quantity draft."],
      ["Close", "`garrison.close`", "navigation", "`07-adventure-map`", "`CLOSE_GARRISON_STRUCTURE`", "Returns to visited map tile."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Hero army", "Garrison army", "Ownership rules", "Transfer rules", "Garrison UI"],
      command: ["Drag/drop input", "Transfer legality guard", "Transfer command", "Reducer updates armies", "Slot feedback"],
      animation: ["Drag ghost", "Slot glow", "Swap crossfade", "Snap back"],
    },
  },
  "23-hero-prison": {
    number: "23",
    title: "Hero Prison",
    system: "adventure",
    archetype: "curated-hero-prison",
    curation: "curated-pass-3",
    variant: "heroPrison",
    refs: [],
    description: "Adventure prison dialog for releasing an imprisoned hero into the player's roster when limits and ownership rules allow.",
    visual: "A barred prison cell portrait dominates the dialog, with hero class/level/army preview, roster capacity warning, and Release/Leave controls.",
    mechanics: "Release validates prison object state, active player roster capacity, hero record availability, and scenario rules before creating the hero on the map.",
    animation: "Cell bars lift, hero portrait brightens, roster slot glows, released hero appears beside the prison, and the prison object becomes visited.",
    components: ["HeroPrisonDialog", "PrisonCellPortrait", "ImprisonedHeroSummary", "RosterCapacityPanel", "ReleaseLeaveButtons"],
    bindings: [
      ["prisonId", "state.ui.adventure.pendingPrisonId", "Visited prison object."],
      ["imprisonedHero", "state.mapObjects.byId[prisonId].heroId", "Hero record locked inside prison."],
      ["rosterSlots", "selectors.heroes.availableRosterSlots", "Player hero capacity and free slots."],
      ["releaseGuard", "selectors.heroes.prisonReleaseGuard", "Eligibility and disabled reason."],
      ["spawnTile", "selectors.mapObjects.prisonReleaseTile", "Tile where the released hero appears."],
    ],
    actions: [
      ["Release hero", "`prison.release`", "command", "`07-adventure-map`", "`RELEASE_PRISON_HERO`", "Adds hero to roster, marks prison visited, spawns hero at valid tile."],
      ["Inspect hero", "`prison.inspectHero`", "navigation", "`46-hero-screen`", "`OPEN_IMPRISONED_HERO_PREVIEW`", "Shows read-only hero sheet preview."],
      ["Leave", "`prison.leave`", "navigation", "`07-adventure-map`", "`CLOSE_HERO_PRISON`", "Leaves prison unresolved."],
    ],
    html: adventureStateHtml,
    diagram: {
      load: ["Prison object", "Hero record", "Roster capacity", "Spawn tile", "Prison dialog"],
      command: ["Release input", "Roster/release guard", "Release command", "Reducer creates hero", "Map spawn"],
      animation: ["Bars lift", "Portrait brighten", "Roster glow", "Hero spawn"],
    },
  },
};

Object.assign(screens, adventurePass3);

const townPass4 = {
  "31-grail-building": {
    number: "31",
    title: "Grail Building",
    system: "town",
    archetype: "curated-grail-building",
    curation: "curated-pass-4",
    variant: "grailBuilding",
    refs: [],
    description: "Town grail construction ceremony after a hero brings the grail to a valid town.",
    visual: "Town panorama is darkened for a ceremonial build panel: grail relic at center, selected town banner, faction wonder preview, and permanent bonus summary.",
    mechanics: "Consumes the grail delivery state, validates town ownership and no existing grail building, creates the faction-specific grail structure, and updates town/player bonuses.",
    animation: "Relic rises from the hero slot, town wonder beam flashes over the panorama, bonus plaques illuminate, and the built hotspot remains glowing afterward.",
    components: ["GrailBuildingDialog", "RelicPedestal", "WonderPreview", "TownBonusList", "ConfirmBuildButton", "CeremonyVfx"],
    bindings: [
      ["townId", "state.towns.selectedTownId", "Town receiving the grail."],
      ["deliveringHero", "state.adventure.visitingHeroId", "Hero carrying grail artifact/state."],
      ["grailRecord", "state.scenario.grail", "Grail discovered and delivered state."],
      ["wonderDefinition", "selectors.towns.factionGrailBuilding", "Faction-specific grail building and bonuses."],
      ["bonusPreview", "selectors.towns.grailBonusPreview", "Income, growth, spell, or faction-specific bonuses."],
    ],
    actions: [
      ["Build grail", "`grail.build`", "command", "`24-town-screen`", "`BUILD_GRAIL_STRUCTURE`", "Consumes grail delivery, adds grail building, applies bonuses."],
      ["Inspect bonuses", "`grail.inspect`", "local-ui", "Current screen", "`SELECT_GRAIL_BONUS`", "Changes local bonus plaque focus."],
      ["Cancel", "`grail.cancel`", "navigation", "`24-town-screen`", "`CLOSE_GRAIL_BUILDING_DIALOG`", "Leaves grail delivery unresolved."],
    ],
    html: townExtendedHtml,
    diagram: {
      load: ["Town selector", "Visiting hero", "Grail state", "Faction wonder", "Grail ceremony"],
      command: ["Build click", "Ownership/grail guard", "Build command", "Town bonuses", "Town refresh"],
      animation: ["Relic rise", "Wonder beam", "Bonus glow", "Hotspot pulse"],
    },
  },
  "32-artifact-merchant-black-market": {
    number: "32",
    title: "Artifact Merchant / Black Market",
    system: "town",
    archetype: "curated-artifact-market",
    curation: "curated-pass-4",
    variant: "artifactMarket",
    refs: [],
    description: "Artifact shop or black market service for browsing, buying, and selling eligible artifacts.",
    visual: "Merchant stall panel with artifact shelf grid, selected artifact detail parchment, hero backpack strip, price tag, and buy/sell controls.",
    mechanics: "Availability comes from market stock, rarity rules, hero inventory capacity, artifact restrictions, and player gold before purchase or sale commands commit.",
    animation: "Artifacts shimmer on the shelf, selected item lifts, price tag flips between buy/sell, and purchased items slide into the backpack.",
    components: ["ArtifactMarket", "ArtifactShelfGrid", "SelectedArtifactDetails", "HeroBackpackStrip", "PriceTag", "BuySellButtons"],
    bindings: [
      ["marketStock", "state.towns.byId[selected].artifactMarketStock", "Available artifact IDs and sold state."],
      ["selectedArtifact", "state.ui.artifactMarket.selectedArtifactId", "Local selected artifact."],
      ["heroBackpack", "state.heroes.byId[visiting].backpack", "Inventory target for purchases."],
      ["pricePreview", "selectors.economy.artifactMarketPrice", "Buy/sell value and affordability."],
      ["gold", "state.players.active.resources.gold", "Gold guard for purchase."],
    ],
    actions: [
      ["Select shelf item", "`artifactMarket.selectShelf`", "local-ui", "Current screen", "`SELECT_ARTIFACT_MARKET_ITEM`", "Updates item details and price."],
      ["Buy artifact", "`artifactMarket.buy`", "command", "Current screen", "`BUY_ARTIFACT`", "Spends gold, moves artifact to backpack, marks stock sold."],
      ["Sell artifact", "`artifactMarket.sell`", "command", "Current screen", "`SELL_ARTIFACT`", "Removes backpack item and adds gold if selling is allowed."],
      ["Close", "`artifactMarket.close`", "navigation", "`24-town-screen`", "`CLOSE_ARTIFACT_MARKET`", "Returns to town service strip."],
    ],
    html: townExtendedHtml,
    diagram: {
      load: ["Market stock", "Hero backpack", "Artifact registry", "Gold selector", "Artifact market"],
      command: ["Shelf/backpack input", "Legality and price guard", "Buy/sell command", "Inventory/gold update", "Shelf refresh"],
      animation: ["Shelf shimmer", "Item lift", "Price flip", "Backpack slide"],
    },
  },
  "33-shipyard": {
    number: "33",
    title: "Shipyard",
    system: "town",
    archetype: "curated-shipyard",
    curation: "curated-pass-4",
    variant: "shipyard",
    refs: [],
    description: "Town or adventure shipyard service for purchasing a boat at an adjacent valid water tile.",
    visual: "Harbor panel overlays the coast-facing town panorama, with dock water preview, boat silhouette, resource cost, blocked-tile warning, and Build/Close buttons.",
    mechanics: "Boat construction validates shipyard building/object, available water spawn tile, existing boat occupancy, resources, and one-boat-per-tile rules.",
    animation: "Dock crane swings, boat hull fades into the water tile, wood/ore/gold counters tick down, and the adventure map spawn tile ripples.",
    components: ["ShipyardDialog", "DockPreview", "BoatSpawnTile", "CostLedger", "BlockedTileWarning", "BuildBoatButton"],
    bindings: [
      ["shipyardId", "state.ui.shipyard.sourceId", "Town building or adventure shipyard object."],
      ["spawnTiles", "selectors.towns.shipyardBoatSpawnTiles", "Legal adjacent water tiles."],
      ["selectedTile", "state.ui.shipyard.selectedSpawnTile", "Local chosen spawn tile."],
      ["cost", "selectors.economy.shipyardBoatCost", "Wood/ore/gold requirement and affordability."],
      ["resources", "state.players.active.resources", "Resource guard for build command."],
    ],
    actions: [
      ["Select water tile", "`shipyard.selectTile`", "local-ui", "Current screen", "`SELECT_BOAT_SPAWN_TILE`", "Updates spawn preview."],
      ["Build boat", "`shipyard.build`", "command", "`24-town-screen` or `07-adventure-map`", "`BUILD_BOAT`", "Spends resources and creates boat entity at selected tile."],
      ["Close", "`shipyard.close`", "navigation", "`24-town-screen` or `07-adventure-map`", "`CLOSE_SHIPYARD`", "Returns to caller."],
    ],
    html: townExtendedHtml,
    diagram: {
      load: ["Shipyard source", "Adjacent water tiles", "Boat occupancy", "Resources", "Shipyard view"],
      command: ["Tile/build input", "Spawn/cost guard", "Build boat command", "Boat entity created", "Caller refresh"],
      animation: ["Crane swing", "Hull fade", "Cost tick", "Water ripple"],
    },
  },
  "34-fort-view": {
    number: "34",
    title: "Fort View",
    system: "town",
    archetype: "curated-fort-view",
    curation: "curated-pass-4",
    variant: "fortView",
    refs: [],
    description: "Town fortification inspection view showing fort/citadel/castle tier, wall/tower battle bonuses, and siege readiness.",
    visual: "Stone keep cutaway sits over the town panorama with wall segments, tower slots, moat/gate plaques, and siege bonus checklist.",
    mechanics: "Reads built fortification level and faction wall rules to expose battle layout, tower shots, moat presence, growth bonus, and build prerequisites.",
    animation: "Wall segments highlight in construction order, tower icons flare, gate opens on hover, and missing upgrades pulse as dark silhouettes.",
    components: ["FortView", "FortificationCutaway", "WallSegmentList", "TowerSlots", "SiegeBonusChecklist", "CloseButton"],
    bindings: [
      ["fortLevel", "state.towns.byId[selected].fortificationLevel", "Fort, Citadel, Castle, or none."],
      ["wallDefinition", "selectors.towns.fortificationBattleLayout", "Wall/tower/gate/moat definitions."],
      ["growthBonus", "selectors.towns.fortificationGrowthBonus", "Creature growth multiplier from fort tier."],
      ["buildPrereqs", "selectors.towns.nextFortUpgradePrereqs", "Next upgrade requirements."],
      ["selectedSegment", "state.ui.fortView.selectedSegment", "Local highlighted wall/tower segment."],
    ],
    actions: [
      ["Select segment", "`fortView.selectSegment`", "local-ui", "Current screen", "`SELECT_FORT_SEGMENT`", "Updates bonus detail plaque."],
      ["Open build tree", "`fortView.buildTree`", "navigation", "`30-build-tree`", "`OPEN_BUILD_TREE_FOR_FORT`", "Focuses next fortification upgrade."],
      ["Close", "`fortView.close`", "navigation", "`24-town-screen`", "`CLOSE_FORT_VIEW`", "Returns to town."],
    ],
    html: townExtendedHtml,
    diagram: {
      load: ["Town buildings", "Fort rules", "Battle layout", "Growth selector", "Fort view"],
      command: ["Segment/build input", "Build prerequisite guard", "Local focus or route", "Town/battle bonus preview", "Town return"],
      animation: ["Wall highlight", "Tower flare", "Gate hover", "Silhouette pulse"],
    },
  },
  "35-town-flyby": {
    number: "35",
    title: "Town Flyby",
    system: "town",
    archetype: "curated-town-flyby",
    curation: "curated-pass-4",
    variant: "townFlyby",
    refs: [],
    description: "Optional cinematic town entry/faction panorama flyby before the interactive town screen appears.",
    visual: "Letterboxed full-panorama shot with slow camera path markers, faction crest, loading/progress strip, and skip button.",
    mechanics: "Presentation-only transition loads town panorama assets, faction audio, and hotspot metadata before opening the interactive town screen.",
    animation: "Camera eases across the skyline, parallax layers drift, faction crest fades in, and skip accelerates to the town screen without gameplay mutation.",
    components: ["TownFlyby", "PanoramaCameraPath", "FactionCrest", "AssetWarmupProgress", "SkipButton"],
    bindings: [
      ["townId", "state.towns.selectedTownId", "Town being entered."],
      ["factionId", "state.towns.byId[selected].factionId", "Faction visuals and music."],
      ["assetWarmup", "state.ui.assetWarmup.townScreen", "Presentation loading state."],
      ["cameraPath", "selectors.presentation.townFlybyPath", "Deterministic presentation path from asset metadata."],
      ["skipAvailable", "config.ui.allowSkipCinematics", "Skip button availability."],
    ],
    actions: [
      ["Skip", "`townFlyby.skip`", "navigation", "`24-town-screen`", "`SKIP_TOWN_FLYBY`", "Completes presentation transition only."],
      ["Flyby complete", "`townFlyby.complete`", "navigation", "`24-town-screen`", "`COMPLETE_TOWN_FLYBY`", "Routes after assets are ready."],
      ["Cancel load error", "`townFlyby.errorBack`", "navigation", "`07-adventure-map`", "`CANCEL_TOWN_ENTRY_AFTER_PRESENTATION_ERROR`", "Returns if required town data cannot load."],
    ],
    html: townExtendedHtml,
    diagram: {
      load: ["Town selector", "Faction assets", "Hotspot metadata", "Audio cue", "Flyby view"],
      command: ["Skip/complete", "Asset readiness guard", "Presentation route", "Town screen open", "Hotspots active"],
      animation: ["Letterbox in", "Camera pan", "Crest fade", "Town reveal"],
    },
  },
  "36-marketplace-artifact-trading": {
    number: "36",
    title: "Marketplace Artifact Trading",
    system: "town",
    archetype: "curated-artifact-trading",
    curation: "curated-pass-4",
    variant: "artifactTrading",
    refs: [],
    description: "Marketplace sub-service for exchanging artifacts between hero, backpack, market offer slots, and trade valuation rows.",
    visual: "Split counter layout: hero backpack grid left, market valuation scales center, target/sell slots right, with gold/resource quote at the bottom.",
    mechanics: "Trade commands check artifact ownership, locked equipped slots, trade eligibility, market availability, valuation formulas, backpack capacity, and gold/resource outcomes.",
    animation: "Artifact cards slide onto scales, valuation needle moves, accepted trade stamps the receipt, and rejected locked artifacts snap back.",
    components: ["MarketplaceArtifactTrading", "HeroArtifactGrid", "ValuationScales", "TradeOfferSlots", "QuotePanel", "TradeButtons"],
    bindings: [
      ["heroArtifacts", "state.heroes.byId[visiting].artifacts", "Equipped and backpack artifacts."],
      ["selectedOffer", "state.ui.artifactTrading.offerArtifactId", "Local artifact being offered."],
      ["selectedRequest", "state.ui.artifactTrading.requestId", "Local requested gold/resource/artifact outcome."],
      ["quote", "selectors.economy.artifactTradeQuote", "Deterministic trade valuation."],
      ["tradeGuard", "selectors.economy.artifactTradeGuard", "Eligibility, lock, capacity, and affordability."],
    ],
    actions: [
      ["Select artifact", "`artifactTrade.selectOffer`", "local-ui", "Current screen", "`SELECT_ARTIFACT_TRADE_OFFER`", "Places artifact on offer scale locally."],
      ["Select quote", "`artifactTrade.selectQuote`", "local-ui", "Current screen", "`SELECT_ARTIFACT_TRADE_QUOTE`", "Updates requested outcome."],
      ["Trade", "`artifactTrade.commit`", "command", "Current screen", "`TRADE_ARTIFACT`", "Moves/removes artifact and applies quote result."],
      ["Close", "`artifactTrade.close`", "navigation", "`26-marketplace`", "`CLOSE_ARTIFACT_TRADING`", "Returns to main marketplace."],
    ],
    html: townExtendedHtml,
    diagram: {
      load: ["Hero artifacts", "Market rules", "Valuation formula", "Trade guard", "Artifact trading view"],
      command: ["Artifact/quote input", "Eligibility guard", "Trade command", "Inventory/economy update", "Receipt feedback"],
      animation: ["Card slide", "Scale needle", "Receipt stamp", "Snap back"],
    },
  },
  "37-quick-recruit-window": {
    number: "37",
    title: "Quick Recruit Window",
    system: "town",
    archetype: "curated-quick-recruit",
    curation: "curated-pass-4",
    variant: "quickRecruit",
    refs: [],
    description: "Condensed town-wide recruitment window for buying available creatures across all built dwellings in one pass.",
    visual: "Dense seven-row recruitment ledger with creature portraits, stock, max affordable quantity, checkboxes, destination army preview, and total cost footer.",
    mechanics: "Each checked row validates dwelling built state, stock, resources, growth availability, destination capacity, and merge rules. Commit applies rows in deterministic order.",
    animation: "Checked rows glow, total cost rolls up, recruited stacks march into army slots, and unavailable rows remain dark with localized disabled reasons.",
    components: ["QuickRecruitWindow", "DwellingRecruitRows", "SelectionCheckboxes", "TotalCostFooter", "DestinationArmyPreview", "RecruitAllButton"],
    bindings: [
      ["dwellingRows", "selectors.towns.quickRecruitRows", "Built dwellings, stock, creature IDs, and costs."],
      ["selectedRows", "state.ui.quickRecruit.selectedDwellingIds", "Local checked rows."],
      ["destinationArmy", "selectors.towns.quickRecruitDestinationArmy", "Hero or garrison target."],
      ["totalCost", "selectors.economy.quickRecruitTotalCost", "Aggregated cost for selected rows."],
      ["rowGuards", "selectors.towns.quickRecruitRowGuards", "Per-row disabled reasons."],
    ],
    actions: [
      ["Toggle row", "`quickRecruit.toggleRow`", "local-ui", "Current screen", "`TOGGLE_QUICK_RECRUIT_ROW`", "Updates selected rows and total cost."],
      ["Select all affordable", "`quickRecruit.selectAffordable`", "local-ui", "Current screen", "`SELECT_AFFORDABLE_RECRUITS`", "Checks all currently affordable legal rows."],
      ["Recruit selected", "`quickRecruit.commit`", "command", "`24-town-screen`", "`QUICK_RECRUIT_CREATURES`", "Spends resources, decrements stock, updates destination army."],
      ["Close", "`quickRecruit.close`", "navigation", "`24-town-screen`", "`CLOSE_QUICK_RECRUIT`", "Discards local selections."],
    ],
    html: townExtendedHtml,
    diagram: {
      load: ["Town dwellings", "Creature stock", "Destination army", "Resources", "Quick recruit view"],
      command: ["Checkbox input", "Row/cost guards", "Recruit command", "Stock/resources/army update", "Town refresh"],
      animation: ["Row glow", "Cost roll", "Stack march", "Disabled dim"],
    },
  },
};

Object.assign(screens, townPass4);

const heroPass5 = {
  "48-level-up-dialog": {
    number: "48",
    title: "Level Up Dialog",
    system: "hero",
    archetype: "curated-level-up",
    curation: "curated-pass-5",
    variant: "levelUp",
    refs: [],
    description: "Hero level-up choice dialog showing primary stat gain, two secondary skill choices, class weighting, and acceptance result.",
    visual: "Hero sheet is dimmed behind a parchment modal with portrait, stat gain gem, two skill cards, XP progress, and OK/choice buttons.",
    mechanics: "Level-up choices are produced deterministically from hero class, existing skills, ruleset weights, seed state, and max skill constraints. Selecting a skill commits exactly one level result.",
    animation: "XP bar fills, primary stat gem flashes, skill cards slide in from left/right, and selected card stamps into the hero sheet.",
    components: ["LevelUpDialog", "HeroPortrait", "PrimaryStatGain", "SkillChoiceCards", "ExperienceBar", "ConfirmButton"],
    bindings: [
      ["heroId", "state.ui.levelUp.heroId", "Hero receiving the level."],
      ["primaryGain", "state.ui.levelUp.primaryStatGain", "Resolved deterministic stat gain."],
      ["skillChoices", "state.ui.levelUp.skillChoices", "Two legal secondary skill options."],
      ["selectedChoice", "state.ui.levelUp.selectedChoiceId", "Local choice before confirmation."],
      ["experience", "state.heroes.byId[heroId].experience", "XP bar and next-level threshold."],
    ],
    actions: [
      ["Select left skill", "`levelUp.selectLeft`", "local-ui", "Current screen", "`SELECT_LEVEL_UP_CHOICE`", "Updates local selected skill."],
      ["Select right skill", "`levelUp.selectRight`", "local-ui", "Current screen", "`SELECT_LEVEL_UP_CHOICE`", "Updates local selected skill."],
      ["Confirm", "`levelUp.confirm`", "command", "`46-hero-screen` or previous screen", "`APPLY_HERO_LEVEL_UP`", "Applies primary stat and selected secondary skill."],
    ],
    html: heroExtendedHtml,
    diagram: {
      load: ["Hero XP result", "Class weights", "Ruleset skill limits", "Deterministic choice set", "Level-up dialog"],
      command: ["Skill selection", "Choice guard", "Apply level command", "Hero stats/skills update", "Caller return"],
      animation: ["XP fill", "Stat flash", "Cards slide", "Skill stamp"],
    },
  },
  "49-hero-meeting": {
    number: "49",
    title: "Hero Meeting",
    system: "hero",
    archetype: "curated-hero-meeting",
    curation: "curated-pass-5",
    variant: "heroMeeting",
    refs: [],
    description: "Two friendly heroes meeting on the adventure map to exchange troops, artifacts, and war machines.",
    visual: "Dual hero panels face each other with portraits, army rows, backpack strips, trade arrow, and split/swap controls in the center.",
    mechanics: "Transfers validate ownership, hero lock state, artifact equip legality, army capacity, one-creature constraints, and meeting tile adjacency before commands commit.",
    animation: "Stack and artifact drag ghosts travel between panels, legal targets glow, swaps crossfade, and rejected drops snap back.",
    components: ["HeroMeetingScreen", "LeftHeroPanel", "RightHeroPanel", "ArmyTransferRows", "ArtifactTransferStrips", "DragLayer", "CloseButton"],
    bindings: [
      ["leftHero", "state.ui.heroMeeting.leftHeroId", "First friendly hero."],
      ["rightHero", "state.ui.heroMeeting.rightHeroId", "Second friendly hero."],
      ["leftArmy", "state.heroes.byId[left].army", "Left hero stacks."],
      ["rightArmy", "state.heroes.byId[right].army", "Right hero stacks."],
      ["dragDraft", "state.ui.heroMeeting.dragDraft", "Local transfer draft."],
    ],
    actions: [
      ["Drag stack", "`heroMeeting.dragStack`", "local-ui", "Current screen", "`START_HERO_MEETING_DRAG`", "Creates local drag draft."],
      ["Drop stack", "`heroMeeting.dropStack`", "command", "Current screen", "`TRANSFER_HERO_ARMY_STACK`", "Moves, merges, swaps, or rejects stacks."],
      ["Move artifact", "`heroMeeting.moveArtifact`", "command", "Current screen", "`TRANSFER_HERO_ARTIFACT`", "Moves artifact if slot/backpack rules allow."],
      ["Close", "`heroMeeting.close`", "navigation", "`07-adventure-map`", "`CLOSE_HERO_MEETING`", "Returns to adventure map."],
    ],
    html: heroExtendedHtml,
    diagram: {
      load: ["Meeting trigger", "Left hero", "Right hero", "Transfer rules", "Meeting view"],
      command: ["Drag/drop input", "Ownership/capacity guard", "Transfer command", "Hero records update", "Slot feedback"],
      animation: ["Drag ghost", "Target glow", "Swap crossfade", "Snap back"],
    },
  },
  "50-creature-info": {
    number: "50",
    title: "Creature Info",
    system: "hero",
    archetype: "curated-creature-info",
    curation: "curated-pass-5",
    variant: "creatureInfo",
    refs: [],
    description: "Detailed creature information panel for army stacks, dwellings, combat stacks, rewards, and tooltip drill-down.",
    visual: "Bestiary parchment with creature portrait, primary combat stats, ability list, upgrade path, morale/luck modifiers, and close button.",
    mechanics: "Info is read-only. Values resolve from creature records plus current stack modifiers, hero skills, artifacts, terrain, spells, and ruleset formulas.",
    animation: "Creature portrait idles, ability icons glow on hover, modified stats pulse when sourced from buffs, and the panel fades back to caller.",
    components: ["CreatureInfoPanel", "CreaturePortrait", "StatGrid", "AbilityList", "ModifierBreakdown", "UpgradePathPreview"],
    bindings: [
      ["creatureId", "state.ui.creatureInfo.creatureId", "Creature record to display."],
      ["stackContext", "state.ui.creatureInfo.stackContext", "Hero/combat/dwelling/reward source."],
      ["baseStats", "registries.creatures.byId[creatureId].stats", "Base attack, defense, damage, health, speed, shots."],
      ["modifiers", "selectors.creatures.stackStatModifiers", "Hero, spell, artifact, terrain, and ruleset modifiers."],
      ["abilities", "registries.creatures.byId[creatureId].abilities", "Ability IDs and localized text."],
    ],
    actions: [
      ["Hover ability", "`creatureInfo.hoverAbility`", "local-ui", "Current screen", "`SHOW_CREATURE_ABILITY_DETAIL`", "Updates local detail tooltip."],
      ["Open upgrade", "`creatureInfo.openUpgrade`", "navigation", "`13-hill-fort` or `25-building-recruitment-dialog`", "`OPEN_CREATURE_UPGRADE_SOURCE`", "Routes only when caller supports upgrades."],
      ["Close", "`creatureInfo.close`", "navigation", "Previous screen", "`CLOSE_CREATURE_INFO`", "Returns to caller."],
    ],
    html: heroExtendedHtml,
    diagram: {
      load: ["Creature ID", "Stack context", "Creature registry", "Modifier selectors", "Info panel"],
      command: ["Hover/upgrade input", "Caller capability guard", "Local detail or route", "No gameplay mutation", "Caller return"],
      animation: ["Portrait idle", "Ability glow", "Stat pulse", "Panel fade"],
    },
  },
  "51-split-stack-dialog": {
    number: "51",
    title: "Split Stack Dialog",
    system: "hero",
    archetype: "curated-split-stack",
    curation: "curated-pass-5",
    variant: "splitStack",
    refs: [],
    description: "Army stack split dialog used by hero screen, town garrison, hero meeting, and garrison structures.",
    visual: "Small brass quantity modal over the owning army screen with source stack portrait, numeric amount, slider, one/max buttons, and OK/Cancel.",
    mechanics: "Split validates source count, destination slot availability, merge legality, minimum one creature in source where required, and caller ownership rules.",
    animation: "Slider knob ticks, source and destination counts preview live, OK splits the stack into two sliding badges, and Cancel snaps preview back.",
    components: ["SplitStackDialog", "SourceStackPreview", "QuantitySlider", "AmountStepper", "DestinationPreview", "ConfirmCancelButtons"],
    bindings: [
      ["sourceStack", "state.ui.splitStack.sourceStackRef", "Caller-provided stack reference."],
      ["destinationSlot", "state.ui.splitStack.destinationSlotRef", "Caller-provided target slot."],
      ["quantity", "state.ui.splitStack.quantity", "Local split amount."],
      ["splitGuard", "selectors.armies.splitStackGuard", "Count, ownership, capacity, and merge legality."],
      ["caller", "state.ui.splitStack.returnScreen", "Screen to refresh after split."],
    ],
    actions: [
      ["Change quantity", "`splitStack.changeQuantity`", "local-ui", "Current screen", "`SET_SPLIT_STACK_QUANTITY`", "Updates preview only."],
      ["Set one", "`splitStack.one`", "local-ui", "Current screen", "`SET_SPLIT_STACK_ONE`", "Sets quantity to one if legal."],
      ["Set max", "`splitStack.max`", "local-ui", "Current screen", "`SET_SPLIT_STACK_MAX`", "Sets max legal split."],
      ["Confirm", "`splitStack.confirm`", "command", "Previous screen", "`SPLIT_ARMY_STACK`", "Updates source and destination army slots."],
      ["Cancel", "`splitStack.cancel`", "navigation", "Previous screen", "`CANCEL_SPLIT_STACK`", "Discards split draft."],
    ],
    html: heroExtendedHtml,
    diagram: {
      load: ["Caller stack refs", "Army state", "Destination slot", "Split rules", "Split dialog"],
      command: ["Quantity/OK input", "Split guard", "Split command", "Army slots update", "Caller refresh"],
      animation: ["Knob tick", "Count preview", "Badge split", "Snap back"],
    },
  },
  "52-artifact-combine-dialog": {
    number: "52",
    title: "Artifact Combine Dialog",
    system: "hero",
    archetype: "curated-artifact-combine",
    curation: "curated-pass-5",
    variant: "artifactCombine",
    refs: [],
    description: "Combination artifact confirmation showing required pieces, resulting artifact, blocked slots, and equip/backpack outcome.",
    visual: "Forge-style modal with component artifacts orbiting the center, resulting artifact card, missing piece indicators, and Combine/Cancel controls.",
    mechanics: "Combine validates all required component artifact IDs, ownership, locked/equipped state, destination slot legality, backpack space, and combination recipe rules.",
    animation: "Owned pieces orbit and fuse, missing pieces remain dark, resulting artifact flares, and components vanish only after reducer success.",
    components: ["ArtifactCombineDialog", "ComponentArtifactRing", "ResultArtifactCard", "MissingPieceList", "DestinationSlotPreview", "CombineButtons"],
    bindings: [
      ["recipeId", "state.ui.artifactCombine.recipeId", "Combination recipe being evaluated."],
      ["components", "selectors.artifacts.combineComponents", "Required pieces and ownership state."],
      ["resultArtifact", "registries.artifacts.byId[resultId]", "Result artifact record."],
      ["destination", "selectors.artifacts.combineDestination", "Equip slot or backpack target."],
      ["combineGuard", "selectors.artifacts.combineGuard", "Eligibility and disabled reason."],
    ],
    actions: [
      ["Inspect component", "`artifactCombine.inspectComponent`", "local-ui", "Current screen", "`SELECT_COMBINE_COMPONENT`", "Updates component detail focus."],
      ["Combine", "`artifactCombine.confirm`", "command", "`46-hero-screen`", "`COMBINE_ARTIFACTS`", "Removes components and adds/equips result artifact."],
      ["Cancel", "`artifactCombine.cancel`", "navigation", "`46-hero-screen`", "`CANCEL_ARTIFACT_COMBINE`", "Leaves artifacts unchanged."],
    ],
    html: heroExtendedHtml,
    diagram: {
      load: ["Hero artifacts", "Combine recipe", "Artifact registry", "Destination slots", "Combine dialog"],
      command: ["Combine input", "Recipe/ownership guard", "Combine command", "Inventory update", "Hero sheet refresh"],
      animation: ["Piece orbit", "Fuse flash", "Result flare", "Component vanish"],
    },
  },
  "53-university": {
    number: "53",
    title: "University",
    system: "hero",
    archetype: "curated-university",
    curation: "curated-pass-5",
    variant: "university",
    refs: [],
    description: "University skill-learning service where a visiting hero can buy offered secondary skills if legal.",
    visual: "Stone academy panel with four professor/skill cards, hero skill row, price plaque, Wisdom-style eligibility warnings, and Learn/Close buttons.",
    mechanics: "Learning validates hero ownership, open/upgradeable skill slots, offered skill records, max skill count, current mastery, price, and player gold.",
    animation: "Professor cards glow, selected skill book opens, gold ticks down, and learned skill slides into the hero skill row.",
    components: ["UniversityDialog", "SkillOfferCards", "HeroSkillRow", "PricePlaque", "LearnButton", "CloseButton"],
    bindings: [
      ["universityId", "state.ui.university.sourceId", "Visited town or adventure university."],
      ["offeredSkills", "state.mapObjects.byId[universityId].offeredSkills", "Skill offer IDs."],
      ["heroSkills", "state.heroes.byId[selected].skills", "Current secondary skill set."],
      ["selectedSkill", "state.ui.university.selectedSkillId", "Local selected offer."],
      ["learnGuard", "selectors.heroes.universityLearnGuard", "Skill legality and affordability."],
    ],
    actions: [
      ["Select skill", "`university.selectSkill`", "local-ui", "Current screen", "`SELECT_UNIVERSITY_SKILL`", "Updates price and legality preview."],
      ["Learn", "`university.learn`", "command", "Current screen", "`LEARN_UNIVERSITY_SKILL`", "Spends gold and adds/upgrades selected skill."],
      ["Close", "`university.close`", "navigation", "`07-adventure-map` or `24-town-screen`", "`CLOSE_UNIVERSITY`", "Returns to caller."],
    ],
    html: heroExtendedHtml,
    diagram: {
      load: ["University source", "Skill offers", "Hero skills", "Gold selector", "University view"],
      command: ["Skill/learn input", "Skill and cost guard", "Learn command", "Hero skill update", "Service refresh"],
      animation: ["Card glow", "Book open", "Gold tick", "Skill slide"],
    },
  },
};

Object.assign(screens, heroPass5);

const shellPass6 = {
  "02-new-game-setup": {
    number: "02",
    title: "New Game Setup",
    system: "menus",
    archetype: "curated-new-game-setup",
    curation: "curated-pass-6",
    variant: "newGameSetup",
    refs: [],
    description: "Scenario setup shell for single scenario, campaign, random map, multiplayer, difficulty, player color, and starting options.",
    visual: "Stone-framed setup panel with mode tabs, scenario list, preview map, player slots, difficulty shields, and Start/Back buttons.",
    mechanics: "Creates a setup draft only. Starting the game validates selected scenario or generator config, pack compatibility, player slots, victory/loss conditions, and deterministic seed.",
    animation: "Mode tabs depress, scenario preview parchment slides in, player color flags flip, and Start fades into loading once validation succeeds.",
    components: ["NewGameSetup", "ModeTabs", "ScenarioList", "ScenarioPreview", "PlayerSlotTable", "DifficultySelector", "StartBackButtons"],
    bindings: [
      ["setupMode", "state.ui.newGame.mode", "Single, campaign, random, multiplayer, or tutorial draft."],
      ["scenarioList", "selectors.scenarios.availableScenarios", "Compatible scenario records from installed packs."],
      ["selectedScenario", "state.ui.newGame.selectedScenarioId", "Local selected scenario."],
      ["playerSlots", "state.ui.newGame.playerSlots", "Human/AI/open/closed player slot draft."],
      ["difficulty", "state.ui.newGame.difficulty", "Ruleset difficulty draft."],
    ],
    actions: [
      ["Select mode", "`newGame.selectMode`", "local-ui", "Current screen", "`SET_NEW_GAME_MODE`", "Updates setup draft and visible fields."],
      ["Select scenario", "`newGame.selectScenario`", "local-ui", "Current screen", "`SELECT_SCENARIO`", "Updates preview and player slots."],
      ["Start game", "`newGame.start`", "navigation", "`59-loading-screen`", "`CREATE_GAME_FROM_SETUP`", "Validates setup and creates deterministic initial game request."],
      ["Back", "`newGame.back`", "navigation", "`01-main-menu`", "`CANCEL_NEW_GAME_SETUP`", "Discards setup draft."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Installed packs", "Scenario index", "Ruleset options", "Setup draft", "Setup screen"],
      command: ["Mode/scenario/start input", "Setup validation", "Create game request", "Loading route", "Initial state"],
      animation: ["Tab depress", "Preview slide", "Flag flip", "Loading fade"],
    },
  },
  "03-campaign-selection": {
    number: "03",
    title: "Campaign Selection",
    system: "menus",
    archetype: "curated-campaign-selection",
    curation: "curated-pass-6",
    variant: "campaignSelection",
    refs: [],
    description: "Campaign book selection with campaign list, faction emblem, progress medals, difficulty, and briefing route.",
    visual: "Leather campaign book with campaign shields on the left, campaign map parchment center, completion medals, and Begin/Back buttons.",
    mechanics: "Reads campaign definitions, unlocked campaign state, previous progress, selected difficulty, and carryover rules before opening the first briefing.",
    animation: "Book pages turn between campaigns, faction shield glints, locked campaign chains rattle, and Begin routes to briefing parchment.",
    components: ["CampaignSelection", "CampaignBook", "CampaignShieldList", "CampaignMapPreview", "ProgressMedals", "BeginBackButtons"],
    bindings: [
      ["campaigns", "selectors.campaigns.availableCampaigns", "Campaign records visible under installed packs."],
      ["selectedCampaign", "state.ui.campaign.selectedCampaignId", "Local selection."],
      ["unlockState", "state.profile.campaignUnlocks", "Locked/unlocked/completed medals."],
      ["difficulty", "state.ui.campaign.difficulty", "Campaign difficulty draft."],
      ["carryoverPreview", "selectors.campaigns.carryoverPreview", "Hero/artifact/resource carryover preview."],
    ],
    actions: [
      ["Select campaign", "`campaign.select`", "local-ui", "Current screen", "`SELECT_CAMPAIGN`", "Updates map, medals, and briefing preview."],
      ["Change difficulty", "`campaign.difficulty`", "local-ui", "Current screen", "`SET_CAMPAIGN_DIFFICULTY`", "Updates campaign setup draft."],
      ["Begin", "`campaign.begin`", "navigation", "`04-campaign-narrative`", "`OPEN_CAMPAIGN_BRIEFING`", "Creates campaign run draft and opens briefing."],
      ["Back", "`campaign.back`", "navigation", "`02-new-game-setup`", "`CLOSE_CAMPAIGN_SELECTION`", "Returns to setup."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Campaign registry", "Profile progress", "Difficulty draft", "Carryover rules", "Campaign book"],
      command: ["Campaign input", "Unlock guard", "Run draft", "Briefing route", "Narrative screen"],
      animation: ["Page turn", "Shield glint", "Chain rattle", "Briefing fade"],
    },
  },
  "04-campaign-narrative": {
    number: "04",
    title: "Campaign Inter-Mission Narrative",
    system: "menus",
    archetype: "curated-campaign-narrative",
    curation: "curated-pass-6",
    variant: "campaignNarrative",
    refs: [],
    description: "Campaign briefing or inter-mission narrative screen with story text, portrait, mission objectives, carryover, and Start Mission control.",
    visual: "Wide parchment briefing with illustrated portrait panel, scrolling story text, objective plaques, carryover slots, and Start/Back buttons.",
    mechanics: "Loads campaign node data, localized narrative, objective records, bonus choices, carryover state, and selected difficulty before mission initialization.",
    animation: "Narrative text types in, portrait fades from sepia, objective seals stamp, and Start transitions through loading.",
    components: ["CampaignNarrative", "StoryScroll", "SpeakerPortrait", "ObjectivePlaques", "BonusChoiceSlots", "StartMissionButton"],
    bindings: [
      ["campaignNode", "state.campaign.currentNodeId", "Current campaign mission node."],
      ["storyText", "localization.campaign[node].briefing", "Localized briefing/intermission text."],
      ["objectives", "registries.scenarios.byId[mission].objectives", "Victory and loss objective records."],
      ["bonusChoices", "state.ui.campaignNarrative.selectedBonus", "Local starting bonus choice."],
      ["carryover", "selectors.campaigns.currentCarryover", "Heroes/artifacts/resources carried into mission."],
    ],
    actions: [
      ["Select bonus", "`narrative.selectBonus`", "local-ui", "Current screen", "`SELECT_CAMPAIGN_BONUS`", "Updates local bonus draft."],
      ["Start mission", "`narrative.start`", "navigation", "`59-loading-screen`", "`START_CAMPAIGN_MISSION`", "Creates mission setup from campaign node."],
      ["Back", "`narrative.back`", "navigation", "`03-campaign-selection`", "`CLOSE_CAMPAIGN_BRIEFING`", "Returns before mission creation."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Campaign run", "Mission node", "Localization", "Objectives", "Narrative screen"],
      command: ["Bonus/start input", "Mission guard", "Start mission event", "Loading route", "Mission state"],
      animation: ["Text type", "Portrait fade", "Seal stamp", "Loading fade"],
    },
  },
  "05-intro-cinematic": {
    number: "05",
    title: "Intro / Outro Cinematics",
    system: "menus",
    archetype: "curated-cinematic",
    curation: "curated-pass-6",
    variant: "introCinematic",
    refs: [],
    description: "Presentation-only cinematic playback shell for intro, outro, credits, victory, defeat, and campaign story clips.",
    visual: "Letterboxed playback viewport with subtitle strip, small skip glyph, timeline beads, and no gameplay controls.",
    mechanics: "Resolves cinematic manifest, localization subtitles, audio cue, playback progress, and skip policy. It never mutates deterministic gameplay except route completion events.",
    animation: "Video/painted frames crossfade, subtitles type or fade by cue, timeline bead advances, and skip fades to the configured destination.",
    components: ["CinematicPlayer", "FrameViewport", "SubtitleStrip", "TimelineBeads", "SkipButton", "CompletionRouter"],
    bindings: [
      ["cinematicId", "state.ui.cinematic.cinematicId", "Manifest ID for the clip."],
      ["playbackState", "state.ui.cinematic.playback", "Client playback progress."],
      ["subtitles", "localization.cinematics[cinematicId]", "Subtitle cues."],
      ["skipAllowed", "config.ui.allowSkipCinematics", "Skip availability."],
      ["destination", "state.ui.cinematic.returnRoute", "Route after playback/skip."],
    ],
    actions: [
      ["Skip", "`cinematic.skip`", "navigation", "Configured destination", "`SKIP_CINEMATIC`", "Completes presentation route only."],
      ["Playback complete", "`cinematic.complete`", "navigation", "Configured destination", "`COMPLETE_CINEMATIC`", "Routes after final cue."],
      ["Toggle subtitles", "`cinematic.subtitles`", "local-ui", "Current screen", "`TOGGLE_CINEMATIC_SUBTITLES`", "Updates local presentation setting."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Cinematic manifest", "Subtitle localization", "Audio manifest", "Return route", "Player"],
      command: ["Skip/complete", "Route guard", "Presentation event", "Destination route", "Caller screen"],
      animation: ["Frame crossfade", "Subtitle cue", "Timeline bead", "Route fade"],
    },
  },
  "06-random-map-setup": {
    number: "06",
    title: "Random Map Generator Settings",
    system: "menus",
    archetype: "curated-rmg-setup",
    curation: "curated-pass-6",
    variant: "randomMapSetup",
    refs: [],
    description: "Random map generator setup for size, template, players, zones, water, monsters, teams, seed, and victory options.",
    visual: "Generator console with segmented controls, sliders, template list, seed field, player/team matrix, and Generate/Back buttons.",
    mechanics: "Edits an RMG draft only. Generate validates template compatibility, player slots, content packs, deterministic seed, and ruleset before building scenario data.",
    animation: "Sliders notch, template preview redraws, seed dice rolls, zone graph pulses, and Generate routes to loading/progress.",
    components: ["RandomMapSetup", "TemplateList", "SizeDifficultyControls", "PlayerTeamMatrix", "SeedField", "ZonePreview", "GenerateBackButtons"],
    bindings: [
      ["templateId", "state.ui.rmg.templateId", "Selected random map template."],
      ["mapSize", "state.ui.rmg.mapSize", "Small/medium/large/extra large dimensions."],
      ["players", "state.ui.rmg.players", "Player count, AI/human flags, teams."],
      ["seed", "state.ui.rmg.seed", "Explicit deterministic seed."],
      ["zonePreview", "selectors.rmg.templateZonePreview", "Preview graph for template and options."],
    ],
    actions: [
      ["Select template", "`rmg.selectTemplate`", "local-ui", "Current screen", "`SELECT_RMG_TEMPLATE`", "Updates zone preview."],
      ["Roll seed", "`rmg.rollSeed`", "local-ui", "Current screen", "`ROLL_RMG_SEED`", "Creates local deterministic seed draft."],
      ["Generate", "`rmg.generate`", "navigation", "`59-loading-screen`", "`GENERATE_RANDOM_MAP`", "Builds scenario data from validated draft."],
      ["Back", "`rmg.back`", "navigation", "`02-new-game-setup`", "`CLOSE_RANDOM_MAP_SETUP`", "Discards RMG draft."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["RMG templates", "Pack constraints", "Ruleset", "Draft options", "RMG setup"],
      command: ["Option/generate input", "Template validation", "Seeded generation", "Loading route", "Scenario record"],
      animation: ["Slider notch", "Preview redraw", "Dice roll", "Progress fade"],
    },
  },
  "54-system-menu": {
    number: "54",
    title: "System Menu",
    system: "system",
    archetype: "curated-system-menu",
    curation: "curated-pass-6",
    variant: "systemMenu",
    refs: [],
    description: "In-game system menu overlay for save, load, options, restart, main menu, and quit confirmation.",
    visual: "Compact stone command tablet centered over dimmed current gameplay screen with vertical beveled command buttons.",
    mechanics: "Routes to save/load/options/confirmation without mutating gameplay. Destructive actions require confirmation and preserve deterministic state until accepted.",
    animation: "Current screen darkens, tablet drops in, hovered command glows, and route buttons crossfade into child dialogs.",
    components: ["SystemMenu", "DimmedGameplayBackdrop", "CommandTablet", "SaveLoadButtons", "OptionsButton", "ConfirmRoutes"],
    bindings: [
      ["callerRoute", "state.ui.systemMenu.callerRoute", "Screen to resume."],
      ["canSave", "selectors.persistence.canSaveCurrentGame", "Save command availability."],
      ["canLoad", "selectors.persistence.hasLoadableSave", "Load command availability."],
      ["restartGuard", "selectors.session.restartGuard", "Restart disabled/confirm state."],
      ["dirtyDrafts", "state.ui.unsavedDrafts", "Local drafts needing discard confirmation."],
    ],
    actions: [
      ["Save Game", "`system.save`", "navigation", "`55-save-load`", "`OPEN_SAVE_GAME`", "Routes to save mode."],
      ["Load Game", "`system.load`", "navigation", "`55-save-load`", "`OPEN_LOAD_GAME`", "Routes to load mode."],
      ["Options", "`system.options`", "navigation", "`56-options`", "`OPEN_OPTIONS`", "Routes to settings."],
      ["Main Menu", "`system.mainMenu`", "navigation", "`60-confirmation-dialog`", "`REQUEST_RETURN_TO_MAIN_MENU`", "Requires confirmation."],
      ["Resume", "`system.resume`", "navigation", "Caller screen", "`CLOSE_SYSTEM_MENU`", "Returns to gameplay."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Caller route", "Save/load guards", "Session state", "Localized commands", "System menu"],
      command: ["Command click", "Route/confirm guard", "Child dialog route", "Optional confirm", "Caller/main route"],
      animation: ["Backdrop dim", "Tablet drop", "Button glow", "Dialog fade"],
    },
  },
  "55-save-load": {
    number: "55",
    title: "Save / Load",
    system: "system",
    archetype: "curated-save-load",
    curation: "curated-pass-6",
    variant: "saveLoad",
    refs: [],
    description: "Save/load slot browser with save metadata, compatibility checks, overwrite confirmation, and selected slot preview.",
    visual: "Ledger-style slot table with timestamp, scenario name, player, thumbnail, content hash status, mode tabs, and Save/Load/Delete/Back buttons.",
    mechanics: "Reads save manifests first. Loading validates schema version, content hashes, pack compatibility, ruleset version, and migration availability before hydrating state.",
    animation: "Slot rows slide, selected thumbnail resolves, compatibility seal stamps, overwrite/delete actions route through confirmation.",
    components: ["SaveLoadScreen", "ModeTabs", "SaveSlotTable", "SlotPreview", "CompatibilitySeal", "ActionButtons"],
    bindings: [
      ["mode", "state.ui.saveLoad.mode", "Save or load mode."],
      ["slots", "selectors.persistence.saveSlotManifests", "Save metadata list."],
      ["selectedSlot", "state.ui.saveLoad.selectedSlotId", "Local selected slot."],
      ["compatibility", "selectors.persistence.selectedSaveCompatibility", "Version/hash/migration result."],
      ["overwriteGuard", "selectors.persistence.overwriteGuard", "Overwrite availability and confirmation need."],
    ],
    actions: [
      ["Select slot", "`saveLoad.selectSlot`", "local-ui", "Current screen", "`SELECT_SAVE_SLOT`", "Updates preview and compatibility."],
      ["Save", "`saveLoad.save`", "command", "Current screen", "`SAVE_GAME_SLOT`", "Writes save manifest and payload after overwrite guard."],
      ["Load", "`saveLoad.load`", "navigation", "`59-loading-screen`", "`LOAD_GAME_SLOT`", "Validates and loads selected save."],
      ["Delete", "`saveLoad.delete`", "navigation", "`60-confirmation-dialog`", "`REQUEST_DELETE_SAVE_SLOT`", "Requires confirmation."],
      ["Back", "`saveLoad.back`", "navigation", "`54-system-menu` or `01-main-menu`", "`CLOSE_SAVE_LOAD`", "Returns to caller."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Save manifests", "Content hashes", "Schema versions", "Selected slot", "Save/load screen"],
      command: ["Slot/action input", "Compatibility guard", "Save/load/delete event", "Persistence adapter", "Caller/loading route"],
      animation: ["Rows slide", "Thumbnail resolve", "Seal stamp", "Confirm fade"],
    },
  },
  "56-options": {
    number: "56",
    title: "Options",
    system: "system",
    archetype: "curated-options",
    curation: "curated-pass-6",
    variant: "options",
    refs: [],
    description: "Options screen for audio, animation speed, combat settings, autosave, language, accessibility, and renderer scale.",
    visual: "Tabbed settings parchment with sliders, toggles, segmented buttons, key/action rows, Apply/Cancel defaults, and no gameplay explanation text.",
    mechanics: "Edits a settings draft. Apply validates config values, persists presentation settings, and only changes gameplay-affecting options at allowed setup boundaries.",
    animation: "Tab pages slide, slider knobs tick, toggles flip, Apply seal glows, and Cancel restores previous values.",
    components: ["OptionsScreen", "OptionsTabs", "SliderRows", "ToggleRows", "SegmentedControls", "ApplyCancelButtons"],
    bindings: [
      ["optionsDraft", "state.ui.options.draft", "Local editable settings copy."],
      ["audioConfig", "config.audio", "Music/SFX/voice values."],
      ["uiConfig", "config.ui", "Locale, animation speed, reduced motion, scale."],
      ["gameplayLocks", "selectors.options.gameplayConfigLocks", "Settings locked during active game."],
      ["dirty", "selectors.options.hasUnsavedChanges", "Apply enabled state."],
    ],
    actions: [
      ["Change tab", "`options.tab`", "local-ui", "Current screen", "`SET_OPTIONS_TAB`", "Changes visible category."],
      ["Adjust slider", "`options.slider`", "local-ui", "Current screen", "`SET_OPTIONS_DRAFT_VALUE`", "Updates draft value."],
      ["Apply", "`options.apply`", "command", "Current screen", "`APPLY_OPTIONS`", "Persists allowed settings."],
      ["Cancel", "`options.cancel`", "navigation", "Caller screen", "`CANCEL_OPTIONS`", "Discards draft."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Config store", "Caller locks", "Localization", "Options draft", "Options view"],
      command: ["Setting/apply input", "Config validation", "Apply command", "Persist settings", "Caller refresh"],
      animation: ["Tab slide", "Knob tick", "Toggle flip", "Apply glow"],
    },
  },
  "57-high-scores": {
    number: "57",
    title: "High Scores",
    system: "system",
    archetype: "curated-high-scores",
    curation: "curated-pass-6",
    variant: "highScores",
    refs: [],
    description: "High score ledger showing completed game rankings, player names, score, days, difficulty, scenario, and campaign medals.",
    visual: "Large stone-and-parchment ranking table with top-three plaques, filter tabs, selected score details, and Back button.",
    mechanics: "Reads profile score records and sorts deterministically by score/date tie-breakers. It is read-only except clearing/importing through confirmed profile actions.",
    animation: "Score rows cascade, top-three plaques glint, filter tabs turn pages, and new records pulse once after victory.",
    components: ["HighScores", "RankingTable", "MedalPlaques", "FilterTabs", "SelectedScoreDetails", "BackButton"],
    bindings: [
      ["scoreRecords", "state.profile.highScores", "Completed game score records."],
      ["filter", "state.ui.highScores.filter", "Scenario, campaign, difficulty, or all."],
      ["selectedRecord", "state.ui.highScores.selectedRecordId", "Local selected row."],
      ["sortOrder", "selectors.profile.sortedHighScores", "Deterministic ranking order."],
      ["newRecordId", "state.ui.highScores.newRecordId", "Optional highlight after victory."],
    ],
    actions: [
      ["Select row", "`scores.selectRow`", "local-ui", "Current screen", "`SELECT_HIGH_SCORE_ROW`", "Updates details panel."],
      ["Change filter", "`scores.filter`", "local-ui", "Current screen", "`SET_HIGH_SCORE_FILTER`", "Filters ranking table."],
      ["Back", "`scores.back`", "navigation", "`01-main-menu` or previous screen", "`CLOSE_HIGH_SCORES`", "Returns to caller."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Profile scores", "Filter draft", "Sort rules", "Selected row", "High score table"],
      command: ["Row/filter input", "Local selection", "Sorted view", "Optional details", "Caller return"],
      animation: ["Rows cascade", "Plaque glint", "Page turn", "New score pulse"],
    },
  },
  "58-week-month-popup": {
    number: "58",
    title: "Week / Month Popup",
    system: "system",
    archetype: "curated-week-month-popup",
    curation: "curated-pass-6",
    variant: "weekMonthPopup",
    refs: [],
    description: "Start-of-week/month announcement popup for growth changes, plague, month creature, resource events, and calendar transition.",
    visual: "Small parchment proclamation over adventure map with creature/event icon, calendar date, growth/resource effects, and OK button.",
    mechanics: "Appears after the calendar reducer advances and weekly/monthly events are already computed. OK only acknowledges visible results.",
    animation: "Proclamation unfurls, event icon bounces, growth numbers sparkle, and OK folds the parchment back to adventure map.",
    components: ["WeekMonthPopup", "CalendarHeader", "EventIcon", "EffectList", "OkButton"],
    bindings: [
      ["calendar", "state.calendar.currentDate", "Month/week/day after transition."],
      ["eventRecord", "state.calendar.pendingAnnouncement", "Week/month event to announce."],
      ["growthEffects", "selectors.calendar.visibleGrowthEffects", "Creature growth modifiers."],
      ["resourceEffects", "selectors.calendar.visibleResourceEffects", "Resource/income changes."],
      ["acknowledged", "state.ui.calendarAnnouncement.acknowledged", "Local acknowledgment state."],
    ],
    actions: [
      ["OK", "`calendarPopup.ok`", "navigation", "`07-adventure-map`", "`ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT`", "Clears pending UI announcement only."],
      ["Inspect creature", "`calendarPopup.inspectCreature`", "navigation", "`50-creature-info`", "`OPEN_CALENDAR_CREATURE_INFO`", "Shows creature info for month/week creature."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Calendar reducer result", "Event record", "Growth/resource selectors", "Announcement", "Popup"],
      command: ["OK/details input", "Ack/detail route", "UI announcement clear", "Map or info route", "Caller refresh"],
      animation: ["Unfurl", "Icon bounce", "Number sparkle", "Parchment fold"],
    },
  },
  "59-loading-screen": {
    number: "59",
    title: "Loading Screen",
    system: "system",
    archetype: "curated-loading-screen",
    curation: "curated-pass-6",
    variant: "loadingScreen",
    refs: [],
    description: "Loading/progress screen for scenario creation, save load, random map generation, asset warmup, and route handoff.",
    visual: "Full-screen illustrated loading plate with progress bar, current step text, small animated crest, and optional cancel/back on recoverable tasks.",
    mechanics: "Coordinates async presentation/content work while deterministic game state creation remains explicit and seed/hash based. Failures show localized recovery actions.",
    animation: "Progress bar fills by named task, crest rotates, background torch flickers, and successful load fades to destination screen.",
    components: ["LoadingScreen", "LoadingArtwork", "ProgressBar", "StepText", "AnimatedCrest", "RecoverableErrorPanel"],
    bindings: [
      ["loadingTask", "state.ui.loading.taskId", "Scenario generation, save load, asset warmup, or route."],
      ["progress", "state.ui.loading.progress", "Named step progress for presentation."],
      ["destination", "state.ui.loading.destinationRoute", "Route after load."],
      ["errors", "state.ui.loading.errors", "Recoverable validation or IO errors."],
      ["contentHashes", "state.ui.loading.contentHashes", "Pack/hash data for deterministic load."],
    ],
    actions: [
      ["Cancel", "`loading.cancel`", "navigation", "Configured fallback", "`CANCEL_LOADING_TASK`", "Cancels only recoverable tasks."],
      ["Retry", "`loading.retry`", "local-ui", "Current screen", "`RETRY_LOADING_STEP`", "Retries failed IO/presentation step."],
      ["Complete", "`loading.complete`", "navigation", "Configured destination", "`COMPLETE_LOADING_TASK`", "Routes when all required data is ready."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Task request", "Content hashes", "Asset warmup", "State creation/load", "Destination route"],
      command: ["Progress/error event", "Recovery guard", "Retry/cancel/complete", "Route handoff", "Destination screen"],
      animation: ["Bar fill", "Crest rotate", "Torch flicker", "Fade out"],
    },
  },
  "60-confirmation-dialog": {
    number: "60",
    title: "Confirmation Dialog",
    system: "system",
    archetype: "curated-confirmation-dialog",
    curation: "curated-pass-6",
    variant: "confirmationDialog",
    refs: [],
    description: "Reusable confirmation dialog for destructive, irreversible, or route-changing actions.",
    visual: "Small centered red-bronze modal over dimmed caller screen with icon, localized prompt, Confirm/Cancel buttons, and caller-specific warning line.",
    mechanics: "Executes only the pending confirmed event supplied by caller. Dialog itself has no gameplay logic beyond confirm/cancel routing.",
    animation: "Modal pops in, warning icon pulses, Confirm button depresses, and accepted action plays caller-provided transition animation.",
    components: ["ConfirmationDialog", "DimmedCaller", "WarningIcon", "PromptText", "ConfirmCancelButtons"],
    bindings: [
      ["pendingAction", "state.ui.confirmation.pendingAction", "Action/event awaiting confirmation."],
      ["promptKey", "state.ui.confirmation.promptKey", "Localized prompt key."],
      ["callerRoute", "state.ui.confirmation.callerRoute", "Screen to return on cancel."],
      ["confirmPayload", "state.ui.confirmation.payload", "Stable IDs/scalars passed on confirm."],
      ["severity", "state.ui.confirmation.severity", "Warning styling only."],
    ],
    actions: [
      ["Confirm", "`confirm.accept`", "command", "Pending destination", "`CONFIRM_PENDING_ACTION`", "Dispatches caller-provided command/event."],
      ["Cancel", "`confirm.cancel`", "navigation", "Caller screen", "`CANCEL_PENDING_CONFIRMATION`", "Clears pending action without mutation."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Caller request", "Prompt localization", "Pending payload", "Severity", "Dialog"],
      command: ["Confirm/cancel input", "Pending action guard", "Dispatch or clear", "Destination/caller route", "Caller refresh"],
      animation: ["Modal pop", "Icon pulse", "Button depress", "Caller transition"],
    },
  },
  "61-ai-turn-indicator": {
    number: "61",
    title: "AI Turn Indicator",
    system: "system",
    archetype: "curated-ai-turn-indicator",
    curation: "curated-pass-6",
    variant: "aiTurnIndicator",
    refs: [],
    description: "AI turn overlay showing active AI color, visible thinking/progress state, optional fast-forward, and turn-result messages.",
    visual: "Adventure map is dimmed behind a compact banner with player color crest, progress beads, current AI activity text, and speed/skip controls.",
    mechanics: "The overlay observes AI command generation and replay application. It never makes decisions; deterministic AI commands are applied through the same command bus.",
    animation: "Player crest rotates, progress beads advance per command batch, camera pans to visible AI actions, and turn end fades back to player control.",
    components: ["AiTurnIndicator", "DimmedAdventureMap", "PlayerCrest", "ProgressBeads", "ActivityText", "SpeedControls"],
    bindings: [
      ["aiPlayer", "state.turn.activePlayerId", "AI player currently acting."],
      ["aiPhase", "state.ai.currentPhase", "Planning, moving, combat, town, or done."],
      ["commandBatch", "state.ai.visibleCommandBatch", "Commands currently being replayed."],
      ["speed", "config.ui.aiTurnSpeed", "Presentation speed only."],
      ["interruptGuard", "selectors.ai.canFastForwardOrPause", "Pause/fast-forward availability."],
    ],
    actions: [
      ["Change speed", "`aiTurn.speed`", "local-ui", "Current screen", "`SET_AI_TURN_SPEED`", "Changes presentation speed."],
      ["Fast-forward", "`aiTurn.fastForward`", "local-ui", "Current screen", "`FAST_FORWARD_AI_TURN_PRESENTATION`", "Skips nonessential animation only."],
      ["AI turn complete", "`aiTurn.complete`", "navigation", "`07-adventure-map`", "`COMPLETE_AI_TURN_PRESENTATION`", "Returns to active human player."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Turn manager", "AI command generator", "Command replay", "Visible actions", "AI overlay"],
      command: ["Speed/complete event", "Presentation guard", "Replay commands", "Turn transition", "Human map return"],
      animation: ["Crest rotate", "Bead advance", "Camera pan", "Fade back"],
    },
  },
  "62-multiplayer-setup": {
    number: "62",
    title: "Multiplayer Setup",
    system: "multiplayer",
    archetype: "curated-multiplayer-setup",
    curation: "curated-pass-6",
    variant: "multiplayerSetup",
    refs: [],
    description: "Multiplayer setup for hotseat, LAN/online lobby, player colors, teams, timers, map/scenario, and deterministic content lock.",
    visual: "Blue-stone lobby setup table with player color banners, connection type tabs, map preview, timer options, and Host/Join/Back buttons.",
    mechanics: "Creates a multiplayer setup draft, validates identical content hashes/ruleset, assigns player slots, and routes to hotseat handoff or network lobby.",
    animation: "Player banners flip, ready seals stamp, content hash lock glows, and Host/Join opens the correct lobby route.",
    components: ["MultiplayerSetup", "ConnectionTypeTabs", "PlayerSlotTable", "MapPreview", "TimerOptions", "ContentHashLock", "HostJoinButtons"],
    bindings: [
      ["connectionType", "state.ui.multiplayer.connectionType", "Hotseat, LAN, online, or direct."],
      ["playerSlots", "state.ui.multiplayer.playerSlots", "Player colors, teams, control type, ready flags."],
      ["selectedScenario", "state.ui.multiplayer.scenarioId", "Scenario/map draft."],
      ["timerConfig", "state.ui.multiplayer.timer", "Turn timer draft."],
      ["contentHash", "selectors.multiplayer.contentCompatibilityHash", "Pack/ruleset compatibility hash."],
    ],
    actions: [
      ["Set connection type", "`mpSetup.connectionType`", "local-ui", "Current screen", "`SET_MULTIPLAYER_CONNECTION_TYPE`", "Changes setup draft."],
      ["Edit slot", "`mpSetup.editSlot`", "local-ui", "Current screen", "`EDIT_MULTIPLAYER_SLOT`", "Updates player slot draft."],
      ["Host", "`mpSetup.host`", "navigation", "`64-network-lobby` or `63-hotseat-turn-handoff`", "`HOST_MULTIPLAYER_SESSION`", "Creates session or hotseat game draft."],
      ["Join", "`mpSetup.join`", "navigation", "`64-network-lobby`", "`JOIN_MULTIPLAYER_SESSION`", "Routes to network lobby."],
      ["Back", "`mpSetup.back`", "navigation", "`02-new-game-setup`", "`CLOSE_MULTIPLAYER_SETUP`", "Discards draft."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Scenario index", "Connection settings", "Player slots", "Content hashes", "Multiplayer setup"],
      command: ["Slot/host/join input", "Compatibility guard", "Session event", "Lobby/hotseat route", "Session state"],
      animation: ["Banner flip", "Ready stamp", "Hash glow", "Lobby fade"],
    },
  },
  "63-hotseat-turn-handoff": {
    number: "63",
    title: "Hotseat Turn Handoff",
    system: "multiplayer",
    archetype: "curated-hotseat-handoff",
    curation: "curated-pass-6",
    variant: "hotseatHandoff",
    refs: [],
    description: "Privacy handoff screen between hotseat players, hiding the map until the next player confirms readiness.",
    visual: "Full-screen player color banner and shield over a covered map, with next player name, turn date, privacy warning, and Begin Turn button.",
    mechanics: "Appears only after turn transition commits. Begin reveals the next player view; no game commands are allowed while covered.",
    animation: "Previous map shutters closed, next color banner unfurls, shield pulses, and Begin opens shutters to adventure map.",
    components: ["HotseatTurnHandoff", "PrivacyCover", "PlayerColorBanner", "TurnDatePlaque", "BeginTurnButton"],
    bindings: [
      ["nextPlayer", "state.turn.activePlayerId", "Player whose turn is about to be shown."],
      ["calendar", "state.calendar.currentDate", "Current turn date."],
      ["privacyCover", "state.ui.hotseat.coverActive", "Map hidden state."],
      ["playerName", "state.players.byId[next].displayName", "Localized/player-entered name."],
      ["pendingAnnouncements", "selectors.turn.pendingStartOfTurnAnnouncements", "Week/month or event popups after begin."],
    ],
    actions: [
      ["Begin turn", "`hotseat.begin`", "navigation", "`07-adventure-map` or pending popup", "`BEGIN_HOTSEAT_TURN`", "Clears privacy cover and shows next player state."],
      ["Open options", "`hotseat.options`", "navigation", "`56-options`", "`OPEN_OPTIONS_FROM_HANDOFF`", "Allows presentation settings before reveal."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Turn transition", "Next player", "Calendar", "Privacy cover", "Handoff screen"],
      command: ["Begin input", "Cover guard", "Begin turn event", "Announcement or map route", "Player control"],
      animation: ["Shutters close", "Banner unfurl", "Shield pulse", "Shutters open"],
    },
  },
  "64-network-lobby": {
    number: "64",
    title: "Network Lobby",
    system: "multiplayer",
    archetype: "curated-network-lobby",
    curation: "curated-pass-6",
    variant: "networkLobby",
    refs: [],
    description: "Network lobby for hosted/joined multiplayer sessions, ready state, chat, content hash checks, slot assignment, and launch.",
    visual: "Lobby table with player list, color/team slots, ready seals, chat parchment, content compatibility panel, and Launch/Leave buttons.",
    mechanics: "Lobby state mirrors authoritative host/session messages. Launch is enabled only when content hashes, slots, scenario, teams, and ready state all match.",
    animation: "Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading.",
    components: ["NetworkLobby", "SessionHeader", "PlayerSlotList", "ReadyStateSeals", "ChatPanel", "ContentCompatibilityPanel", "LaunchLeaveButtons"],
    bindings: [
      ["sessionId", "state.net.sessionId", "Network session identifier."],
      ["players", "state.net.lobby.players", "Connected players and slot assignment."],
      ["chatMessages", "state.net.lobby.chat", "Lobby chat log."],
      ["compatibility", "selectors.net.lobbyCompatibility", "Hash/version/ruleset match result."],
      ["launchGuard", "selectors.net.canLaunchSession", "All ready and compatible."],
    ],
    actions: [
      ["Toggle ready", "`network.ready`", "command", "Current screen", "`SET_LOBBY_READY`", "Sends ready state to host/session."],
      ["Send chat", "`network.chat`", "command", "Current screen", "`SEND_LOBBY_CHAT`", "Sends chat message."],
      ["Change slot", "`network.slot`", "command", "Current screen", "`REQUEST_LOBBY_SLOT_CHANGE`", "Requests color/team/control slot change."],
      ["Launch", "`network.launch`", "navigation", "`59-loading-screen`", "`LAUNCH_NETWORK_GAME`", "Host starts deterministic session."],
      ["Leave", "`network.leave`", "navigation", "`62-multiplayer-setup`", "`LEAVE_NETWORK_LOBBY`", "Disconnects or leaves lobby."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Session connection", "Lobby snapshot", "Content hashes", "Ready states", "Network lobby"],
      command: ["Ready/chat/launch input", "Host/session guard", "Network event", "Snapshot update", "Loading/leave route"],
      animation: ["Rows slide", "Seal stamp", "Chat scroll", "Mismatch flash"],
    },
  },
  "65-map-editor": {
    number: "65",
    title: "Map Editor",
    system: "editor",
    archetype: "curated-map-editor",
    curation: "curated-pass-6",
    variant: "mapEditor",
    refs: [],
    description: "Map editor shell with terrain/object palettes, brush tools, layers, scenario properties, validation, and save/export controls.",
    visual: "Editor workspace with map canvas center, terrain/object palette left, properties inspector right, tool ribbon top, minimap and validation drawer bottom.",
    mechanics: "Edits scenario authoring data, not runtime gameplay state. Save validates schema records, stable IDs, object rules, starting positions, objectives, and asset references.",
    animation: "Brush preview follows cursor, object stamp bounces, invalid cells crosshatch red, validation drawer slides up, and saved status seal glows.",
    components: ["MapEditor", "ToolRibbon", "MapCanvas", "TerrainPalette", "ObjectPalette", "PropertiesInspector", "ValidationDrawer", "SaveExportButtons"],
    bindings: [
      ["editorDocument", "state.editor.currentDocument", "Scenario draft document."],
      ["selectedTool", "state.editor.selectedTool", "Brush, object, erase, road, river, zone, properties."],
      ["selectedLayer", "state.editor.selectedLayer", "Surface, underground, objects, events, regions."],
      ["selection", "state.editor.selection", "Selected tile/object/region."],
      ["validationIssues", "selectors.editor.validationIssues", "Schema and scenario rule issues."],
    ],
    actions: [
      ["Select tool", "`editor.selectTool`", "local-ui", "Current screen", "`SELECT_EDITOR_TOOL`", "Changes active editing tool."],
      ["Paint tile", "`editor.paintTile`", "command", "Current screen", "`APPLY_EDITOR_BRUSH`", "Mutates editor draft document."],
      ["Place object", "`editor.placeObject`", "command", "Current screen", "`PLACE_EDITOR_OBJECT`", "Adds object record with stable ID."],
      ["Validate", "`editor.validate`", "local-ui", "Current screen", "`VALIDATE_EDITOR_DOCUMENT`", "Refreshes validation drawer."],
      ["Save", "`editor.save`", "command", "Current screen", "`SAVE_EDITOR_SCENARIO`", "Writes scenario draft after validation guard."],
    ],
    html: shellExtendedHtml,
    diagram: {
      load: ["Editor document", "Terrain/object registries", "Tool state", "Validation rules", "Editor workspace"],
      command: ["Tool/canvas/save input", "Editor guard", "Document command", "Validation refresh", "Save/export"],
      animation: ["Brush preview", "Object bounce", "Invalid crosshatch", "Drawer slide"],
    },
  },
};

Object.assign(screens, shellPass6);

function esc(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function attr(s) {
  return esc(s).replaceAll('"', "&quot;");
}

function page(screen, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(screen.number)}. ${esc(screen.title)} - Curated UI Mockup</title>
<style>${COMMON_CSS}</style>
</head>
<body data-screen="${attr(screen.id)}" data-archetype="${attr(screen.archetype)}" data-curation="${attr(screen.curation || "anchor-v1")}">
<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${attr(screen.title)} mockup">
  <defs>
    <filter id="glow"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#ffe784" flood-opacity=".8"/></filter>
    <filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000" flood-opacity=".5"/></filter>
    <linearGradient id="bronze" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a421c"/><stop offset=".5" stop-color="#2a160b"/><stop offset="1" stop-color="#9a6525"/></linearGradient>
    <linearGradient id="redwood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8c1512"/><stop offset=".45" stop-color="#3b0a08"/><stop offset="1" stop-color="#a22918"/></linearGradient>
    <pattern id="stone" width="48" height="48" patternUnits="userSpaceOnUse"><rect width="48" height="48" fill="#2d2419"/><path d="M0 12 H48 M14 0 V48 M36 0 V48" stroke="#4c3a23" stroke-width="1"/></pattern>
    <pattern id="fog" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="#050404"/><circle cx="18" cy="18" r="17" fill="#111019"/></pattern>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#ffe784"/></marker>
  </defs>
${body}
</svg>
</body>
</html>
`;
}

function ornateFrame(x = 6, y = 6, w = 788, h = 588) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#bronze)" stroke="#090604" stroke-width="3"/>
  <rect x="${x + 7}" y="${y + 7}" width="${w - 14}" height="${h - 14}" fill="none" stroke="#f0cf69" stroke-width="2"/>
  <rect x="${x + 15}" y="${y + 15}" width="${w - 30}" height="${h - 30}" fill="none" stroke="#35170c" stroke-width="2"/>`;
}

function button(x, y, w, h, label, action) {
  return `<g class="button" data-action="${attr(action)}">
    <rect class="outer" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>
    <rect class="inner" x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="1"/>
    <text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle">${esc(label)}</text>
  </g>`;
}

function resourceBar(y = 568) {
  const items = [["Wood", 24], ["Ore", 12], ["Merc", 24], ["Sul", 11], ["Cry", 11], ["Kaelis", 11], ["Gold", 201092]];
  return `<g data-component="ResourceDateBar">
    ${items.map(([name, value], i) => {
      const x = 12 + i * 84;
      const w = i === 6 ? 118 : 76;
      return `<rect x="${x}" y="${y}" width="${w}" height="22" class="resource"/><text x="${x + 8}" y="${y + 15}" class="tiny">${name} ${value}</text>`;
    }).join("")}
    <rect x="640" y="${y}" width="148" height="22" class="resource"/><text x="650" y="${y + 15}" class="tiny">Month 1, Week 1, Day 2</text>
  </g>`;
}

function armySlots(x, y, label, color) {
  return `<g data-component="${attr(label)}"><text x="${x}" y="${y - 8}" class="label">${esc(label)}</text>
    ${Array.from({ length: 7 }, (_, i) => {
      const sx = x + i * 54;
      const count = [52, 6, 4, 16, 31, 8, 28][i];
      return `<rect x="${sx}" y="${y}" width="48" height="42" class="${i === 0 ? "slotHot" : "slot"}"/><circle cx="${sx + 24}" cy="${y + 18}" r="12" fill="${color}" stroke="#e0c36c"/><text x="${sx + 26}" y="${y + 38}" text-anchor="middle" class="tiny">${count}</text>`;
    }).join("")}
  </g>`;
}

function hexGrid(x, y, cols = 13, rows = 9) {
  const r = 18;
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cx = x + col * 42 + (row % 2) * 21;
      const cy = y + row * 35;
      const pts = [[cx, cy - r], [cx + 18, cy - 9], [cx + 18, cy + 9], [cx, cy + r], [cx - 18, cy + 9], [cx - 18, cy - 9]].map((p) => p.join(",")).join(" ");
      cells.push(`<polygon points="${pts}" class="hex"/>`);
    }
  }
  return cells.join("");
}

function terrainObjects() {
  return `<g data-component="ObjectLayer">
    <path d="M38 448 C190 332 336 462 548 318" fill="none" stroke="#30587c" stroke-width="34" opacity=".72"/>
    <path d="M76 94 C230 56 324 126 514 72" fill="none" stroke="#6d5534" stroke-width="22" opacity=".75"/>
    ${[[90, 122, "Mine", "#8a6e24"], [212, 342, "Town", "#5b1b19"], [318, 240, "Hero", "#244d86"], [450, 158, "Mon", "#5d241c"], [490, 360, "Tre", "#b38f2a"]].map(([x, y, t, c]) => `<g data-map-object="${t}"><rect x="${x}" y="${y}" width="42" height="42" fill="${c}" stroke="#f0d06a"/><text x="${x + 21}" y="${y + 26}" text-anchor="middle" class="tiny">${t}</text></g>`).join("")}
    <path class="path" d="M338 260 C378 232 410 190 470 178"/>
  </g>`;
}

function menuHtml(screen) {
  const body = `${ornateFrame()}
  <rect x="22" y="22" width="756" height="556" fill="#10221f"/>
  <path d="M22 448 C164 312 118 172 296 92 C456 20 560 116 778 52 L778 578 L22 578Z" fill="#26382f"/>
  <path d="M22 520 C178 410 362 438 548 306 C658 228 722 276 778 208 L778 578 L22 578Z" fill="#49311d"/>
  <path d="M108 328 C170 206 238 180 312 232 C382 282 436 238 502 180 C438 320 338 394 210 404 Z" fill="#781e17" opacity=".78"/>
  <path d="M126 370 C230 260 334 316 452 240" fill="none" stroke="#c07131" stroke-width="20" opacity=".75"/>
  <text x="78" y="93" class="huge">HEROES</text><text x="118" y="137" class="title">REFORGED</text>
  <text x="82" y="170" class="label">AI Realms</text>
  <g data-component="CommandStack" filter="url(#shadow)">
    ${button(560, 82, 166, 44, "NEW GAME", "mainMenu.newGame")}
    ${button(560, 160, 166, 44, "LOAD GAME", "mainMenu.loadGame")}
    ${button(560, 238, 166, 44, "HIGH SCORE", "mainMenu.highScore")}
    ${button(560, 316, 166, 44, "CREDITS", "mainMenu.credits")}
    ${button(560, 442, 166, 44, "QUIT", "mainMenu.quit")}
  </g>
  <circle cx="538" cy="104" r="24" fill="#273f2c" stroke="#d3ac45"/><path d="M526 104 L550 92 L550 116 Z" fill="#ffe18a"/>
  <circle cx="538" cy="182" r="24" fill="#2d3a4e" stroke="#d3ac45"/><path d="M524 188 C536 170 548 170 560 188" fill="none" stroke="#ffe18a" stroke-width="5"/>
  <circle cx="538" cy="260" r="24" fill="#661818" stroke="#d3ac45"/><path d="M526 276 L538 242 L550 276" fill="#ffe18a"/>
  <text x="40" y="558" class="tiny">v0 shell - presentation only</text>`;
  return page(screen, body);
}

function adventureHtml(screen) {
  const body = `${ornateFrame()}
  <rect x="18" y="18" width="590" height="528" fill="#384b24" stroke="#e4c461" stroke-width="2" data-component="MapViewport"/>
  <g opacity=".45">${Array.from({ length: 15 }, (_, i) => `<path d="M${18 + i * 42} 18 L${i * 36} 546" stroke="#5d6f32"/>`).join("")}</g>
  ${terrainObjects()}
  <rect x="18" y="18" width="590" height="528" fill="url(#fog)" opacity=".18" data-component="FogMask"/>
  <rect x="608" y="18" width="174" height="528" class="rightChrome" data-component="RightCommandPanel"/>
  <rect x="624" y="36" width="140" height="118" fill="#183b25" stroke="#e1bc58"/><rect x="660" y="74" width="48" height="36" fill="none" stroke="#ffec85" stroke-width="2" class="pulse"/><text x="694" y="142" class="tiny">MINIMAP</text>
  ${["Kaelis", "Lorelei", "Yog", "Crag"].map((n, i) => `<rect x="626" y="${170 + i * 40}" width="44" height="34" class="${i === 0 ? "slotHot" : "slot"}"/><text x="680" y="${191 + i * 40}" class="tiny">${n}</text>`).join("")}
  <g data-component="CommandButtons">
    ${button(690, 170, 32, 28, "T", "adventure.openTown")}
    ${button(730, 170, 32, 28, "K", "adventure.kingdom")}
    ${button(690, 208, 32, 28, "S", "adventure.castSpell")}
    ${button(730, 208, 32, 28, "Q", "adventure.questLog")}
    ${button(690, 246, 32, 28, "Z", "adventure.sleep")}
    ${button(730, 246, 32, 28, "E", "adventure.endTurn")}
  </g>
  <rect x="624" y="330" width="140" height="140" class="panel"/><rect x="638" y="344" width="50" height="50" class="slotHot"/><text x="700" y="362" class="label">Kaelis</text><text x="700" y="383" class="tiny">Move 1200</text><text x="700" y="402" class="tiny">Mana 25/25</text>
  ${Array.from({ length: 7 }, (_, i) => `<rect x="${632 + (i % 4) * 31}" y="${412 + Math.floor(i / 4) * 31}" width="26" height="26" class="slot"/><text x="${645 + (i % 4) * 31}" y="${430 + Math.floor(i / 4) * 31}" text-anchor="middle" class="tiny">${[53,40,7,26,4,154,3][i]}</text>`).join("")}
  <rect x="18" y="546" width="764" height="22" class="status"/><text x="28" y="561" class="tiny">A mounted hero waits. Right-click objects for details; double-click path to move.</text>
  ${resourceBar(570)}`;
  return page(screen, body);
}

function adventureStateBackdrop(statusText) {
  return `${ornateFrame()}
  <rect x="18" y="18" width="590" height="528" fill="#384b24" stroke="#e4c461" stroke-width="2" data-component="MapViewport"/>
  <g opacity=".36">${Array.from({ length: 14 }, (_, i) => `<path d="M${18 + i * 46} 18 L${i * 34} 546" stroke="#64753b"/>`).join("")}</g>
  ${terrainObjects()}
  <rect x="18" y="18" width="590" height="528" fill="url(#fog)" opacity=".20" data-component="FogMask"/>
  <rect x="608" y="18" width="174" height="528" class="rightChrome" data-component="RightCommandPanel"/>
  <rect x="624" y="36" width="140" height="118" fill="#183b25" stroke="#e1bc58"/><rect x="660" y="74" width="48" height="36" fill="none" stroke="#ffec85" stroke-width="2"/><text x="694" y="142" class="tiny">MINIMAP</text>
  ${["Kaelis", "Rowan", "Veyra", "Tamsin"].map((n, i) => `<rect x="626" y="${172 + i * 38}" width="44" height="32" class="${i === 0 ? "slotHot" : "slot"}"/><text x="680" y="${192 + i * 38}" class="tiny">${n}</text>`).join("")}
  <rect x="624" y="332" width="140" height="126" class="panel"/><rect x="638" y="346" width="50" height="50" class="slotHot"/><text x="700" y="364" class="label">Kaelis</text><text x="700" y="384" class="tiny">Move 1200</text><text x="700" y="404" class="tiny">Mana 25/25</text>
  <rect x="18" y="546" width="764" height="22" class="status"/><text x="28" y="561" class="tiny">${esc(statusText)}</text>
  ${resourceBar(570)}`;
}

function adventureDialogFrame(title, subtitle = "") {
  return `<rect x="108" y="70" width="560" height="418" class="panel modal" filter="url(#shadow)"/>
  <rect x="126" y="88" width="524" height="36" fill="url(#redwood)" stroke="#e4c064"/>
  <text x="388" y="112" text-anchor="middle" class="label">${esc(title)}</text>
  ${subtitle ? `<text x="388" y="142" text-anchor="middle" class="tiny">${esc(subtitle)}</text>` : ""}`;
}

function adventureStateHtml(screen) {
  let overlay = "";
  if (screen.variant === "kingdomOverview") {
    overlay = `${adventureDialogFrame("Kingdom Overview", "Towns, heroes, income, and strategic warnings")}
      <rect x="134" y="160" width="244" height="218" class="redPanel"/><text x="152" y="184" class="label">Towns</text>
      ${rowList(["Castle   Capitol   +9000", "Rampart  Fort      +2000", "Tower    Build ready", "Inferno   Under threat"], 150, 202, 206, 26)}
      <rect x="400" y="160" width="244" height="218" class="redPanel"/><text x="418" y="184" class="label">Heroes</text>
      ${rowList(["Kaelis       1200 mp", "Rowan      idle", "Veyra     mana 18", "Tamsin      guarding"], 416, 202, 206, 26)}
      <rect x="146" y="402" width="386" height="40" class="status"/><text x="162" y="426" class="tiny">Daily income: +9000 gold, +3 wood, +2 ore, +1 gems</text>
      ${button(544, 400, 86, 30, "FOCUS", "kingdom.focusMap")}${button(544, 438, 86, 30, "CLOSE", "kingdom.close")}`;
  } else if (screen.variant === "mapObjectDialog") {
    overlay = `${adventureDialogFrame("Witch Hut", "A skilled witch offers to teach a secondary skill.")}
      <rect x="142" y="166" width="126" height="126" class="slotHot"/><circle cx="205" cy="229" r="42" fill="#46351f" stroke="#ffe18a"/><text x="205" y="235" text-anchor="middle" class="label">Hut</text>
      <rect x="292" y="166" width="330" height="150" class="status"/><text x="314" y="196" class="small">The old witch studies your hero.</text><text x="314" y="226" class="tiny">Requirement: empty skill slot or upgrade path</text><text x="314" y="252" class="tiny">Reward preview: Basic Wisdom</text><text x="314" y="278" class="tiny">Visited by this hero: no</text>
      ${smallSlots(["Skill", "XP", "Gold", "Quest"], 166, 332, 4, 58, 42)}
      ${button(428, 414, 78, 30, "ACCEPT", "mapObject.accept")}${button(522, 414, 78, 30, "DECLINE", "mapObject.decline")}`;
  } else if (screen.variant === "puzzleMap") {
    const tiles = Array.from({ length: 48 }, (_, i) => {
      const x = 152 + (i % 8) * 54;
      const y = 134 + Math.floor(i / 8) * 44;
      const revealed = [2, 5, 9, 11, 18, 19, 25, 33, 41].includes(i);
      return `<rect x="${x}" y="${y}" width="48" height="38" class="${revealed ? "slotHot" : "slot"}" opacity="${revealed ? ".95" : ".55"}"/><text x="${x + 24}" y="${y + 24}" text-anchor="middle" class="tiny">${revealed ? "clue" : "?"}</text>`;
    }).join("");
    overlay = `<rect x="94" y="52" width="612" height="462" fill="#b98b4c" stroke="#3c1d0d" stroke-width="5" class="modal" filter="url(#shadow)"/>
      <path d="M120 80 C236 48 350 76 452 60 C564 44 636 86 680 72 L680 486 C558 458 438 482 320 466 C210 452 150 486 120 466 Z" fill="#d1ad70" stroke="#6b3d1a"/>
      <text x="400" y="104" text-anchor="middle" class="label">Puzzle Map - Obelisks 3 / 12</text>
      ${tiles}
      <rect x="152" y="414" width="324" height="40" class="status"/><text x="168" y="438" class="tiny">Selected clue hints at grassland north of a red border guard.</text>
      ${button(512, 410, 74, 30, "JUMP", "puzzle.jumpToMap")}${button(598, 410, 74, 30, "CLOSE", "puzzle.close")}`;
  } else if (screen.variant === "questLog") {
    overlay = `<rect x="74" y="54" width="652" height="444" rx="16" fill="#bd9358" stroke="#3a1b0d" stroke-width="5" class="modal" filter="url(#shadow)"/>
      <path d="M104 88 C214 58 300 80 384 98 L384 468 C290 446 198 444 104 472 Z" fill="#d5b474" stroke="#6b3d1a"/>
      <path d="M416 98 C500 80 586 58 696 88 L696 472 C602 444 510 446 416 468 Z" fill="#d0aa69" stroke="#6b3d1a"/>
      <text x="246" y="122" text-anchor="middle" class="label">Active Quests</text>
      ${rowList(["Return Angel Wings", "Bring 20 Kaeliss", "Defeat the Dragon", "Visit all Obelisks"], 130, 148, 210, 28)}
      <text x="554" y="122" text-anchor="middle" class="label">Details</text>
      <rect x="448" y="150" width="204" height="154" class="status"/><text x="466" y="176" class="tiny">Source: Seer's Hut</text><text x="466" y="202" class="tiny">Requirement: Angel Wings</text><text x="466" y="228" class="tiny">Reward: +3 Attack</text><text x="466" y="254" class="tiny">Deadline: none</text>
      ${smallSlots(["Gold", "Attack", "XP"], 460, 328, 3, 52, 36)}
      ${button(480, 424, 84, 30, "SOURCE", "questLog.showSource")}${button(582, 424, 84, 30, "CLOSE", "questLog.close")}`;
  } else if (screen.variant === "creatureBankLoot") {
    overlay = `${adventureDialogFrame("Creature Bank Cleared", "Victory reward is ready to collect")}
      <rect x="136" y="158" width="142" height="198" class="redPanel"/><text x="164" y="184" class="label">Guards</text>${smallSlots(["Hags", "Orcs", "Ogres"], 156, 208, 1, 74, 34)}
      <rect x="304" y="158" width="184" height="198" fill="#2b180e" stroke="#e0bd59"/><text x="354" y="184" class="label">Reward</text><rect x="350" y="214" width="92" height="66" class="slotHot pulse"/><text x="396" y="252" text-anchor="middle" class="label">Chest</text>${smallSlots(["Gold", "Kaeliss", "Artifact"], 316, 304, 3, 48, 34)}
      <rect x="514" y="158" width="122" height="198" class="status"/><text x="532" y="184" class="tiny">Losses</text><text x="532" y="212" class="tiny">Pikemen -12</text><text x="532" y="238" class="tiny">Archers -4</text><text x="532" y="264" class="tiny">Visited: no</text>
      ${button(446, 420, 86, 30, "COLLECT", "bankLoot.collect")}${button(546, 420, 74, 30, "CLOSE", "bankLoot.close")}`;
  } else if (screen.variant === "hillFort") {
    overlay = `${adventureDialogFrame("Hill Fort", "Upgrade eligible stacks")}
      <text x="180" y="170" class="label">Current</text><text x="524" y="170" class="label">Upgrade To</text>
      ${smallSlots(["Pike", "Arch", "Sword", "Monk"], 144, 196, 1, 70, 38)}
      ${smallSlots(["Halb", "Marks", "Crus", "Zeal"], 510, 196, 1, 70, 38)}
      ${[210, 282, 354, 426].map((y) => `<path d="M238 ${y} C330 ${y - 30} 396 ${y - 30} 488 ${y}" fill="none" stroke="#ffe784" stroke-width="3" marker-end="url(#arrow)" class="pulse"/>`).join("")}
      <rect x="286" y="342" width="200" height="64" class="status"/><text x="306" y="368" class="tiny">Selected: Swordsmen -> Crusaders</text><text x="306" y="390" class="tiny">Cost: 2400 gold</text>
      ${button(302, 430, 82, 30, "UPGRADE", "hillFort.upgradeSelected")}${button(398, 430, 82, 30, "ALL", "hillFort.upgradeAll")}${button(494, 430, 82, 30, "CLOSE", "hillFort.close")}`;
  } else if (screen.variant === "warMachineFactory") {
    overlay = `${adventureDialogFrame("War Machine Factory", "Buy siege and support machines")}
      <rect x="136" y="160" width="324" height="220" class="redPanel"/><text x="158" y="184" class="label">Workshop</text>
      ${smallSlots(["Ballista", "Ammo", "Tent", "Catapult"], 160, 212, 2, 104, 54, 20)}
      <rect x="492" y="160" width="132" height="220" class="status"/><text x="512" y="186" class="label">Hero Rack</text>${smallSlots(["Owned", "Empty", "Empty"], 520, 214, 1, 72, 34)}
      <rect x="176" y="408" width="280" height="38" class="status"/><text x="194" y="432" class="tiny">Selected Ballista - price 2500 gold - slot free.</text>
      ${button(478, 408, 68, 30, "BUY", "warFactory.buy")}${button(558, 408, 76, 30, "CLOSE", "warFactory.close")}`;
  } else if (screen.variant === "undergroundToggle") {
    overlay = `<rect x="86" y="66" width="628" height="424" class="panel modal" filter="url(#shadow)"/>
      <text x="400" y="104" text-anchor="middle" class="title">World Layers</text>
      <rect x="126" y="134" width="248" height="252" fill="#526b34" stroke="#e0bd59"/><text x="250" y="164" text-anchor="middle" class="label">Surface</text><path d="M138 330 C204 254 288 278 362 210" stroke="#2d5c2d" stroke-width="36" fill="none"/>
      <rect x="426" y="134" width="248" height="252" fill="#2a2730" stroke="#e0bd59"/><text x="550" y="164" text-anchor="middle" class="label">Underground</text><path d="M438 326 C504 234 590 284 662 204" stroke="#51342a" stroke-width="36" fill="none"/>
      <circle cx="400" cy="260" r="42" fill="#4f2713" stroke="#ffe784" class="pulse"/><path d="M384 260 L416 242 L416 278 Z" fill="#ffe784"/>
      ${button(166, 414, 100, 30, "SURFACE", "layer.surface")}${button(454, 414, 128, 30, "UNDER", "layer.underground")}${button(596, 414, 78, 30, "CLOSE", "layer.close")}`;
  } else if (screen.variant === "viewWorld") {
    overlay = `<rect x="42" y="42" width="716" height="486" fill="#b4864a" stroke="#3c1d0d" stroke-width="5" class="modal" filter="url(#shadow)"/>
      <rect x="72" y="84" width="540" height="384" fill="#496637" stroke="#e0bd59"/><path d="M94 358 C204 262 320 320 444 224 C522 164 566 184 604 126" stroke="#294f79" stroke-width="42" fill="none" opacity=".75"/>
      ${[[160, 150, "Town"], [254, 286, "Hero"], [394, 198, "Mine"], [512, 332, "Gate"], [566, 140, "Mon"]].map(([x, y, t], i) => `<g><circle cx="${x}" cy="${y}" r="13" fill="${i === 1 ? "#ffe784" : "#7e2518"}" stroke="#f4d476" class="${i === 1 ? "pulse" : ""}"/><text x="${x + 18}" y="${y + 4}" class="tiny">${t}</text></g>`).join("")}
      <rect x="634" y="84" width="94" height="160" class="status"/><text x="652" y="110" class="label">Layers</text><text x="652" y="140" class="tiny">Surface</text><text x="652" y="168" class="tiny">Under</text><text x="652" y="202" class="tiny">View Air</text>
      <rect x="634" y="270" width="94" height="112" class="status"/><text x="650" y="296" class="tiny">Selected:</text><text x="650" y="320" class="tiny">Kaelis</text><text x="650" y="344" class="tiny">Legal focus</text>
      ${button(634, 402, 78, 30, "FOCUS", "viewWorld.focusSelected")}${button(634, 442, 78, 30, "CLOSE", "viewWorld.close")}`;
  } else if (screen.variant === "adventureSpellTargeting") {
    overlay = `<rect x="18" y="18" width="590" height="528" fill="#080512" opacity=".44"/>
      <rect x="112" y="46" width="386" height="54" class="status modal"/><text x="132" y="70" class="label">Town Portal - Expert Earth - Cost 16</text><text x="132" y="90" class="tiny">Choose an owned town. Red targets are illegal.</text>
      ${[[204, 208, "Town"], [342, 292, "Town"], [474, 174, "Blocked"]].map(([x, y, t], i) => `<g><circle cx="${x}" cy="${y}" r="30" fill="none" stroke="${i === 2 ? "#d84b3e" : "#73d8ff"}" stroke-width="4" class="pulse"/><text x="${x}" y="${y + 4}" text-anchor="middle" class="tiny">${t}</text></g>`).join("")}
      <path d="M322 260 C356 226 396 196 474 174" fill="none" stroke="#7ad7ff" stroke-width="4" stroke-dasharray="8 6" class="pulse"/>
      ${button(650, 474, 88, 30, "CANCEL", "advSpell.cancel")}`;
  } else if (screen.variant === "mapObjectTooltip") {
    overlay = `<g class="modal" filter="url(#shadow)">
      <rect x="340" y="138" width="214" height="162" fill="#100906" stroke="#e0bd59" stroke-width="2"/>
      <rect x="356" y="154" width="54" height="54" class="slotHot"/><text x="426" y="176" class="label">Abandoned Mine</text><text x="426" y="198" class="tiny">Owner: none</text>
      <rect x="358" y="226" width="174" height="44" class="status"/><text x="372" y="246" class="tiny">Guard strength: unknown</text><text x="372" y="264" class="tiny">Right-click holds details.</text>
      <circle cx="338" cy="138" r="8" fill="#ffe784"/>
      </g>`;
  } else if (screen.variant === "statusBar") {
    overlay = `<rect x="18" y="404" width="764" height="142" fill="#1a0d08" stroke="#e0bd59" stroke-width="2" class="modal"/>
      <text x="42" y="430" class="label">Message History</text>
      ${rowList(["Kaelis picked up 1000 gold.", "Path blocked by enemy hero.", "Mine now produces +1 ore/day.", "Not enough movement points.", "Right-click object for details."], 42, 450, 514, 18)}
      <rect x="586" y="434" width="164" height="70" class="status"/><text x="604" y="458" class="tiny">Pinned: Mine income</text><text x="604" y="482" class="tiny">Resource delta +1 ore</text>
      ${button(594, 512, 70, 24, "CLEAR", "status.clear")}${button(674, 512, 70, 24, "CLOSE", "status.collapse")}`;
  } else if (screen.variant === "mineVisit") {
    overlay = `${adventureDialogFrame("Ore Pit", "Claim this mine for your kingdom")}
      <rect x="142" y="164" width="136" height="136" class="slotHot"/><circle cx="210" cy="232" r="44" fill="#7c6a4a" stroke="#ffe18a"/><text x="210" y="238" text-anchor="middle" class="label">Ore</text>
      <rect x="306" y="164" width="306" height="142" class="status"/><text x="326" y="192" class="tiny">Current owner: none</text><text x="326" y="218" class="tiny">Daily income: +1 ore</text><text x="326" y="244" class="tiny">Guard: defeated</text><text x="326" y="270" class="tiny">Claiming updates active player economy.</text>
      <path d="M178 348 C214 318 248 344 284 320 L284 394 C248 374 214 396 178 372 Z" fill="#b52118" stroke="#ffe18a" class="pulse"/>
      ${button(396, 414, 86, 30, "CLAIM", "mine.claim")}${button(496, 414, 76, 30, "LEAVE", "mine.leave")}`;
  } else if (screen.variant === "externalDwelling") {
    overlay = `${adventureDialogFrame("Griffin Tower", "Recruit available creatures")}
      <rect x="140" y="158" width="150" height="170" class="redPanel"/><rect x="176" y="188" width="78" height="86" class="slotHot"/><text x="215" y="302" text-anchor="middle" class="label">Griffins</text>
      <rect x="322" y="158" width="142" height="170" class="status"/><text x="342" y="188" class="tiny">Available: 7</text><text x="342" y="216" class="tiny">Recruiting: 4</text><text x="342" y="244" class="tiny">Cost: 800 gold</text><rect x="342" y="276" width="84" height="14" class="slot"/><rect x="342" y="276" width="48" height="14" class="slotHot"/>
      ${armySlots(158, 368, "Hero Army", "#1d4774")}
      ${button(504, 180, 68, 30, "MAX", "dwelling.max")}${button(504, 222, 78, 30, "RECRUIT", "dwelling.recruit")}${button(504, 264, 76, 30, "CLOSE", "dwelling.close")}`;
  } else if (screen.variant === "garrisonStructure") {
    overlay = `${adventureDialogFrame("Border Garrison", "Transfer stacks between hero and structure")}
      <rect x="132" y="156" width="118" height="90" class="redPanel"/><text x="164" y="204" class="label">Hero</text><rect x="526" y="156" width="118" height="90" class="redPanel"/><text x="546" y="204" class="label">Garrison</text>
      ${armySlots(146, 280, "Hero Army", "#1d4774")}
      ${armySlots(146, 376, "Garrison Army", "#772016")}
      <path d="M326 236 C374 200 426 200 474 236" fill="none" stroke="#ffe784" stroke-width="4" marker-end="url(#arrow)" class="pulse"/>
      ${button(520, 232, 76, 30, "SPLIT", "garrison.splitStack")}${button(606, 232, 76, 30, "CLOSE", "garrison.close")}`;
  } else {
    overlay = `${adventureDialogFrame("Hero Prison", "Release imprisoned hero")}
      <rect x="150" y="156" width="168" height="192" fill="#16100d" stroke="#e0bd59"/><rect x="184" y="178" width="100" height="112" class="slotHot"/><path d="M184 178 V290 M209 178 V290 M234 178 V290 M259 178 V290 M284 178 V290" stroke="#d8bd76" stroke-width="5"/><text x="234" y="324" text-anchor="middle" class="label">Prisoner</text>
      <rect x="350" y="160" width="248" height="156" class="status"/><text x="372" y="190" class="label">Sir Mullich</text><text x="372" y="216" class="tiny">Level 6 Knight</text><text x="372" y="242" class="tiny">Roster slots: 7 / 8</text><text x="372" y="268" class="tiny">Spawn tile clear: yes</text>
      <rect x="364" y="344" width="160" height="34" class="slotHot pulse"/><text x="444" y="366" text-anchor="middle" class="tiny">Release guard passed</text>
      ${button(384, 414, 86, 30, "RELEASE", "prison.release")}${button(486, 414, 76, 30, "LEAVE", "prison.leave")}`;
  }
  return page(screen, `${adventureStateBackdrop(screen.title)}${overlay}`);
}

function townHtml(screen) {
  const body = `${ornateFrame()}
  <rect x="18" y="18" width="764" height="342" fill="#79a3c7" stroke="#e1bc58" stroke-width="2" data-component="TownPanorama"/>
  <path d="M18 184 C142 88 226 146 356 84 C520 6 628 124 782 62 L782 360 L18 360 Z" fill="#607a44"/>
  <path d="M18 306 C184 238 318 298 452 230 C574 170 660 210 782 170 L782 360 L18 360 Z" fill="#4b331c"/>
  ${[[54, 214, 116, 84, "Hall"], [198, 176, 116, 112, "Tavern"], [348, 106, 132, 184, "Fort"], [526, 154, 104, 114, "Guild"], [664, 212, 80, 74, "Market"]].map(([x, y, w, h, label], i) => `<g data-action="town.selectBuilding.${label}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#6b4425" stroke="#efc95f" stroke-width="2"/><path d="M${x} ${y} L${x + w / 2} ${y - 40} L${x + w} ${y}Z" fill="#8e2118" stroke="#efc95f"/><text x="${x + w / 2}" y="${y + h / 2 + 6}" text-anchor="middle" class="tiny">${label}</text>${i === 2 ? `<rect x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${h + 10}" fill="none" stroke="#fff19a" class="pulse"/>` : ""}</g>`).join("")}
  <rect x="18" y="360" width="764" height="28" fill="url(#redwood)" stroke="#e1bc58"/><text x="400" y="380" text-anchor="middle" class="label">Electrising - Marketplace selected - Built today: no</text>
  <rect x="18" y="388" width="170" height="154" class="redPanel"/><rect x="32" y="402" width="58" height="58" class="slotHot"/><text x="98" y="420" class="label">Castle</text><text x="98" y="442" class="tiny">Gold income 9000</text><text x="98" y="462" class="tiny">Capitol built</text>
  ${armySlots(210, 408, "Town Garrison", "#772016")}
  ${armySlots(210, 488, "Visiting Hero", "#1d4774")}
  ${["Build", "Recruit", "Mage", "Tavern", "Market", "Exit"].map((n, i) => button(32 + i * 124, 548, 96, 28, n, `town.${n.toLowerCase()}`)).join("")}
  ${resourceBar(574)}`;
  return page(screen, body);
}

function townServiceBackdrop() {
  return `${ornateFrame()}
  <rect x="18" y="18" width="764" height="526" fill="#1b120c"/>
  <rect x="28" y="28" width="744" height="306" fill="#6c8eb0" stroke="#d9b85a"/>
  <path d="M28 196 C148 108 238 142 362 82 C508 12 626 126 772 58 L772 334 L28 334 Z" fill="#607444"/>
  <path d="M28 292 C174 226 312 278 452 220 C590 168 670 210 772 176 L772 334 L28 334 Z" fill="#49311d"/>
  <rect x="28" y="334" width="744" height="216" fill="url(#redwood)" stroke="#d9b85a"/>`;
}

function servicePanel(title, subtitle = "") {
  return `<rect x="96" y="58" width="608" height="444" class="panel modal" filter="url(#shadow)"/>
  <rect x="112" y="74" width="576" height="34" fill="url(#redwood)" stroke="#e4c064"/>
  <text x="400" y="97" text-anchor="middle" class="label">${esc(title)}</text>
  ${subtitle ? `<text x="400" y="124" text-anchor="middle" class="tiny">${esc(subtitle)}</text>` : ""}`;
}

function smallSlots(items, x, y, cols = 4, w = 52, h = 42, gap = 14) {
  return items.map((item, i) => {
    const sx = x + (i % cols) * (w + gap);
    const sy = y + Math.floor(i / cols) * (h + 22);
    return `<g data-item="${attr(item)}"><rect x="${sx}" y="${sy}" width="${w}" height="${h}" class="${i === 0 ? "slotHot" : "slot"}"/><text x="${sx + w / 2}" y="${sy + h + 14}" text-anchor="middle" class="tiny">${esc(item)}</text></g>`;
  }).join("");
}

function rowList(items, x, y, w = 180, h = 28) {
  return items.map((item, i) => `<rect x="${x}" y="${y + i * (h + 8)}" width="${w}" height="${h}" class="${i === 0 ? "slotHot" : "slot"}"/><text x="${x + 12}" y="${y + i * (h + 8) + 18}" class="tiny">${esc(item)}</text>`).join("");
}

function townServiceHtml(screen) {
  let content = "";
  if (screen.variant === "recruitment") {
    content = `${townServiceBackdrop()}${servicePanel("Recruit Creatures", "Dwelling stock, destination army, and cost preview")}
      <rect x="126" y="142" width="154" height="236" class="redPanel"/><text x="148" y="166" class="label">Dwellings</text>
      ${rowList(["Pikemen", "Archers", "Griffins", "Swordsmen", "Monks", "Cavaliers"], 142, 186, 122, 24)}
      <rect x="304" y="142" width="176" height="184" class="slotHot"/><circle cx="392" cy="220" r="48" fill="#9a3d22" stroke="#ffe18a"/><text x="392" y="226" text-anchor="middle" class="label">Cavalier</text>
      <rect x="500" y="142" width="162" height="184" class="status"/><text x="518" y="172" class="tiny">Available: 8</text><text x="518" y="198" class="tiny">Recruiting: 5</text><text x="518" y="224" class="tiny">Cost: 5000 gold</text><text x="518" y="250" class="tiny">Destination: hero</text>
      <rect x="320" y="352" width="324" height="42" class="status"/><rect x="338" y="366" width="190" height="12" class="slot"/><rect x="438" y="358" width="18" height="28" class="slotHot"/>
      ${armySlots(152, 430, "Destination Army", "#1d4774")}
      ${button(520, 412, 70, 30, "MAX", "recruit.max")}${button(604, 412, 70, 30, "BUY", "recruit.confirm")}${button(604, 458, 70, 30, "CLOSE", "recruit.cancel")}`;
  } else if (screen.variant === "marketplace") {
    content = `${townServiceBackdrop()}${servicePanel("Marketplace", "Select offered and requested resources")}
      <text x="206" y="158" text-anchor="middle" class="label">Offer</text><text x="594" y="158" text-anchor="middle" class="label">Receive</text>
      ${smallSlots(["Wood", "Ore", "Merc", "Sulfur", "Crystal", "Kaeliss", "Gold"], 132, 184, 2, 58, 42)}
      ${smallSlots(["Wood", "Ore", "Merc", "Sulfur", "Crystal", "Kaeliss", "Gold"], 520, 184, 2, 58, 42)}
      <path d="M308 270 C362 230 438 230 492 270" fill="none" stroke="#ffe784" stroke-width="5" marker-end="url(#arrow)" class="pulse"/>
      <rect x="318" y="312" width="164" height="74" class="status"/><text x="400" y="338" text-anchor="middle" class="label">Rate 5 : 1</text><text x="400" y="362" text-anchor="middle" class="tiny">1000 gold -> 200 wood</text>
      <rect x="158" y="420" width="484" height="38" class="status"/><text x="176" y="444" class="tiny">Ledger previews balances before TRADE_RESOURCES commits.</text>
      ${button(322, 466, 76, 30, "TRADE", "market.trade")}${button(416, 466, 76, 30, "CLOSE", "market.close")}`;
  } else if (screen.variant === "thieves") {
    const columns = ["Player", "Towns", "Heroes", "Gold", "Army", "Arts"];
    content = `${townServiceBackdrop()}${servicePanel("Thieves Guild", "Intelligence shown by guild access")}
      <rect x="126" y="136" width="548" height="292" class="status"/>
      ${columns.map((c, i) => `<rect x="${142 + i * 86}" y="156" width="78" height="28" class="redPanel"/><text x="${181 + i * 86}" y="174" text-anchor="middle" class="tiny">${c}</text>`).join("")}
      ${["Red", "Blue", "Tan", "Green", "Orange"].map((p, r) => columns.map((_, c) => `<rect x="${142 + c * 86}" y="${196 + r * 38}" width="78" height="28" class="${r === 0 ? "slotHot" : "slot"}"/><text x="${181 + c * 86}" y="${214 + r * 38}" text-anchor="middle" class="tiny">${c === 0 ? p : c > 3 && r > 2 ? "?" : String((r + 1) * (c + 2))}</text>`).join("")).join("")}
      <rect x="146" y="448" width="378" height="28" class="status"/><text x="160" y="466" class="tiny">Covered cells stay hidden until intelligence rules allow them.</text>
      ${button(544, 446, 86, 30, "CLOSE", "thieves.close")}`;
  } else if (screen.variant === "tavern") {
    content = `${townServiceBackdrop()}${servicePanel("Tavern", "Hero offers, rumor, and thieves guild")}
      <rect x="132" y="142" width="218" height="218" class="redPanel"/><rect x="158" y="166" width="72" height="88" class="slotHot"/><text x="250" y="190" class="label">Cuthbert</text><text x="250" y="216" class="tiny">Level 1 Cleric</text><text x="250" y="242" class="tiny">Cost: 2500 gold</text>${button(242, 286, 78, 28, "HIRE", "tavern.hireHero")}
      <rect x="450" y="142" width="218" height="218" class="redPanel"/><rect x="476" y="166" width="72" height="88" class="slot"/><text x="568" y="190" class="label">Kaelis</text><text x="568" y="216" class="tiny">Level 3 Druid</text><text x="568" y="242" class="tiny">Cost: 2500 gold</text>${button(560, 286, 78, 28, "HIRE", "tavern.hireHero")}
      <rect x="132" y="384" width="354" height="78" class="status"/><text x="150" y="414" class="tiny">Rumor: A grail marker was seen near the northern obelisk.</text><text x="150" y="438" class="tiny">Weekly hero pool refreshes at week start.</text>
      ${button(510, 398, 130, 30, "THIEVES", "tavern.thievesGuild")}${button(552, 438, 88, 30, "CLOSE", "tavern.close")}`;
  } else if (screen.variant === "mageGuild") {
    content = `${townServiceBackdrop()}${servicePanel("Mage Guild", "Spell shelves by level and hero eligibility")}
      ${[1, 2, 3, 4, 5].map((lvl, i) => `<rect x="${132 + i * 104}" y="146" width="82" height="218" class="${lvl <= 3 ? "redPanel" : "slot"}"/><text x="${173 + i * 104}" y="170" text-anchor="middle" class="label">L${lvl}</text>${smallSlots(["Air", "Earth", "Fire"], 146 + i * 104, 194, 1, 52, 34, 8)}`).join("")}
      <rect x="142" y="396" width="334" height="68" class="status"/><text x="160" y="420" class="tiny">Visiting hero: Darkstorn - Expert Wisdom - Mana 20/20</text><text x="160" y="444" class="tiny">Selected: Stone Skin. Already known: no.</text>
      ${button(504, 402, 86, 30, "LEARN", "mageGuild.learnSpell")}${button(504, 442, 86, 30, "CLOSE", "mageGuild.close")}`;
  } else {
    content = `${townServiceBackdrop()}${servicePanel("Build Tree", "Prerequisites, costs, and daily build guard")}
      <rect x="128" y="140" width="374" height="286" class="status"/>
      ${[
        [180, 174, "Village Hall", true], [316, 174, "Town Hall", true], [444, 174, "City Hall", false],
        [180, 266, "Fort", true], [316, 266, "Citadel", false], [444, 266, "Castle", false],
        [180, 358, "Mage Guild", true], [316, 358, "Marketplace", true], [444, 358, "Monastery", false],
      ].map(([x, y, label, built]) => `<rect x="${x}" y="${y}" width="96" height="38" class="${built ? "slotHot" : "slot"}"/><text x="${x + 48}" y="${y + 23}" text-anchor="middle" class="tiny">${label}</text>`).join("")}
      <path d="M276 193 L316 193 M412 193 L444 193 M276 285 L316 285 M412 285 L444 285 M228 212 L228 266 M364 212 L364 266" stroke="#d7b85b" stroke-width="2"/>
      <rect x="526" y="150" width="130" height="216" class="redPanel"/><text x="542" y="180" class="label">Selected</text><text x="542" y="210" class="tiny">Citadel</text><text x="542" y="238" class="tiny">Cost: 2500 gold</text><text x="542" y="262" class="tiny">Wood: 5 Ore: 5</text><text x="542" y="286" class="tiny">Built today: no</text>
      ${button(534, 398, 82, 30, "BUILD", "buildTree.build")}${button(534, 438, 82, 30, "CLOSE", "buildTree.close")}`;
  }
  return page(screen, content);
}

function townExtendedHtml(screen) {
  let content = "";
  if (screen.variant === "grailBuilding") {
    content = `${townServiceBackdrop()}${servicePanel("Grail Wonder", "Build a permanent faction wonder in this town")}
      <rect x="154" y="154" width="176" height="214" class="redPanel"/><text x="190" y="184" class="label">Delivered Grail</text><circle cx="242" cy="254" r="56" fill="#e9d98c" stroke="#fff3b0" stroke-width="3" class="pulse"/><path d="M220 254 C232 214 252 214 264 254 C254 284 230 284 220 254Z" fill="#fff4b0"/>
      <rect x="370" y="154" width="276" height="214" class="status"/><text x="394" y="184" class="label">Colossus Wonder</text><text x="394" y="216" class="tiny">Town: Castle - Owner: Red</text><text x="394" y="244" class="tiny">Bonus: +5000 gold/day</text><text x="394" y="270" class="tiny">Bonus: +50 percent creature growth</text><text x="394" y="296" class="tiny">Existing grail building: no</text>
      <path d="M242 338 C300 284 392 264 520 218" class="path"/>
      ${button(420, 410, 96, 30, "BUILD", "grail.build")}${button(534, 410, 82, 30, "CANCEL", "grail.cancel")}`;
  } else if (screen.variant === "artifactMarket") {
    content = `${townServiceBackdrop()}${servicePanel("Artifact Merchant", "Buy and sell eligible artifacts")}
      <rect x="126" y="148" width="300" height="208" class="redPanel"/><text x="148" y="174" class="label">Market Shelf</text>${smallSlots(["Sword", "Shield", "Orb", "Boots", "Ring", "Cape", "Book", "Crown"], 150, 196, 4, 48, 42)}
      <rect x="456" y="148" width="202" height="208" class="status"/><text x="480" y="176" class="label">Selected</text><rect x="526" y="196" width="62" height="62" class="slotHot pulse"/><text x="482" y="286" class="tiny">Sword of Judgment</text><text x="482" y="312" class="tiny">Price: 9000 gold</text><text x="482" y="338" class="tiny">Backpack space: yes</text>
      <rect x="132" y="384" width="372" height="60" class="status"/><text x="152" y="410" class="tiny">Hero backpack: 8 / 64. Equipped artifacts remain locked unless selling is allowed.</text>
      ${button(516, 382, 72, 30, "BUY", "artifactMarket.buy")}${button(598, 382, 72, 30, "SELL", "artifactMarket.sell")}${button(598, 424, 72, 30, "CLOSE", "artifactMarket.close")}`;
  } else if (screen.variant === "shipyard") {
    content = `${townServiceBackdrop()}${servicePanel("Shipyard", "Build boat on a legal adjacent water tile")}
      <rect x="126" y="148" width="360" height="220" fill="#2e6077" stroke="#e0bd59"/><path d="M134 274 C214 238 294 292 382 246 C426 224 456 238 478 220" stroke="#9dd7e5" stroke-width="20" fill="none" opacity=".55"/>
      <path d="M238 246 L354 246 L326 298 L266 298 Z" fill="#5a3019" stroke="#ffe18a" class="pulse"/><path d="M296 244 L296 180 L344 236 Z" fill="#d8c18a" stroke="#6b3d1a"/>
      <rect x="514" y="148" width="130" height="220" class="status"/><text x="536" y="178" class="label">Cost</text><text x="536" y="212" class="tiny">Wood: 10</text><text x="536" y="238" class="tiny">Gold: 1000</text><text x="536" y="264" class="tiny">Spawn: clear</text><text x="536" y="290" class="tiny">Water: yes</text>
      ${button(438, 412, 86, 30, "BUILD", "shipyard.build")}${button(540, 412, 86, 30, "CLOSE", "shipyard.close")}`;
  } else if (screen.variant === "fortView") {
    content = `${townServiceBackdrop()}${servicePanel("Fortifications", "Inspect town defense and siege bonuses")}
      <rect x="142" y="152" width="500" height="230" fill="url(#stone)" stroke="#e0bd59"/>
      <rect x="176" y="256" width="372" height="64" fill="#6b6048" stroke="#e0bd59"/><rect x="214" y="202" width="64" height="118" fill="#76694e" stroke="#e0bd59"/><rect x="446" y="202" width="64" height="118" fill="#76694e" stroke="#e0bd59"/><rect x="318" y="230" width="86" height="90" fill="#4d3522" stroke="#e0bd59" class="pulse"/>
      <rect x="154" y="402" width="330" height="42" class="status"/><text x="174" y="426" class="tiny">Castle tier: towers active, moat enabled, growth bonus applied.</text>
      ${button(500, 402, 86, 30, "BUILD", "fortView.buildTree")}${button(596, 402, 76, 30, "CLOSE", "fortView.close")}`;
  } else if (screen.variant === "townFlyby") {
    content = `${ornateFrame()}
      <rect x="18" y="18" width="764" height="526" fill="#74a2c7" stroke="#e0bd59"/><rect x="18" y="18" width="764" height="70" fill="#000"/><rect x="18" y="474" width="764" height="70" fill="#000"/>
      <path d="M18 306 C146 174 258 224 404 126 C562 24 648 146 782 76 L782 474 L18 474 Z" fill="#57713e"/>
      <path d="M74 396 C226 292 352 336 504 250 C622 184 704 226 782 174 L782 474 L74 474 Z" fill="#4b2d1a"/>
      <path d="M112 174 C256 126 380 158 548 104" fill="none" stroke="#ffe784" stroke-width="3" stroke-dasharray="8 7" class="path"/>
      <text x="400" y="522" text-anchor="middle" class="label">Castle Flyby - assets warming: 88 percent</text>
      ${button(676, 500, 72, 30, "SKIP", "townFlyby.skip")}`;
  } else if (screen.variant === "artifactTrading") {
    content = `${townServiceBackdrop()}${servicePanel("Artifact Trading", "Move an artifact to the scales and confirm the quote")}
      <rect x="126" y="148" width="220" height="226" class="redPanel"/><text x="152" y="174" class="label">Hero Artifacts</text>${smallSlots(["Helm", "Sword", "Orb", "Ring", "Boots", "Cape"], 150, 198, 3, 48, 42)}
      <rect x="376" y="162" width="130" height="180" class="status"/><path d="M408 262 L474 262" stroke="#ffe18a" stroke-width="5"/><circle cx="408" cy="238" r="30" fill="#4f2713" stroke="#ffe18a"/><circle cx="474" cy="286" r="30" fill="#4f2713" stroke="#ffe18a"/><text x="440" y="326" text-anchor="middle" class="tiny">Quote 4500g</text>
      <rect x="536" y="148" width="116" height="226" class="redPanel"/><text x="558" y="174" class="label">Receive</text>${smallSlots(["Gold", "Kaelis", "Art"], 568, 204, 1, 48, 38)}
      ${button(426, 408, 78, 30, "TRADE", "artifactTrade.commit")}${button(520, 408, 76, 30, "CLOSE", "artifactTrade.close")}`;
  } else {
    const rows = ["Pikemen 52 / max", "Archers 26 / max", "Griffins 7 / max", "Swordsmen 12 / max", "Monks 4 / max", "Cavaliers 2 / max", "Angels locked"];
    content = `${townServiceBackdrop()}${servicePanel("Quick Recruit", "Buy across all built dwellings")}
      <rect x="126" y="140" width="388" height="286" class="redPanel"/>
      ${rows.map((row, i) => `<rect x="146" y="${160 + i * 34}" width="344" height="26" class="${i < 6 ? (i === 0 ? "slotHot" : "slot") : "slot"}" opacity="${i < 6 ? "1" : ".45"}"/><rect x="154" y="${166 + i * 34}" width="14" height="14" fill="${i < 6 ? "#ffe784" : "#2a1a12"}" stroke="#d0b052"/><text x="182" y="${178 + i * 34}" class="tiny">${row}</text>`).join("")}
      <rect x="538" y="148" width="118" height="178" class="status"/><text x="558" y="176" class="label">Total</text><text x="558" y="210" class="tiny">Gold: 8420</text><text x="558" y="236" class="tiny">Merc: 2</text><text x="558" y="262" class="tiny">Slots: ok</text>
      ${armySlots(150, 452, "Destination", "#1d4774")}
      ${button(532, 358, 86, 30, "SELECT", "quickRecruit.selectAffordable")}${button(532, 398, 86, 30, "RECRUIT", "quickRecruit.commit")}${button(626, 398, 74, 30, "CLOSE", "quickRecruit.close")}`;
  }
  return page(screen, content);
}

function combatHtml(screen) {
  const body = `${ornateFrame()}
  <rect x="18" y="18" width="764" height="470" fill="#5f7d43" stroke="#dfbd59" stroke-width="2" data-component="Battlefield"/>
  <path d="M18 174 C180 88 318 130 484 58 C602 12 682 58 782 38 L782 488 L18 488Z" fill="#7e9360"/>
  <g transform="translate(138 104)" data-component="HexOverlay">${hexGrid(0, 0, 12, 8)}</g>
  <rect x="566" y="58" width="44" height="320" fill="#665842" stroke="#d9c078"/><rect x="610" y="98" width="46" height="92" fill="#6f634c" stroke="#d9c078"/><rect x="610" y="266" width="46" height="92" fill="#6f634c" stroke="#d9c078"/>
  ${[[100, 224, "Manticore", 2, "#673211"], [88, 360, "Wolf", 33, "#1d1a13"], [106, 452, "Demon", 9, "#5b1d14"], [604, 172, "Cavalier", 82, "#1c4777"], [566, 284, "Angel", 138, "#ece5c6"], [660, 414, "Archer", 28, "#204a77"]].map(([x, y, label, count, color], i) => `<g data-stack="${label}"><circle cx="${x}" cy="${y}" r="${i === 1 ? 22 : 26}" fill="${color}" stroke="#ffe078" stroke-width="${i === 0 ? 3 : 1.5}" class="${i === 0 ? "pulse" : ""}"/><rect x="${x - 18}" y="${y + 24}" width="36" height="14" fill="${i < 3 ? "#7b1a77" : "#1e8b32"}" stroke="#f5db7b"/><text x="${x}" y="${y + 35}" text-anchor="middle" class="tiny">${count}</text></g>`).join("")}
  <path class="path" d="M126 224 C250 180 362 190 518 272"/>
  <text x="368" y="248" class="title float">-128</text>
  <rect x="18" y="488" width="764" height="72" fill="url(#bronze)" stroke="#e1bc58"/>
  ${["Spell", "Wait", "Defend", "Auto", "Retreat", "Surrender"].map((n, i) => button(28 + i * 94, 518, 82, 30, n, `combat.${n.toLowerCase()}`)).join("")}
  <rect x="604" y="502" width="164" height="42" class="status"/><text x="618" y="526" class="tiny">Fly Manticores here.</text>
  ${resourceBar(570)}`;
  return page(screen, body);
}

function battleBackdrop() {
  return `${ornateFrame()}
  <rect x="18" y="18" width="764" height="470" fill="#5f7d43" stroke="#dfbd59" stroke-width="2"/>
  <path d="M18 174 C180 88 318 130 484 58 C602 12 682 58 782 38 L782 488 L18 488Z" fill="#7e9360"/>
  <g transform="translate(138 104)">${hexGrid(0, 0, 12, 8)}</g>
  <rect x="18" y="488" width="764" height="72" fill="url(#bronze)" stroke="#e1bc58"/>
  ${resourceBar(570)}`;
}

function battleModalHtml(screen) {
  let content = "";
  if (screen.variant === "battleResults") {
    content = `${battleBackdrop()}<rect x="156" y="74" width="488" height="398" class="panel modal" filter="url(#shadow)"/>
      <rect x="188" y="104" width="424" height="42" fill="url(#redwood)" stroke="#e4c064"/><text x="400" y="132" text-anchor="middle" class="title">VICTORY</text>
      <rect x="198" y="166" width="178" height="172" class="status"/><text x="242" y="192" class="label">Your losses</text>${smallSlots(["52", "6", "4", "31"], 214, 216, 2, 48, 34)}
      <rect x="424" y="166" width="178" height="172" class="status"/><text x="462" y="192" class="label">Enemy losses</text>${smallSlots(["82", "138", "22", "28"], 440, 216, 2, 48, 34)}
      <rect x="204" y="356" width="392" height="44" class="status"/><rect x="222" y="374" width="262" height="10" class="slot"/><rect x="222" y="374" width="188" height="10" class="slotHot"/><text x="500" y="384" class="tiny">+1250 XP</text>
      ${smallSlots(["Gold", "Ore", "Artifact"], 258, 414, 3, 54, 32)}
      ${button(512, 432, 82, 30, "OK", "battleResults.continue")}`;
  } else if (screen.variant === "preBattle") {
    content = `${battleBackdrop()}<rect x="126" y="82" width="548" height="372" class="panel modal" filter="url(#shadow)"/>
      <text x="400" y="118" text-anchor="middle" class="title">Enemy Encounter</text>
      <rect x="158" y="148" width="174" height="196" class="redPanel"/><rect x="188" y="172" width="72" height="82" class="slotHot"/><text x="246" y="282" text-anchor="middle" class="label">Attacker</text>${smallSlots(["52", "6", "4"], 180, 306, 3, 38, 28)}
      <rect x="468" y="148" width="174" height="196" class="redPanel"/><rect x="498" y="172" width="72" height="82" class="slot"/><text x="556" y="282" text-anchor="middle" class="label">Defender</text>${smallSlots(["82", "138", "28"], 490, 306, 3, 38, 28)}
      <circle cx="400" cy="224" r="48" fill="#5b1a13" stroke="#ffe18a" class="pulse"/><text x="400" y="230" text-anchor="middle" class="label">VS</text>
      <rect x="286" y="362" width="228" height="34" class="status"/><text x="304" y="384" class="tiny">Terrain: grass. Tactics: available.</text>
      ${button(250, 414, 88, 30, "FIGHT", "preBattle.fight")}${button(356, 414, 88, 30, "AUTO", "preBattle.autoResolve")}${button(462, 414, 88, 30, "RETREAT", "preBattle.retreat")}`;
  } else if (screen.variant === "surrender") {
    content = `${battleBackdrop()}<rect x="232" y="146" width="336" height="270" class="panel modal" filter="url(#shadow)"/>
      <text x="400" y="184" text-anchor="middle" class="title">Surrender?</text>
      <rect x="302" y="218" width="196" height="62" class="slotHot pulse"/><text x="400" y="256" text-anchor="middle" class="title">4500 Gold</text>
      <rect x="282" y="306" width="236" height="50" class="status"/><text x="302" y="326" class="tiny">Hero survives and returns to tavern pool.</text><text x="302" y="346" class="tiny">Available gold: 13149</text>
      ${button(286, 374, 92, 30, "ACCEPT", "surrender.accept")}${button(424, 374, 92, 30, "DECLINE", "surrender.decline")}`;
  } else {
    content = `${ornateFrame()}<rect width="800" height="600" fill="#050406"/>
      <rect x="0" y="0" width="800" height="70" fill="#000"/><rect x="0" y="530" width="800" height="70" fill="#000"/>
      <rect x="68" y="90" width="664" height="330" fill="#263748" stroke="#d7b85b" stroke-width="2"/>
      <path d="M68 360 C220 240 390 316 540 188 C632 108 690 156 732 118 L732 420 L68 420Z" fill="#5a2f20"/>
      <circle cx="620" cy="154" r="48" fill="#c99742" opacity=".72"/>
      <text x="400" y="468" text-anchor="middle" class="title">Victory</text>
      <rect x="188" y="486" width="424" height="32" class="status"/><text x="206" y="507" class="tiny">Campaign outcome text types in; score and carryover are already finalized.</text>
      ${button(620, 544, 100, 30, "CONTINUE", "outcome.continue")}`;
  }
  return page(screen, content);
}

function battleVariantHtml(screen) {
  let overlay = "";
  if (screen.variant === "siege") {
    overlay = `<rect x="536" y="50" width="48" height="360" fill="#6c6048" stroke="#e0c06a" stroke-width="2"/><rect x="486" y="92" width="52" height="78" fill="#716650" stroke="#e0c06a"/><rect x="486" y="268" width="52" height="78" fill="#716650" stroke="#e0c06a"/>
      <path d="M92 452 C218 404 392 440 536 390" stroke="#362011" stroke-width="20" fill="none"/>
      <path d="M122 422 C258 320 378 246 506 160" class="path"/>
      <circle cx="506" cy="160" r="22" fill="none" stroke="#ffe784" stroke-width="3" class="pulse"/><text x="594" y="82" class="tiny">Tower shots</text><text x="460" y="386" class="tiny">Gate / moat</text>`;
  } else if (screen.variant === "combatSpellTargeting") {
    overlay = `<rect x="18" y="18" width="764" height="470" fill="#080512" opacity=".46"/>
      <rect x="216" y="42" width="368" height="54" class="status"/><text x="238" y="66" class="label">Meteor Shower - Cost 16 - Expert Fire</text><text x="238" y="86" class="tiny">Choose valid enemy area. Immune targets are marked red.</text>
      ${Array.from({ length: 9 }, (_, i) => `<polygon points="${326 + (i % 3) * 44},218 ${344 + (i % 3) * 44},208 ${362 + (i % 3) * 44},218 ${362 + (i % 3) * 44},238 ${344 + (i % 3) * 44},248 ${326 + (i % 3) * 44},238" class="hex pulse" transform="translate(${Math.floor(i / 3) * 20} ${Math.floor(i / 3) * 36})"/>`).join("")}
      <circle cx="504" cy="272" r="24" fill="none" stroke="#c8332a" stroke-width="4"/><text x="492" y="310" class="tiny">Immune</text>`;
  } else {
    overlay = `<rect x="74" y="58" width="214" height="380" fill="#2a6b85" opacity=".32" stroke="#ffe784" stroke-width="2"/>
      <rect x="512" y="58" width="190" height="380" fill="#651c18" opacity=".28" stroke="#d76150" stroke-width="2"/>
      <text x="114" y="468" class="label">Tactics deployment zone</text><text x="530" y="468" class="label">Enemy locked</text>
      ${[[126, 210, 52], [130, 320, 6], [184, 280, 4]].map(([x, y, n]) => `<circle cx="${x}" cy="${y}" r="24" fill="#743019" stroke="#ffe784" class="pulse"/><text x="${x}" y="${y + 36}" text-anchor="middle" class="tiny">${n}</text>`).join("")}`;
  }
  const body = `${battleBackdrop()}
    ${overlay}
    ${[[100, 224, "A", 2, "#673211"], [88, 360, "B", 33, "#1d1a13"], [604, 172, "C", 82, "#1c4777"], [566, 284, "D", 138, "#ece5c6"], [660, 414, "E", 28, "#204a77"]].map(([x, y, label, count, color]) => `<circle cx="${x}" cy="${y}" r="24" fill="${color}" stroke="#ffe078"/><rect x="${x - 17}" y="${y + 22}" width="34" height="14" fill="#1e8b32" stroke="#f5db7b"/><text x="${x}" y="${y + 33}" text-anchor="middle" class="tiny">${count}</text>`).join("")}
    ${["Spell", "Wait", "Defend", "Auto", "Retreat", "End"].map((n, i) => button(28 + i * 94, 518, 82, 30, n, `${screen.id.slice(3)}.${n.toLowerCase()}`)).join("")}`;
  return page(screen, body);
}

function heroHtml(screen) {
  const body = `${ornateFrame()}
  <rect x="18" y="18" width="150" height="526" fill="#253321" stroke="#e0bd59"/><path d="M28 40 C130 80 88 210 158 260 C84 338 138 460 28 528" fill="#596d42"/><text x="42" y="526" class="tiny">Adventure context</text>
  <rect x="176" y="18" width="466" height="526" class="panel" data-component="HeroSheet"/>
  <rect x="194" y="42" width="76" height="76" class="slotHot"/><text x="288" y="72" class="title">Darkstorn</text><text x="288" y="100" class="label">Level 5 Warlock</text>
  ${["Attack", "Defense", "Power", "Knowledge"].map((n, i) => `<text x="${222 + i * 96}" y="150" text-anchor="middle" class="label">${n}</text><rect x="${194 + i * 96}" y="162" width="58" height="58" class="slot"/><text x="${223 + i * 96}" y="238" text-anchor="middle" class="label">${[2,0,6,2][i]}</text>`).join("")}
  ${["Specialty: Stone Skin", "Experience: 5449", "Expert Wisdom", "Advanced Learning", "Basic Diplomacy"].map((n, i) => `<rect x="194" y="${266 + i * 48}" width="224" height="38" class="${i === 2 ? "slotHot" : "slot"}"/><text x="208" y="${290 + i * 48}" class="small">${n}</text>`).join("")}
  <g data-component="PaperDoll"><path d="M504 100 C452 128 440 230 474 334 C506 410 558 410 588 334 C622 230 608 128 556 100 Z" fill="#741915" stroke="#d8b85e" stroke-width="2"/><text x="532" y="98" text-anchor="middle" class="label">Equipment</text>
  ${[[454, 136], [558, 136], [430, 232], [582, 232], [454, 328], [558, 328], [506, 400]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="54" height="54" class="${i === 0 ? "slotHot" : "slot"}"/>`).join("")}</g>
  ${Array.from({ length: 7 }, (_, i) => `<rect x="${198 + i * 58}" y="472" width="52" height="46" class="slot"/><text x="${224 + i * 58}" y="500" text-anchor="middle" class="tiny">${[52,6,4,"1/6",31,8,28][i]}</text>`).join("")}
  <rect x="650" y="18" width="132" height="526" class="rightChrome"/><rect x="664" y="36" width="104" height="90" fill="#315a45" stroke="#e0bd59"/><text x="690" y="118" class="tiny">MINIMAP</text>
  ${Array.from({ length: 9 }, (_, i) => `<rect x="${668 + (i % 3) * 34}" y="${156 + Math.floor(i / 3) * 38}" width="28" height="28" class="${i === 1 ? "slotHot" : "slot"}"/>`).join("")}
  ${button(666, 406, 96, 30, "Quest", "hero.questLog")}${button(666, 444, 96, 30, "Spells", "hero.openSpellBook")}${button(666, 482, 96, 30, "Dismiss", "hero.dismiss")}
  ${resourceBar(570)}`;
  return page(screen, body);
}

function spellBookHtml(screen) {
  const schools = ["All", "Air", "Earth", "Fire", "Water"];
  const body = `${ornateFrame()}
  <rect x="18" y="18" width="764" height="526" fill="#100906" opacity=".9"/>
  <rect x="78" y="54" width="644" height="444" rx="18" fill="#c49c5e" stroke="#3a1b0d" stroke-width="5" data-component="SpellBook"/>
  <path d="M400 62 C390 168 390 360 400 492" stroke="#70431d" stroke-width="4"/>
  <path d="M98 82 C202 52 296 72 388 94 L388 470 C288 448 194 444 98 474 Z" fill="#d9bb76" stroke="#6b3d1a"/>
  <path d="M412 94 C504 72 598 52 702 82 L702 474 C606 444 512 448 412 470 Z" fill="#d6b46f" stroke="#6b3d1a"/>
  ${schools.map((s, i) => `<g data-action="spellbook.selectSchool.${s}"><rect x="${44}" y="${92 + i * 64}" width="42" height="48" class="${i === 0 ? "slotHot" : "slot"}"/><text x="65" y="${121 + i * 64}" text-anchor="middle" class="tiny">${s}</text></g>`).join("")}
  ${Array.from({ length: 24 }, (_, i) => {
    const right = i >= 12;
    const local = i % 12;
    const x = (right ? 448 : 132) + (local % 4) * 58;
    const y = 124 + Math.floor(local / 4) * 74;
    return `<g data-spell-slot="${i}"><rect x="${x}" y="${y}" width="42" height="42" class="${i === 5 ? "slotHot" : "slot"}"/><circle cx="${x + 21}" cy="${y + 21}" r="13" fill="${["#78a2d8", "#7760b8", "#a93b20", "#2d7b4f"][i % 4]}" opacity="${i > 17 ? ".32" : ".9"}"/><text x="${x + 21}" y="${y + 58}" text-anchor="middle" class="tiny">${i > 17 ? "Locked" : "Spell"}</text></g>`;
  }).join("")}
  <rect x="132" y="384" width="224" height="68" class="status"/><text x="148" y="410" class="tiny">Stone Skin - Earth - Cost 5</text><text x="148" y="432" class="tiny">Target: allied stack or adventure hero</text>
  <rect x="446" y="384" width="206" height="68" class="status"/><text x="462" y="410" class="tiny">Mana 20/20</text><text x="462" y="432" class="tiny">Expert Wisdom enabled</text>
  ${button(260, 514, 106, 30, "CAST", "spellbook.cast")}${button(434, 514, 106, 30, "CLOSE", "spellbook.close")}
  ${resourceBar(570)}`;
  return page(screen, body);
}

function heroBackdrop() {
  return `${ornateFrame()}
  <rect x="18" y="18" width="150" height="526" fill="#253321" stroke="#e0bd59"/><path d="M28 40 C130 80 88 210 158 260 C84 338 138 460 28 528" fill="#596d42"/><text x="42" y="526" class="tiny">Adventure context</text>
  <rect x="176" y="18" width="466" height="526" class="panel"/><rect x="194" y="42" width="76" height="76" class="slotHot"/><text x="288" y="72" class="title">Darkstorn</text><text x="288" y="100" class="label">Level 5 Warlock</text>
  ${["Atk", "Def", "Pow", "Know"].map((n, i) => `<rect x="${198 + i * 78}" y="142" width="52" height="48" class="slot"/><text x="${224 + i * 78}" y="170" text-anchor="middle" class="tiny">${n}</text>`).join("")}
  ${armySlots(198, 472, "Hero Army", "#1d4774")}
  <rect x="650" y="18" width="132" height="526" class="rightChrome"/><rect x="664" y="36" width="104" height="90" fill="#315a45" stroke="#e0bd59"/><text x="690" y="118" class="tiny">MINIMAP</text>
  ${resourceBar(570)}`;
}

function heroModal(title, subtitle = "") {
  return `<rect x="132" y="72" width="536" height="398" class="panel modal" filter="url(#shadow)"/>
  <rect x="152" y="92" width="496" height="36" fill="url(#redwood)" stroke="#e4c064"/>
  <text x="400" y="116" text-anchor="middle" class="label">${esc(title)}</text>
  ${subtitle ? `<text x="400" y="146" text-anchor="middle" class="tiny">${esc(subtitle)}</text>` : ""}`;
}

function heroExtendedHtml(screen) {
  let content = "";
  if (screen.variant === "levelUp") {
    content = `${heroBackdrop()}${heroModal("Level Up", "Choose one secondary skill")}
      <rect x="164" y="164" width="104" height="128" class="redPanel"/><rect x="188" y="186" width="56" height="62" class="slotHot"/><text x="216" y="272" text-anchor="middle" class="tiny">Darkstorn</text>
      <rect x="312" y="162" width="88" height="88" class="slotHot pulse"/><text x="356" y="208" text-anchor="middle" class="label">+1</text><text x="356" y="274" text-anchor="middle" class="tiny">Spell Power</text>
      <rect x="436" y="160" width="86" height="150" class="slotHot"/><text x="479" y="188" text-anchor="middle" class="label">Wisdom</text><text x="479" y="220" text-anchor="middle" class="tiny">Advanced</text>
      <rect x="542" y="160" width="86" height="150" class="slot"/><text x="585" y="188" text-anchor="middle" class="label">Earth</text><text x="585" y="220" text-anchor="middle" class="tiny">Basic</text>
      <rect x="210" y="342" width="340" height="18" class="slot"/><rect x="210" y="342" width="260" height="18" class="slotHot"/>
      ${button(430, 406, 80, 30, "ACCEPT", "levelUp.confirm")}${button(524, 406, 80, 30, "RIGHT", "levelUp.selectRight")}`;
  } else if (screen.variant === "heroMeeting") {
    content = `${heroBackdrop()}<rect x="96" y="58" width="608" height="450" class="panel modal" filter="url(#shadow)"/>
      <text x="400" y="94" text-anchor="middle" class="title">Hero Meeting</text>
      <rect x="124" y="118" width="170" height="170" class="redPanel"/><rect x="150" y="142" width="64" height="74" class="slotHot"/><text x="224" y="170" class="label">Kaelis</text><text x="224" y="196" class="tiny">Move 1200</text>
      <rect x="506" y="118" width="170" height="170" class="redPanel"/><rect x="532" y="142" width="64" height="74" class="slot"/><text x="606" y="170" class="label">Rowan</text><text x="606" y="196" class="tiny">Move 820</text>
      ${armySlots(124, 316, "Kaelis Army", "#1d4774")}
      ${armySlots(124, 394, "Rowan Army", "#772016")}
      <path d="M310 212 C360 178 440 178 490 212" fill="none" stroke="#ffe784" stroke-width="4" marker-end="url(#arrow)" class="pulse"/>
      ${button(516, 460, 80, 30, "CLOSE", "heroMeeting.close")}`;
  } else if (screen.variant === "creatureInfo") {
    content = `${heroBackdrop()}${heroModal("Creature Info", "Base stats plus current stack modifiers")}
      <rect x="164" y="162" width="158" height="178" class="redPanel"/><circle cx="243" cy="234" r="54" fill="#7c2718" stroke="#ffe18a" class="pulse"/><text x="243" y="240" text-anchor="middle" class="label">Crusader</text>
      <rect x="350" y="162" width="138" height="178" class="status"/><text x="372" y="188" class="label">Stats</text>${["Atk 12", "Def 12", "Dmg 7-10", "HP 35", "Spd 6"].map((t, i) => `<text x="372" y="${216 + i * 24}" class="tiny">${t}</text>`).join("")}
      <rect x="514" y="162" width="122" height="178" class="status"/><text x="532" y="188" class="label">Abilities</text><text x="532" y="216" class="tiny">Double strike</text><text x="532" y="242" class="tiny">Undead hate</text><text x="532" y="268" class="tiny">Upgrade path</text>
      ${button(480, 406, 74, 30, "UPGRADE", "creatureInfo.openUpgrade")}${button(568, 406, 74, 30, "CLOSE", "creatureInfo.close")}`;
  } else if (screen.variant === "splitStack") {
    content = `${heroBackdrop()}<rect x="230" y="154" width="340" height="248" class="panel modal" filter="url(#shadow)"/>
      <text x="400" y="190" text-anchor="middle" class="title">Split Stack</text>
      <rect x="270" y="222" width="74" height="64" class="slotHot"/><text x="307" y="304" text-anchor="middle" class="tiny">Archers 52</text>
      <rect x="456" y="222" width="74" height="64" class="slot"/><text x="493" y="304" text-anchor="middle" class="tiny">New 26</text>
      <rect x="308" y="326" width="184" height="14" class="slot"/><rect x="308" y="326" width="96" height="14" class="slotHot"/><rect x="398" y="318" width="18" height="30" class="slotHot"/>
      ${button(278, 360, 58, 26, "ONE", "splitStack.one")}${button(350, 360, 58, 26, "MAX", "splitStack.max")}${button(422, 360, 58, 26, "OK", "splitStack.confirm")}${button(494, 360, 58, 26, "CANCEL", "splitStack.cancel")}`;
  } else if (screen.variant === "artifactCombine") {
    content = `${heroBackdrop()}${heroModal("Combine Artifacts", "All required pieces are owned")}
      <circle cx="400" cy="260" r="82" fill="#27150d" stroke="#e0bd59"/><rect x="370" y="230" width="60" height="60" class="slotHot pulse"/><text x="400" y="316" text-anchor="middle" class="label">Angel Wings</text>
      ${[[274,196,"Helm"],[526,196,"Sword"],[274,326,"Boot"],[526,326,"Cape"]].map(([x,y,t], i)=>`<rect x="${x}" y="${y}" width="58" height="50" class="${i<3?"slotHot":"slot"}"/><text x="${x+29}" y="${y+70}" text-anchor="middle" class="tiny">${t}</text>`).join("")}
      <path d="M332 222 C360 202 440 202 468 222 M332 352 C360 378 440 378 468 352" fill="none" stroke="#ffe784" stroke-width="3" class="pulse"/>
      ${button(438, 412, 86, 30, "COMBINE", "artifactCombine.confirm")}${button(538, 412, 76, 30, "CANCEL", "artifactCombine.cancel")}`;
  } else {
    content = `${heroBackdrop()}${heroModal("University", "Buy an offered secondary skill")}
      ${["Wisdom", "Logistics", "Earth", "Archery"].map((skill, i) => `<rect x="${166 + i * 116}" y="168" width="90" height="142" class="${i === 1 ? "slotHot" : "slot"}"/><circle cx="${211 + i * 116}" cy="214" r="28" fill="#72502c" stroke="#ffe18a"/><text x="${211 + i * 116}" y="270" text-anchor="middle" class="tiny">${skill}</text><text x="${211 + i * 116}" y="294" text-anchor="middle" class="tiny">2000g</text>`).join("")}
      <rect x="178" y="340" width="324" height="44" class="status"/><text x="196" y="366" class="tiny">Selected Logistics: open skill slot, gold available.</text>
      ${button(512, 342, 74, 30, "LEARN", "university.learn")}${button(596, 342, 74, 30, "CLOSE", "university.close")}`;
  }
  return page(screen, content);
}

function shellBase(title) {
  return `${ornateFrame()}
  <rect x="18" y="18" width="764" height="526" fill="#1b2634" stroke="#e0bd59"/>
  <path d="M18 396 C160 280 320 318 472 214 C604 124 690 154 782 92 L782 544 L18 544 Z" fill="#34452f"/>
  <rect x="38" y="38" width="724" height="52" fill="url(#redwood)" stroke="#e0bd59"/>
  <text x="400" y="72" text-anchor="middle" class="title">${esc(title)}</text>`;
}

function shellExtendedHtml(screen) {
  let content = "";
  if (screen.variant === "newGameSetup") {
    content = `${shellBase("New Game")}
      <rect x="56" y="116" width="146" height="342" class="panel"/><text x="80" y="144" class="label">Mode</text>${rowList(["Scenario", "Campaign", "Random Map", "Multiplayer"], 78, 166, 100, 28)}
      <rect x="226" y="116" width="244" height="342" class="status"/><text x="250" y="144" class="label">Scenarios</text>${rowList(["Restoration", "Good to Go", "Dragon Pass", "Realm Test", "Tutorial"], 250, 166, 178, 28)}
      <rect x="494" y="116" width="232" height="210" fill="#4c6b38" stroke="#e0bd59"/><text x="566" y="306" class="tiny">Map Preview</text>
      <rect x="494" y="348" width="232" height="74" class="status"/><text x="514" y="376" class="tiny">Difficulty: Hard</text><text x="514" y="400" class="tiny">Players: Red human, Blue AI</text>
      ${button(526, 468, 82, 30, "START", "newGame.start")}${button(622, 468, 82, 30, "BACK", "newGame.back")}`;
  } else if (screen.variant === "campaignSelection") {
    content = `${shellBase("Campaigns")}
      <rect x="72" y="120" width="184" height="350" fill="#7b4b24" stroke="#e0bd59"/><text x="104" y="150" class="label">Campaign Book</text>${rowList(["Long Live", "Dungeons", "Spoils", "Liberation"], 100, 180, 116, 34)}
      <rect x="292" y="120" width="300" height="260" fill="#c79d61" stroke="#4b260f"/><path d="M320 320 C386 240 466 286 566 198" stroke="#5d7a38" stroke-width="34" fill="none"/><text x="442" y="356" text-anchor="middle" class="tiny">Campaign Map</text>
      <rect x="620" y="130" width="88" height="170" class="status"/><text x="642" y="158" class="label">Medals</text>${smallSlots(["G", "S", "B"], 644, 182, 1, 38, 30)}
      ${button(472, 424, 82, 30, "BEGIN", "campaign.begin")}${button(568, 424, 82, 30, "BACK", "campaign.back")}`;
  } else if (screen.variant === "campaignNarrative") {
    content = `${shellBase("Briefing")}
      <rect x="70" y="118" width="184" height="300" class="redPanel"/><rect x="106" y="154" width="112" height="142" class="slotHot"/><text x="162" y="338" text-anchor="middle" class="label">Aurelia</text>
      <rect x="282" y="118" width="424" height="300" fill="#caa36a" stroke="#5a2c12"/><text x="306" y="154" class="small">Our scouts have found enemy banners near the valley.</text><text x="306" y="188" class="small">Secure the mines, hold the town, and find the grail clue.</text><text x="306" y="244" class="label">Objectives</text><text x="326" y="274" class="tiny">Victory: capture all enemy towns.</text><text x="326" y="298" class="tiny">Loss: lose starting hero.</text>
      ${smallSlots(["Gold", "Archers", "Spell"], 314, 340, 3, 58, 40)}
      ${button(488, 452, 94, 30, "START", "narrative.start")}${button(596, 452, 80, 30, "BACK", "narrative.back")}`;
  } else if (screen.variant === "introCinematic") {
    content = `${ornateFrame()}<rect x="18" y="18" width="764" height="526" fill="#050406"/><rect x="18" y="18" width="764" height="86" fill="#000"/><rect x="18" y="458" width="764" height="86" fill="#000"/>
      <rect x="74" y="126" width="652" height="300" fill="#263748" stroke="#d7b85b"/><path d="M74 370 C220 250 390 320 540 190 C632 110 690 156 726 120 L726 426 L74 426Z" fill="#5a2f20"/>
      <circle cx="612" cy="166" r="48" fill="#c99742" opacity=".72"/><text x="400" y="488" text-anchor="middle" class="label">Subtitle cue fades here.</text>
      <circle cx="358" cy="526" r="5" fill="#ffe784"/><circle cx="382" cy="526" r="5" fill="#8d6a30"/><circle cx="406" cy="526" r="5" fill="#8d6a30"/>
      ${button(664, 512, 76, 28, "SKIP", "cinematic.skip")}`;
  } else if (screen.variant === "randomMapSetup") {
    content = `${shellBase("Random Map")}
      <rect x="56" y="116" width="190" height="362" class="panel"/><text x="82" y="144" class="label">Templates</text>${rowList(["Balanced", "Ring", "Islands", "Jebus", "Custom"], 82, 166, 120, 28)}
      <rect x="274" y="116" width="220" height="362" class="status"/><text x="298" y="148" class="label">Settings</text>${["Size XL", "Players 8", "Teams 2", "Water Normal", "Monsters Strong"].map((t,i)=>`<rect x="302" y="${178+i*48}" width="150" height="26" class="slot"/><text x="318" y="${196+i*48}" class="tiny">${t}</text>`).join("")}
      <rect x="522" y="124" width="180" height="210" fill="#516b3d" stroke="#e0bd59"/><path d="M546 292 C590 214 642 260 684 188" stroke="#244f79" stroke-width="24" fill="none"/><text x="564" y="314" class="tiny">Zone preview</text>
      <rect x="522" y="360" width="180" height="38" class="status"/><text x="542" y="384" class="tiny">Seed: HR-0428</text>
      ${button(512, 448, 92, 30, "GENERATE", "rmg.generate")}${button(620, 448, 82, 30, "BACK", "rmg.back")}`;
  } else if (screen.variant === "systemMenu") {
    content = `${adventureStateBackdrop("System menu is open. Gameplay is paused for local UI only.")}
      <rect x="284" y="96" width="232" height="376" class="panel modal" filter="url(#shadow)"/><text x="400" y="134" text-anchor="middle" class="title">System</text>
      ${["Save", "Load", "Options", "Main", "Quit", "Resume"].map((n,i)=>button(326, 166+i*48, 148, 32, n.toUpperCase(), `system.${n.toLowerCase()}`)).join("")}`;
  } else if (screen.variant === "saveLoad") {
    content = `${shellBase("Save / Load")}
      <rect x="58" y="116" width="420" height="348" class="status"/><text x="82" y="144" class="label">Slots</text>${["Autosave - Day 7", "Castle Run - Day 14", "Campaign 1 - Mission 2", "Empty", "Empty", "Empty"].map((t,i)=>`<rect x="82" y="${166+i*42}" width="344" height="30" class="${i===1?"slotHot":"slot"}"/><text x="100" y="${186+i*42}" class="tiny">${t}</text>`).join("")}
      <rect x="510" y="116" width="206" height="214" fill="#4d6c3b" stroke="#e0bd59"/><text x="568" y="310" class="tiny">Selected thumbnail</text>
      <rect x="510" y="350" width="206" height="60" class="status"/><text x="530" y="374" class="tiny">Content hash: match</text><text x="530" y="396" class="tiny">Schema migration: none</text>
      ${button(500, 452, 66, 30, "SAVE", "saveLoad.save")}${button(578, 452, 66, 30, "LOAD", "saveLoad.load")}${button(656, 452, 66, 30, "BACK", "saveLoad.back")}`;
  } else if (screen.variant === "options") {
    content = `${shellBase("Options")}
      <rect x="62" y="116" width="132" height="350" class="panel"/><text x="88" y="144" class="label">Tabs</text>${rowList(["Audio", "Video", "Gameplay", "Keys"], 86, 166, 78, 30)}
      <rect x="226" y="116" width="486" height="350" class="status"/><text x="252" y="148" class="label">Audio</text>
      ${["Music", "Effects", "Voice", "UI"].map((t,i)=>`<text x="260" y="${190+i*54}" class="tiny">${t}</text><rect x="338" y="${178+i*54}" width="214" height="14" class="slot"/><rect x="338" y="${178+i*54}" width="${120+i*18}" height="14" class="slotHot"/><rect x="${452+i*18}" y="${170+i*54}" width="16" height="30" class="slotHot"/>`).join("")}
      ${["Anim Fast", "Reduced Motion Off", "Autosave On"].map((t,i)=>`<rect x="582" y="${176+i*54}" width="98" height="28" class="slot"/><text x="596" y="${194+i*54}" class="tiny">${t}</text>`).join("")}
      ${button(518, 424, 78, 30, "APPLY", "options.apply")}${button(612, 424, 78, 30, "CANCEL", "options.cancel")}`;
  } else if (screen.variant === "highScores") {
    content = `${shellBase("High Scores")}
      <rect x="82" y="118" width="530" height="330" fill="#c39a5e" stroke="#4b260f"/><text x="108" y="150" class="label">Rankings</text>${["1  Suna  49820  Day 68", "2  Kaelis   42110  Day 77", "3  Rowan 39900  Day 81", "4  Veyra 35120 Day 92", "5  Tamsin 33040 Day 96"].map((t,i)=>`<rect x="108" y="${174+i*44}" width="450" height="30" class="${i===0?"slotHot":"slot"}"/><text x="126" y="${194+i*44}" class="tiny">${t}</text>`).join("")}
      <rect x="632" y="138" width="80" height="190" class="status"/><text x="650" y="166" class="label">Medal</text><circle cx="672" cy="220" r="34" fill="#f1d176" stroke="#5a2c12" class="pulse"/>
      ${button(610, 420, 86, 30, "BACK", "scores.back")}`;
  } else if (screen.variant === "weekMonthPopup") {
    content = `${adventureStateBackdrop("A new week announcement waits for acknowledgment.")}
      <rect x="232" y="142" width="336" height="270" fill="#c8a166" stroke="#4b260f" stroke-width="3" class="modal" filter="url(#shadow)"/>
      <text x="400" y="184" text-anchor="middle" class="title">Week of the Griffin</text><circle cx="400" cy="244" r="50" fill="#8e3a22" stroke="#ffe18a" class="pulse"/><text x="400" y="250" text-anchor="middle" class="label">Griffin</text>
      <text x="300" y="322" class="tiny">All Griffin dwellings receive extra growth.</text><text x="300" y="348" class="tiny">Month 1, Week 2, Day 1</text>
      ${button(364, 382, 72, 30, "OK", "calendarPopup.ok")}`;
  } else if (screen.variant === "loadingScreen") {
    content = `${ornateFrame()}<rect x="18" y="18" width="764" height="526" fill="#111824"/><path d="M18 380 C182 246 336 314 486 196 C610 98 688 140 782 76 L782 544 L18 544 Z" fill="#4a2c1c"/>
      <text x="400" y="122" text-anchor="middle" class="huge">Loading</text><circle cx="400" cy="250" r="56" fill="#633019" stroke="#ffe18a" class="pulse"/><text x="400" y="256" text-anchor="middle" class="label">Crest</text>
      <rect x="180" y="378" width="440" height="22" class="slot"/><rect x="180" y="378" width="286" height="22" class="slotHot"/><text x="400" y="432" text-anchor="middle" class="tiny">Resolving content hashes and warming adventure assets.</text>`;
  } else if (screen.variant === "confirmationDialog") {
    content = `${adventureStateBackdrop("Confirmation is waiting for a protected action.")}
      <rect x="250" y="178" width="300" height="208" class="panel modal" filter="url(#shadow)"/><text x="400" y="224" text-anchor="middle" class="title">Are you sure?</text>
      <circle cx="400" cy="278" r="34" fill="#8e2118" stroke="#ffe18a" class="pulse"/><text x="400" y="284" text-anchor="middle" class="label">!</text>
      <text x="300" y="334" class="tiny">Unsaved progress may be lost.</text>${button(306, 352, 86, 28, "CONFIRM", "confirm.accept")}${button(410, 352, 86, 28, "CANCEL", "confirm.cancel")}`;
  } else if (screen.variant === "aiTurnIndicator") {
    content = `${adventureStateBackdrop("Blue AI is moving heroes and resolving towns.")}
      <rect x="204" y="54" width="392" height="86" class="panel modal" filter="url(#shadow)"/><circle cx="250" cy="96" r="26" fill="#244d86" stroke="#ffe18a" class="pulse"/><text x="292" y="88" class="label">Blue Player Turn</text><text x="292" y="112" class="tiny">Planning adventure movement</text>
      ${[0,1,2,3,4].map((i)=>`<circle cx="${456+i*22}" cy="96" r="7" fill="${i<3?"#ffe784":"#5d4220"}"/>`).join("")}
      ${button(626, 520, 70, 28, "FAST", "aiTurn.fastForward")}`;
  } else if (screen.variant === "multiplayerSetup") {
    content = `${shellBase("Multiplayer")}
      <rect x="64" y="118" width="190" height="338" class="panel"/><text x="92" y="148" class="label">Type</text>${rowList(["Hotseat", "LAN", "Online", "Direct"], 92, 174, 100, 30)}
      <rect x="286" y="118" width="260" height="338" class="status"/><text x="314" y="148" class="label">Players</text>${["Red Human", "Blue AI", "Tan Open", "Green Closed"].map((t,i)=>`<rect x="318" y="${174+i*48}" width="180" height="30" class="${i===0?"slotHot":"slot"}"/><text x="338" y="${194+i*48}" class="tiny">${t}</text>`).join("")}
      <rect x="576" y="132" width="118" height="158" class="status"/><text x="594" y="160" class="tiny">Hash lock</text><text x="594" y="188" class="tiny">Match</text><text x="594" y="216" class="tiny">Timer 4m</text>
      ${button(512, 426, 72, 30, "HOST", "mpSetup.host")}${button(596, 426, 72, 30, "JOIN", "mpSetup.join")}`;
  } else if (screen.variant === "hotseatHandoff") {
    content = `${ornateFrame()}<rect x="18" y="18" width="764" height="526" fill="#131922"/><rect x="18" y="18" width="764" height="526" fill="#000" opacity=".44"/>
      <path d="M120 104 L680 104 L622 438 L178 438 Z" fill="#244d86" stroke="#ffe18a" stroke-width="4" class="modal"/>
      <text x="400" y="178" text-anchor="middle" class="huge">Blue Turn</text><text x="400" y="236" text-anchor="middle" class="label">Month 1, Week 2, Day 1</text><text x="400" y="286" text-anchor="middle" class="tiny">Pass the device to the next player.</text>
      ${button(350, 350, 100, 34, "BEGIN", "hotseat.begin")}`;
  } else if (screen.variant === "networkLobby") {
    content = `${shellBase("Network Lobby")}
      <rect x="58" y="118" width="360" height="328" class="status"/><text x="82" y="148" class="label">Players</text>${["Red Suna ready", "Blue Mira ready", "Tan open", "Green AI"].map((t,i)=>`<rect x="84" y="${174+i*50}" width="250" height="32" class="${i<2?"slotHot":"slot"}"/><text x="104" y="${195+i*50}" class="tiny">${t}</text><circle cx="360" cy="${190+i*50}" r="11" fill="${i<2?"#ffe784":"#5d4220"}"/>`).join("")}
      <rect x="452" y="118" width="260" height="226" class="panel"/><text x="480" y="148" class="label">Chat</text>${rowList(["Suna: ready", "Mira: hash match", "Host: launching soon"], 482, 176, 172, 26)}
      <rect x="452" y="366" width="260" height="42" class="status"/><text x="474" y="391" class="tiny">Content hash: all players match</text>
      ${button(496, 440, 84, 30, "LAUNCH", "network.launch")}${button(596, 440, 84, 30, "LEAVE", "network.leave")}`;
  } else {
    content = `${ornateFrame()}<rect x="18" y="18" width="764" height="526" fill="#242821" stroke="#e0bd59"/>
      <rect x="18" y="18" width="764" height="42" fill="url(#redwood)" stroke="#e0bd59"/><text x="400" y="46" text-anchor="middle" class="label">Map Editor</text>
      <rect x="28" y="72" width="126" height="430" class="panel"/><text x="52" y="100" class="label">Palette</text>${rowList(["Grass", "Dirt", "Road", "River", "Town", "Mine"], 52, 126, 70, 24)}
      <rect x="172" y="72" width="430" height="430" fill="#516b38" stroke="#e0bd59"/><g opacity=".42">${hexGrid(214, 128, 8, 8)}</g><circle cx="382" cy="286" r="24" fill="#8e2118" stroke="#ffe18a" class="pulse"/>
      <rect x="620" y="72" width="142" height="430" class="status"/><text x="644" y="104" class="label">Properties</text><text x="644" y="136" class="tiny">Object: Town</text><text x="644" y="164" class="tiny">Owner: Red</text><text x="644" y="192" class="tiny">Validation: 2 issues</text>
      ${button(632, 444, 74, 28, "SAVE", "editor.save")}`;
  }
  return page(screen, content);
}

function markdownTable(rows) {
  return rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
}

function spec(screen) {
  return `# Screen ${screen.number}: ${screen.title}

### Screen Package
- Mockup: \`mockup.html\`
- Spec: \`spec.md\`
- Interactions: \`interactions.md\`
- Data Contracts: \`data-contracts.md\`
- Architecture Diagrams: \`architecture.md\`

### Description
${screen.description}

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: \`${screen.curation || "anchor-v1"}\`.
- ${screen.visual}
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- \`mockup.html\` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
${screen.components.map((component, i) => `${i === 0 ? "-" : "  -"} ${component}`).join("\n")}

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
${markdownTable(screen.bindings)}

### Mechanics Mapping
- ${screen.mechanics}
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- ${screen.animation}
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: \`${screen.id.slice(3)}\`; system group: \`${screen.system}\`; curation marker: \`${screen.curation || "anchor-v1"}\`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
`;
}

function interactions(screen) {
  return `# Screen ${screen.number}: ${screen.title}
## Interaction Map

### Source Files
- Mockup: \`mockup.html\`
- Spec: \`spec.md\`
- Data Contracts: \`data-contracts.md\`
- Architecture Diagrams: \`architecture.md\`

### Purpose
${screen.description}

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
${screen.actions.map((a) => `| ${a[0]} | ${a[1]} | ${a[2]} | ${a[3]} | ${a[4]} | ${a[5]} | ${screen.animation} |`).join("\n")}

### State Changes
${screen.bindings.map((b) => `- \`${b[1]}\` refreshes \`${b[0]}\` after the owning reducer or local UI draft changes.`).join("\n")}
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
${screen.actions.filter((a) => a[3] !== "Current screen").map((a) => `- ${a[0]} can route to ${a[3]} after guard approval and exit animation.`).join("\n")}

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- \`spec.md\` owns static regions and state bindings.
- \`architecture.md\` diagrams must mirror these interactions rather than inventing new behavior.
`;
}

function dataContracts(screen) {
  return `# Screen ${screen.number}: ${screen.title}
## Data Contracts

### Source Files
- Mockup: \`mockup.html\`
- Spec: \`spec.md\`
- Interactions: \`interactions.md\`
- Architecture Diagrams: \`architecture.md\`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| \`asset-index.schema.json\` | Backgrounds, frames, icons, cursor sprites, animation manifests. | \`content-schema/schemas/asset-index.schema.json\` |
| \`localization.schema.json\` | UI labels, status text, disabled reasons, error messages. | \`content-schema/schemas/localization.schema.json\` |
| \`ruleset.schema.json\` | Deterministic constants, formulas, and guard rules consumed by commands. | \`content-schema/schemas/ruleset.schema.json\` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
${screen.bindings.map((b) => `| \`${b[0]}\` | \`${b[1]}\` | ${b[2]} |`).join("\n")}

### Commands And Events
${screen.actions.map((a) => `- ${a[4]} from ${a[1]}: ${a[5]}`).join("\n")}

### Config Keys
- \`config.ui.locale\`
- \`config.ui.reducedMotion\`
- \`config.ui.animationSpeed\`
- \`config.audio.enabled\`
- \`config.audio.uiVolume\`
- \`config.render.pixelSnap\`

### Localization Keys
- \`ui.${screen.id.slice(3)}.title\`
- \`ui.${screen.id.slice(3)}.actions.*\`
- \`ui.${screen.id.slice(3)}.status.*\`
- \`ui.${screen.id.slice(3)}.errors.*\`
- \`ui.common.ok\`, \`ui.common.cancel\`, \`ui.common.back\`, \`ui.common.close\`

### Asset, Sound, And VFX IDs
- \`ui.${screen.id.slice(3)}.background\`
- \`ui.${screen.id.slice(3)}.frame\`
- \`ui.${screen.id.slice(3)}.icons.*\`
- \`audio.ui.hover\`, \`audio.ui.click\`, \`audio.${screen.system}.*\`
- \`vfx.${screen.id.slice(3)}.*\`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- ${screen.mechanics}
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
`;
}

function architecture(screen) {
  return `# Screen ${screen.number} Architecture: ${screen.title}

System: ${screen.system}
Screen ID: ${screen.id.slice(3)}
Visual Archetype: ${screen.archetype}
Curation Status: ${screen.curation || "anchor-v1"}

## Purpose
${screen.description}

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
\`\`\`mermaid
flowchart TD
  Root["${screen.title}"]
${screen.components.slice(1).map((component, i) => `  C${i}["${component}"]\n  Root --> C${i}`).join("\n")}
\`\`\`

## Screen Load And Data Resolution
\`\`\`mermaid
flowchart LR
${screen.diagram.load.map((item, i) => `  L${i}["${item}"]${i < screen.diagram.load.length - 1 ? ` --> L${i + 1}` : ""}`).join("\n")}
\`\`\`

## Main Interaction Flow
\`\`\`mermaid
flowchart TD
${screen.diagram.command.map((item, i) => `  I${i}["${item}"]${i < screen.diagram.command.length - 1 ? ` --> I${i + 1}` : ""}`).join("\n")}
\`\`\`

## Animation Flow
\`\`\`mermaid
sequenceDiagram
  participant UI
  participant Draft as UI Draft
  participant Guard
  participant Reducer
  participant VFX
  UI->>Draft: hover/select/preview
  Draft->>VFX: ${screen.diagram.animation[0]}
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: ${screen.diagram.animation.at(-1)}
\`\`\`

## Outgoing Transitions
\`\`\`mermaid
flowchart LR
  Current["${screen.title}"]
${screen.actions.filter((a) => a[3] !== "Current screen").map((a, i) => `  Current --> T${i}["${a[3].replaceAll("`", "")}"]`).join("\n") || '  Current --> CurrentRefresh["Refresh current screen"]'}
\`\`\`

## State Inputs
${screen.bindings.map((b) => `- ${b[0]} -> ${b[1]}`).join("\n")}

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
`;
}

function writeScreen(screen) {
  const dir = join(SCREENS_DIR, screen.id);
  writeFileSync(join(dir, "mockup.html"), screen.html({ ...screen, id: screen.id }));
  writeFileSync(join(dir, "spec.md"), spec(screen));
  writeFileSync(join(dir, "interactions.md"), interactions(screen));
  writeFileSync(join(dir, "data-contracts.md"), dataContracts(screen));
  writeFileSync(join(dir, "architecture.md"), architecture(screen));
}

function writePlan() {
  const dirs = readdirSync(SCREENS_DIR).filter((name) => /^\d{2}-/.test(name)).sort();
  const done = new Set(Object.keys(screens));
  const rows = dirs.map((dir) => {
    const specPath = join(SCREENS_DIR, dir, "spec.md");
    const spec = readFileSync(specPath, "utf8");
    const title = spec.match(/^# Screen \d+:\s+(.+)$/m)?.[1] || dir.slice(3).replaceAll("-", " ");
    const status = done.has(dir) ? (screens[dir].curation || "curated anchor-v1") : "todo curated-pass";
    const refs = done.has(dir) ? "Internal UI contract" : "assign internal visual direction before editing";
    const work = done.has(dir)
      ? "Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams."
      : "Rewrite mockup, spec, interactions, data contracts, and architecture diagrams one screen at a time.";
    return `| ${dir.slice(0, 2)} | ${title} | ${status} | ${refs} | ${work} |`;
  });

  writeFileSync(PLAN_PATH, `# UI Screen Curation Plan

This file tracks the manual pass needed to replace scaffold-like screen packages with screen-specific original classic-strategy contracts.

## Rules
- Do one screen package at a time.
- Do not run scaffold generation over curated files.
- Mockup owns visible UI only; no explanatory prose belongs in the mockup.
- Spec owns component/state contract.
- Interactions own next screen, command/event, data update, animation, disabled, and error behavior.
- Data contracts own schemas, configs, localization, assets, sound, VFX, save, and replay references.
- Architecture owns small screen-specific diagrams. Shared mechanics belong in general architecture diagrams.
- After each batch run \`npm run generate:wiki\`, \`npm run validate:links\`, \`npm run validate:contracts\`, \`npm run validate:cross-refs\`, \`npm run validate:tasks\`, and \`npm test\`.

## Anchor Batch
- \`01-main-menu\`
- \`07-adventure-map\`
- \`24-town-screen\`
- \`38-combat-screen\`
- \`46-hero-screen\`
- \`47-spell-book\`

## Curated Pass 2
- \`25-building-recruitment-dialog\`
- \`26-marketplace\`
- \`27-thieves-guild\`
- \`28-tavern\`
- \`29-mage-guild\`
- \`30-build-tree\`
- \`39-battle-results\`
- \`40-pre-battle-dialog\`
- \`41-surrender-cost-dialog\`
- \`42-victory-defeat-cinematic\`
- \`43-siege-combat\`
- \`44-combat-spell-targeting\`
- \`45-tactics-phase\`

## Curated Pass 3
- \`08-kingdom-overview\`
- \`09-map-object-dialog\`
- \`10-puzzle-map\`
- \`11-quest-log\`
- \`12-creature-bank-loot\`
- \`13-hill-fort\`
- \`14-war-machine-factory\`
- \`15-underground-toggle\`
- \`16-view-world\`
- \`17-adventure-spell-targeting\`
- \`18-map-object-tooltip\`
- \`19-status-bar\`
- \`20-mine-visit-dialog\`
- \`21-external-dwelling\`
- \`22-garrison-structure\`
- \`23-hero-prison\`

## Curated Pass 4
- \`31-grail-building\`
- \`32-artifact-merchant-black-market\`
- \`33-shipyard\`
- \`34-fort-view\`
- \`35-town-flyby\`
- \`36-marketplace-artifact-trading\`
- \`37-quick-recruit-window\`

## Curated Pass 5
- \`48-level-up-dialog\`
- \`49-hero-meeting\`
- \`50-creature-info\`
- \`51-split-stack-dialog\`
- \`52-artifact-combine-dialog\`
- \`53-university\`

## Curated Pass 6
- \`02-new-game-setup\`
- \`03-campaign-selection\`
- \`04-campaign-narrative\`
- \`05-intro-cinematic\`
- \`06-random-map-setup\`
- \`54-system-menu\`
- \`55-save-load\`
- \`56-options\`
- \`57-high-scores\`
- \`58-week-month-popup\`
- \`59-loading-screen\`
- \`60-confirmation-dialog\`
- \`61-ai-turn-indicator\`
- \`62-multiplayer-setup\`
- \`63-hotseat-turn-handoff\`
- \`64-network-lobby\`
- \`65-map-editor\`

## Matrix
| # | Screen | Status | Reference Inputs | Required Work |
| --- | --- | --- | --- | --- |
${rows.join("\n")}
`);
}

for (const [id, screen] of Object.entries(screens)) {
  screen.id = id;
  writeScreen(screen);
  console.log(`curated ${id}`);
}
writePlan();
console.log("updated docs/architecture/wiki/screen-curation-plan.md");
