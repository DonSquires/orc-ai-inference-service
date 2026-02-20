'use strict';

/**
 * Model registry – tracks async load state for each registered model.
 * Replace the stub entries with real model loaders as needed.
 */

const registry = {
  // Each entry: { status: 'loading'|'ready'|'error', error?: string }
};

/**
 * Register and (asynchronously) load a model by name.
 * @param {string} name   - Human-readable model identifier.
 * @param {() => Promise<void>} loader - Async function that loads/warms the model.
 */
function registerModel(name, loader) {
  registry[name] = { status: 'loading' };

  loader()
    .then(() => {
      registry[name] = { status: 'ready' };
    })
    .catch((err) => {
      registry[name] = { status: 'error', error: err.message };
    });
}

/**
 * Returns a shallow copy of the current model registry.
 */
function getModels() {
  return { ...registry };
}

/**
 * Returns true only when every registered model has loaded successfully.
 * Computed on-demand from the registry to avoid race conditions.
 */
function isReady() {
  const entries = Object.values(registry);
  return entries.length > 0 && entries.every((m) => m.status === 'ready');
}

module.exports = { registerModel, getModels, isReady };
