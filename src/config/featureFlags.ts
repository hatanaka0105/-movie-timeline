// Feature flags for gradual rollout of optimizations
export const featureFlags = {
  // Phase 2.1: Spatial Hashing for layout calculation
  useOptimizedLayout: true, // Enabled: O(n) collision detection via Spatial Hashing

  // Phase 2.3: Image lazy loading
  useLazyLoadImages: true, // Safe to enable by default

  // Future flags
  useVirtualScroll: false, // Phase 2.2 (optional)
} as const;

export type FeatureFlags = typeof featureFlags;
