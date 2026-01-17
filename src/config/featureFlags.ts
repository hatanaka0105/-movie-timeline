// Feature flags for gradual rollout of optimizations
export const featureFlags = {
  // Phase 2.1: Spatial Hashing for layout calculation
  useOptimizedLayout: false, // Set to true to enable O(n) collision detection

  // Phase 2.3: Image lazy loading
  useLazyLoadImages: true, // Safe to enable by default

  // Future flags
  useVirtualScroll: false, // Phase 2.2 (optional)
} as const;

export type FeatureFlags = typeof featureFlags;
