// Benchmark test for layout calculation performance
// Run this with: npm run test:benchmark

import { calculateTimelineLayout as calculateOriginal } from './layoutCalculator';
import { calculateTimelineLayout as calculateOptimized } from './layoutCalculatorOptimized';
import { Movie } from '../types';

// Generate mock movies for testing
function generateMockMovies(count: number): Movie[] {
  const movies: Movie[] = [];
  const startYear = 1900;

  for (let i = 0; i < count; i++) {
    const year = startYear + Math.floor(Math.random() * 150); // Random year between 1900-2050
    const hasSpan = Math.random() > 0.7; // 30% chance of having end year

    movies.push({
      id: `mock-${i}`,
      tmdbId: i,
      title: `Movie ${i}`,
      releaseDate: `${year}-01-01`,
      posterPath: null,
      overview: '',
      genres: [],
      timeline: {
        startYear: year,
        endYear: hasSpan ? year + Math.floor(Math.random() * 20) : null,
        period: `${year}年`,
        confidence: 'high',
        source: 'mock',
      },
    });
  }

  return movies;
}

// Benchmark function
function benchmark(
  name: string,
  fn: (movies: Movie[], width: number, scale: number, size: 'medium') => unknown,
  movies: Movie[],
  iterations = 10
): number {
  const width = 1200;
  const scale = 10;
  const size = 'medium' as const;

  // Warmup
  fn(movies, width, scale, size);

  // Measure
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn(movies, width, scale, size);
  }
  const end = performance.now();

  const avgTime = (end - start) / iterations;
  console.log(`${name}: ${avgTime.toFixed(2)}ms (avg of ${iterations} runs)`);

  return avgTime;
}

// Run benchmarks
export function runLayoutBenchmarks() {
  console.log('=== Layout Calculation Benchmark ===\n');

  const testSizes = [10, 50, 100, 200];

  testSizes.forEach(size => {
    console.log(`\n--- Testing with ${size} movies ---`);
    const movies = generateMockMovies(size);

    const originalTime = benchmark('Original (O(n²))', calculateOriginal, movies);
    const optimizedTime = benchmark('Optimized (O(n))', calculateOptimized, movies);

    const improvement = ((originalTime - optimizedTime) / originalTime * 100).toFixed(1);
    const speedup = (originalTime / optimizedTime).toFixed(2);

    console.log(`Improvement: ${improvement}% faster (${speedup}x speedup)`);
  });

  console.log('\n=== Benchmark Complete ===');
}

// Visual comparison test - ensure results are identical
export function verifyLayoutConsistency() {
  console.log('\n=== Layout Consistency Verification ===\n');

  const testCases = [
    { name: 'Small dataset', count: 10 },
    { name: 'Medium dataset', count: 50 },
    { name: 'Large dataset', count: 100 },
  ];

  let allPassed = true;

  testCases.forEach(({ name, count }) => {
    const movies = generateMockMovies(count);
    const width = 1200;
    const scale = 10;
    const size = 'medium' as const;

    const originalLayout = calculateOriginal(movies, width, scale, size);
    const optimizedLayout = calculateOptimized(movies, width, scale, size);

    // Compare layouts
    let passed = true;

    if (originalLayout.length !== optimizedLayout.length) {
      console.log(`❌ ${name}: Length mismatch (${originalLayout.length} vs ${optimizedLayout.length})`);
      passed = false;
      allPassed = false;
    } else {
      // Check each movie's position (allow small floating point differences)
      const tolerance = 0.1;

      for (let i = 0; i < originalLayout.length; i++) {
        const orig = originalLayout[i];
        const opt = optimizedLayout[i];

        if (
          orig.movieId !== opt.movieId ||
          Math.abs(orig.x - opt.x) > tolerance ||
          Math.abs(orig.y - opt.y) > tolerance ||
          orig.column !== opt.column
        ) {
          console.log(`❌ ${name}: Position mismatch at index ${i}`);
          console.log(`  Original: ${JSON.stringify(orig)}`);
          console.log(`  Optimized: ${JSON.stringify(opt)}`);
          passed = false;
          allPassed = false;
          break;
        }
      }

      if (passed) {
        console.log(`✅ ${name}: Layouts match perfectly`);
      }
    }
  });

  console.log(`\n${allPassed ? '✅ All tests passed' : '❌ Some tests failed'}`);
  return allPassed;
}

// Run both benchmarks and verification
if (import.meta.env.MODE === 'test') {
  verifyLayoutConsistency();
  runLayoutBenchmarks();
}
