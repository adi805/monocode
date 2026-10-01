import {
  bindOpenCrabsSession,
  cancelOpenCrabsTurn,
  compactOpenCrabsContext,
  forgetOpenCrabsSession,
  openCrabsCommands,
  respondOpenCrabsApproval,
  sendOpenCrabsTurn,
  steerOpenCrabsTurn,
  stopOpenCrabsSession,
} from "./opencrabs";
import {
  generateOpenCrabsBranchName,
  generateOpenCrabsCommitMessage,
  generateOpenCrabsPrContent,
} from "./opencrabsGit";
import { generateOpenCrabsSessionTitle } from "./opencrabsTitle";
import { registerHarness, type HarnessAdapter } from "../../core/registry";
import { discoverOpenCrabsModels } from "./opencrabsCatalog";
import { setHarnessModels } from "../../../../features/sessions/model/models";

/** Probe the live server catalog so the picker is populated before the first
 * chat. Mirrors hermesAdapter.refreshCatalog; hasLiveCatalog() in the registry
 * prevents repeated probes. */
async function refreshOpenCrabsCatalog(): Promise<void> {
  const models = await discoverOpenCrabsModels();
  if (models.length > 0) setHarnessModels("opencrabs", models);
}

export const openCrabsAdapter: HarnessAdapter = {
  id: "opencrabs",
  live: true,
  sendTurn: sendOpenCrabsTurn,
  steerTurn: steerOpenCrabsTurn,
  cancelTurn: cancelOpenCrabsTurn,
  respondApproval: respondOpenCrabsApproval,
  stopSession: stopOpenCrabsSession,
  forgetSession: forgetOpenCrabsSession,
  bindSession: bindOpenCrabsSession,
  compactContext: compactOpenCrabsContext,
  commands: openCrabsCommands,
  refreshCatalog: refreshOpenCrabsCatalog,
  generateTitle: generateOpenCrabsSessionTitle,
  generateCommitMessage: generateOpenCrabsCommitMessage,
  generatePrContent: generateOpenCrabsPrContent,
  generateBranchName: generateOpenCrabsBranchName,
};

let registered = false;

export function ensureOpenCrabsRegistered(): void {
  if (registered) return;
  registerHarness(openCrabsAdapter);
  registered = true;
}
