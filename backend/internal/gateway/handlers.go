package gateway

import (
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/mydisha/keirouter/backend/internal/core"
	"github.com/mydisha/keirouter/backend/internal/pipeline"
	"github.com/mydisha/keirouter/backend/internal/transform"
)

// maxBodyBytes caps inbound request bodies to protect against oversized uploads.
const maxBodyBytes = 32 << 20 // 32 MiB

// logRequest logs a completed request to the console log buffer.
func (s *Server) logRequest(provider, model string, tokens int, costMicros int64, latencyMs int, cacheHit bool, err error) {
	if s.consoleLog == nil {
		return
	}
	level := "INFO"
	if err != nil {
		level = "ERROR"
	} else if latencyMs > 8000 {
		level = "WARN"
	}
	cost := float64(costMicros) / 1_000_000
	cache := ""
	if cacheHit {
		cache = " · cache"
	}
	s.consoleLog.Logf(level, "%s · %s · %d tok · $%.4f · %dms%s",
		provider, model, tokens, cost, latencyMs, cache)
	if err != nil {
		s.consoleLog.Logf("ERROR", "  └─ %v", err)
	}
}

// handleOpenAIChat serves /v1/chat/completions in the OpenAI dialect.
func (s *Server) handleOpenAIChat(w http.ResponseWriter, r *http.Request) {
	s.handleChat(w, r, core.DialectOpenAI)
}

// handleAnthropicMessages serves /v1/messages in the Anthropic dialect.
func (s *Server) handleAnthropicMessages(w http.ResponseWriter, r *http.Request) {
	s.handleChat(w, r, core.DialectAnthropic)
}

// handleOpenAIResponses serves /v1/responses in the OpenAI Responses dialect
// (Codex and Responses-native clients).
func (s *Server) handleOpenAIResponses(w http.ResponseWriter, r *http.Request) {
	s.handleChat(w, r, core.DialectOpenAIResponses)
}

// handleChat is the shared chat handler parameterized by the client dialect.
func (s *Server) handleChat(w http.ResponseWriter, r *http.Request, dialect core.Dialect) {
	key, _ := authedKey(r.Context())
	tenantID := tenantOf(key)
	client := detectClient(r)

	s.consoleLog.Logf("DEBUG", "→ %s %s · dialect=%s · client=%s · key=%s",
		r.Method, r.URL.Path, dialect, client, key.ID)

	codec, err := s.codecs.Codec(dialect)
	if err != nil {
		s.consoleLog.Logf("ERROR", "unsupported dialect: %s", dialect)
		writeError(w, http.StatusInternalServerError, "unsupported dialect")
		return
	}

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	if err != nil {
		s.consoleLog.Logf("ERROR", "failed to read body: %v", err)
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}
	s.consoleLog.Logf("DEBUG", "  body read: %d bytes", len(body))

	req, err := codec.ParseRequest(body)
	if err != nil {
		s.consoleLog.Logf("ERROR", "parse failed: %v", err)
		writeError(w, http.StatusBadRequest, "invalid request: "+err.Error())
		return
	}

	// Attach routing metadata.
	req.Metadata = core.RequestMetadata{
		ClientKind:    client,
		SourceDialect: dialect,
		APIKeyID:      key.ID,
		TenantID:      tenantID,
		ProjectID:     key.ProjectID,
	}

	s.consoleLog.Logf("DEBUG", "  model=%s · stream=%v · messages=%d · tenant=%s",
		req.Model, req.Stream, len(req.Messages), tenantID)

	targets, err := resolveTargets(r.Context(), s.chains, s.aliases, tenantID, req.Model)
	if err != nil {
		var bad badModelError
		if errors.As(err, &bad) {
			s.consoleLog.Logf("WARN", "bad model: %s", bad.Error())
			writeError(w, http.StatusBadRequest, bad.Error())
			return
		}
		s.consoleLog.Logf("ERROR", "resolve targets failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to resolve model")
		return
	}

	for i, t := range targets {
		s.consoleLog.Logf("DEBUG", "  target[%d]: %s/%s", i, t.Provider, t.Model)
	}

	opts := pipeline.Options{
		Targets: targets,
		Slimmer: s.slimmerConfig(),
		Terse:   s.terseConfig(),
		Caveman: s.cavemanConfig(),
	}

	if req.Stream {
		s.consoleLog.Logf("DEBUG", "  entering stream path")
		s.streamChat(w, r, codec, req, opts)
		return
	}
	s.consoleLog.Logf("DEBUG", "  entering unary path")
	s.unaryChat(w, r, codec, req, opts)
}

// unaryChat runs a non-streaming request and renders the response.
func (s *Server) unaryChat(w http.ResponseWriter, r *http.Request, codec transform.Codec, req *core.ChatRequest, opts pipeline.Options) {
	start := time.Now()
	s.consoleLog.Logf("DEBUG", "  ▶ pipeline.Chat() start")
	result, err := s.pipeline.Chat(r.Context(), req, opts)
	latency := int(time.Since(start).Milliseconds())
	if err != nil {
		s.consoleLog.Logf("ERROR", "  ✖ pipeline.Chat() failed after %dms: %v", latency, err)
		s.logRequest(req.Model, req.Model, 0, 0, latency, false, err)
		s.writeProviderError(w, err)
		return
	}

	out, err := codec.RenderResponse(result.Response)
	if err != nil {
		s.consoleLog.Logf("ERROR", "  ✖ render failed: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to render response")
		return
	}
	tokens := result.Response.Usage.PromptTokens + result.Response.Usage.CompletionTokens
	s.consoleLog.Logf("DEBUG", "  ✔ %s/%s · %d tok · acct=%s · cache=%v · %dms",
		result.Provider, result.Model, tokens, result.AccountID, result.CacheHit, latency)
	s.logRequest(result.Provider, result.Model, tokens, result.CostMicros, latency, result.CacheHit, nil)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-KeiRouter-Provider", result.Provider)
	w.Header().Set("X-KeiRouter-Model", result.Model)
	if result.CacheHit {
		w.Header().Set("X-KeiRouter-Cache", "hit")
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(out)
}

// streamChat runs a streaming request and relays SSE events in the client's
// dialect, honoring client disconnects and the configured stall timeout.
func (s *Server) streamChat(w http.ResponseWriter, r *http.Request, codec transform.Codec, req *core.ChatRequest, opts pipeline.Options) {
	streamCodec, ok := codec.(transform.StreamCodec)
	if !ok {
		writeError(w, http.StatusInternalServerError, "dialect does not support streaming")
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming unsupported by server")
		return
	}

	start := time.Now()
	s.consoleLog.Logf("DEBUG", "  ▶ pipeline.Stream() start")
	result, err := s.pipeline.Stream(r.Context(), req, opts)
	if err != nil {
		latency := int(time.Since(start).Milliseconds())
		s.consoleLog.Logf("ERROR", "  ✖ pipeline.Stream() failed after %dms: %v", latency, err)
		s.logRequest(req.Model, req.Model, 0, 0, latency, false, err)
		s.writeProviderError(w, err)
		return
	}
	s.consoleLog.Logf("DEBUG", "  ✔ stream connected: %s/%s · acct=%s",
		result.Provider, result.Model, result.AccountID)

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-KeiRouter-Provider", result.Provider)
	w.Header().Set("X-KeiRouter-Model", result.Model)
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	state := &transform.StreamState{Model: result.Model}
	streamStart := time.Now()
	var totalTokens int
	var chunkCount int

	// ToolArgSanitizer buffers streaming tool call arguments and emits
	// sanitized JSON when each tool call completes. This fixes malformed
	// arguments from non-Anthropic models (e.g., Read.limit as string).
	sanitizer := transform.NewToolArgSanitizer()
	renderChunk := func(cleaned core.StreamChunk) {
		events, rerr := streamCodec.RenderStreamChunk(cleaned, state)
		if rerr != nil {
			s.log.Warn("failed to render stream chunk", "err", rerr)
			return
		}
		for _, ev := range events {
			if _, werr := w.Write(ev); werr != nil {
				s.consoleLog.Logf("WARN", "  client disconnected after %d chunks", chunkCount)
				return
			}
		}
		flusher.Flush()
	}

	for chunk := range result.Chunks {
		if chunk.Type == core.ChunkError {
			s.consoleLog.Logf("ERROR", "  ✖ stream chunk error: %v", chunk.Err)
			s.log.Warn("stream error", "err", chunk.Err)
			break
		}
		chunkCount++
		sanitizer.Process(chunk, renderChunk)
	}

	// Flush any remaining buffered tool calls.
	sanitizer.Flush(renderChunk)

	for _, ev := range streamCodec.RenderStreamDone(state) {
		_, _ = w.Write(ev)
	}
	flusher.Flush()

	latency := int(time.Since(streamStart).Milliseconds())
	s.consoleLog.Logf("DEBUG", "  ✔ stream done: %d chunks · %d tok · %dms", chunkCount, totalTokens, latency)
	s.logRequest(result.Provider, result.Model, totalTokens, 0, latency, false, nil)
}

// writeProviderError maps a structured provider error to an HTTP status.
func (s *Server) writeProviderError(w http.ResponseWriter, err error) {
	pe := core.AsProviderError(err)
	status := http.StatusBadGateway
	switch pe.Kind {
	case core.ErrBadRequest:
		status = http.StatusBadRequest
	case core.ErrAuth:
		status = http.StatusUnauthorized
	case core.ErrRateLimit:
		status = http.StatusTooManyRequests
	case core.ErrQuotaExhausted, core.ErrBudgetBlocked:
		status = http.StatusPaymentRequired
	case core.ErrTimeout:
		status = http.StatusGatewayTimeout
	case core.ErrInternal:
		status = http.StatusInternalServerError
	}
	writeError(w, status, pe.Message)
}

// detectClient identifies the calling tool from request headers, used for
// telemetry and client-specific quirks. Best-effort; empty when unknown.
func detectClient(r *http.Request) string {
	ua := strings.ToLower(r.Header.Get("User-Agent"))
	switch {
	case strings.Contains(ua, "claude"):
		return "claude-code"
	case strings.Contains(ua, "cursor"):
		return "cursor"
	case strings.Contains(ua, "codex"):
		return "codex"
	case r.Header.Get("x-stainless-lang") != "":
		return "openai-sdk"
	default:
		return ""
	}
}
