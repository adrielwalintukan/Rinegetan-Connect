// P5-001: the two decisions the update banner makes, kept as pure functions so they can be
// tested without a browser and so the component cannot quietly change its mind about them.

/**
 * A banner is only useful when a newer worker has finished installing while an older one is still
 * serving the page. On a first install there is nothing to move away from, so announcing it would
 * ask the visitor to reload for no reason.
 * A worker built from the same release as the page is not news to the visitor: navigations are
 * network-first, so the page on screen is already that release. It is activated silently instead.
 * @param {{ state?: string | null, hasController?: boolean, workerBuild?: string | null, pageBuild?: string | null }} input
 */
export function shouldAnnounceUpdate(input) {
  return input?.state === "installed" && input?.hasController === true && !isPageBuild(input);
}

/**
 * The waiting worker matches the page that is already showing, so it can take over without a
 * banner and without a reload.
 * @param {{ state?: string | null, hasController?: boolean, workerBuild?: string | null, pageBuild?: string | null }} input
 */
export function shouldActivateSilently(input) {
  return input?.state === "installed" && input?.hasController === true && isPageBuild(input);
}

/** @param {{ workerBuild?: string | null, pageBuild?: string | null }} input */
function isPageBuild(input) {
  return Boolean(input?.workerBuild) && input?.workerBuild === input?.pageBuild;
}

/**
 * A page must reload when the worker underneath it was replaced, but not when the very first
 * worker claims it: that page came from the network and nothing about it is stale.
 * Nor when the page itself activated a worker of its own release: nothing on screen is stale.
 * @param {{ controlledOnLoad?: boolean, alreadyReloading?: boolean, silentUpdate?: boolean }} input
 */
export function shouldReloadOnControllerChange(input) {
  return input?.controlledOnLoad === true && input?.alreadyReloading !== true && input?.silentUpdate !== true;
}
