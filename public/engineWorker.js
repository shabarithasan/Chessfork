var _currentLines = {};
var _lastSentDepth = 0;
var _currentFen = '';
var _currentSearchId = 0;
var _sentFirstAnalysis = false;
var _expectingBestmove = false;
var _isSearching = false;
var _pendingStart = null;
var _engineReady = false;
var _origPostMessage = self.postMessage.bind(self);

// Intercept postMessage to capture Stockfish output
self.postMessage = function(msg) {
  try {
    if (typeof msg === 'string') {
      if (msg.startsWith('info') || msg === 'uciok' || msg.startsWith('bestmove') || msg === 'readyok') {
        if (msg.startsWith('info')) {
          var parsed = parseInfo(msg);
          var depthMatch = msg.match(/ depth (\d+)/);
          var depthNum = depthMatch ? parseInt(depthMatch[1]) : 0;
          if (depthNum > 0 && depthNum < _lastSentDepth - 1) { _lastSentDepth = 0; }
          if (parsed) {
            if (!_currentLines[parsed.multiPv]) _currentLines[parsed.multiPv] = parsed;
            else for (var k in parsed) _currentLines[parsed.multiPv][k] = parsed[k];
            if (depthNum > _lastSentDepth && Object.keys(_currentLines).length > 0) {
              _lastSentDepth = depthNum;
              _origPostMessage({
                type: 'analysis',
                lines: Object.values(_currentLines).sort(function(a, b) { return a.multiPv - b.multiPv; }),
                depth: depthNum,
                searchId: _currentSearchId,
                fen: _currentFen,
              });
            }
          }
        } else if (msg === 'uciok') {
          _engineReady = true;
          _origPostMessage({ type: 'ready' });
          if (_pendingStart) {
            var queuedStart = _pendingStart;
            _pendingStart = null;
            beginSearch(queuedStart);
          }
        } else if (msg.startsWith('bestmove')) {
          if (_expectingBestmove) {
            _expectingBestmove = false;
            _isSearching = false;
            if (_pendingStart) {
              var nextStart = _pendingStart;
              _pendingStart = null;
              beginSearch(nextStart);
              return;
            }
            _origPostMessage({
              type: 'bestmove',
              bestmove: msg.split(' ')[1],
              lines: Object.values(_currentLines).sort(function(a, b) { return a.multiPv - b.multiPv; }),
              searchId: _currentSearchId,
              fen: _currentFen,
            });
            _currentLines = {};
            _lastSentDepth = 0;
          } else {
            _isSearching = false;
            _origPostMessage({
              type: 'bestmove',
              bestmove: msg.split(' ')[1],
              lines: Object.values(_currentLines).sort(function(a, b) { return a.multiPv - b.multiPv; }),
              searchId: _currentSearchId,
              fen: _currentFen,
            });
            _currentLines = {};
            _lastSentDepth = 0;
          }
        }
        return;
      }
    }
    _origPostMessage(msg);
  } catch(e) {
  }
};

function parseInfo(line) {
  var parts = line.split(' ');
  var scoreIdx = parts.indexOf('cp') !== -1 ? parts.indexOf('cp') : parts.indexOf('mate');
  var pvIdx = parts.indexOf('pv');
  if (scoreIdx === -1 || pvIdx === -1) return null;
  var multipvIdx = parts.indexOf('multipv');
  var multiPv = multipvIdx !== -1 ? parseInt(parts[multipvIdx + 1]) : 1;
  return {
    multiPv: multiPv,
    evaluation: parts[scoreIdx] === 'cp'
      ? { type: 'cp', value: parseInt(parts[scoreIdx + 1]) / 100 }
      : { type: 'mate', value: parseInt(parts[scoreIdx + 1]) },
    pv: parts.slice(pvIdx + 1),
  };
}

function beginSearch(data) {
  _sentFirstAnalysis = false;
  _currentLines = {};
  _lastSentDepth = 0;
  _currentSearchId = data.searchId || 0;
  _currentFen = data.fen;
  _expectingBestmove = false;
  _isSearching = true;
  _engineHandler({ data: 'setoption name MultiPV value ' + (data.multiPV || 3) });
  _engineHandler({ data: 'position fen ' + data.fen });
  _engineHandler({ data: 'go depth ' + (data.depth || 14) });
}

// Load stockfish.js — this runs the auto-init and sets up onmessage
// stockfish.js only attempts streaming compilation and has no ArrayBuffer
// fallback: if the .wasm ever arrives without an application/wasm
// Content-Type (e.g. an intermittent dev-server hiccup), the engine silently
// dies. Fall back to byte-array instantiation so the engine always starts.
var _origInstantiateStreaming = WebAssembly.instantiateStreaming;
WebAssembly.instantiateStreaming = function(response, imports) {
  return _origInstantiateStreaming(response, imports).catch(function(err) {
    try {
      return response.arrayBuffer().then(function(bytes) {
        return WebAssembly.instantiate(bytes, imports);
      });
    } catch (e) {
      throw err;
    }
  });
};
self.importScripts('/stockfish/stockfish.js');

// Stockfish's handler is now self.onmessage. Save it.
var _engineHandler = self.onmessage;

// Initialize: send 'uci'
_engineHandler({ data: 'uci' });

// Wrap onmessage to handle command objects
self.onmessage = function(e) {
  try {
    var data = e.data;
    if (typeof data === 'object' && data !== null && data.command) {
      if (data.command === 'start') {
        // Stockfish can receive messages before its UCI handshake completes
        // on slower devices. Queue the latest position instead of starting a
        // search that the WASM runtime may silently discard.
        if (!_engineReady) {
          _pendingStart = data;
          return;
        }
        // Do not label output from the just-stopped position as output for the
        // next one. Wait for its bestmove acknowledgement before changing the
        // FEN/search id, while retaining the useful transposition-table cache.
        if (_isSearching) {
          _pendingStart = data;
          _expectingBestmove = true;
          _engineHandler({ data: 'stop' });
        } else {
          beginSearch(data);
        }
      } else if (data.command === 'stop') {
        _currentLines = {};
        _lastSentDepth = 0;
        _pendingStart = null;
        // An idle Stockfish has no `bestmove` acknowledgement to send. Only
        // wait for one when an actual search is active.
        if (_isSearching) {
          _expectingBestmove = true;
          _engineHandler({ data: 'stop' });
        }
      }
      return;
    }
    if (typeof _engineHandler === 'function') _engineHandler(e);
  } catch(e2) {
  }
};
