// P5-001: the two decisions the update banner makes, kept as pure functions so they can be
// tested without a browser and so the component cannot quietly change its mind about them.

/**
 * A banner is only useful when a newer worker has finished installing while an older one is still
 * serving the page. On a first install there is nothing to move away from, so announcing it would
 * ask the visitor to reload for no reason.
 * @param {{ state?: string | null, hasController?: boolean }} input
 */
export function shouldAnnounceUpdate(input) {
  return input?.state === "installed" && input?.hasController === true;
}

/**
 * A page must reload when the worker underneath it was replaced, but not when the very first
 * worker claims it: that page came from the network and nothing about it is stale.
 * @param {{ controlledOnLoad?: boolean, alreadyReloading?: boolean }} input
 */
export function shouldReloadOnControllerChange(input) {
  return input?.controlledOnLoad === true && input?.alreadyReloading !== true;
}
