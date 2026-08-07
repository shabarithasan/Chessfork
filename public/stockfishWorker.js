// Dedicated worker entry point for the client-side Stockfish WASM engine.
// Keeping this stable URL means React never loads Stockfish into the main UI
// thread; engineWorker owns the UCI bridge and imports stockfish.js/.wasm.
importScripts('/engineWorker.js');
