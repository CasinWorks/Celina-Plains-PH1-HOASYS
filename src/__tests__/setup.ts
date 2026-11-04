import "@testing-library/jest-dom/vitest";

// Dexie needs indexedDB in jsdom — use fake-indexeddb if available, else polyfill lightly.
import "fake-indexeddb/auto";
