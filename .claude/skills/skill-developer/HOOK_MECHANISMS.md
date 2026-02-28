# Hook Mechanisms - Deep Dive

Technical deep dive into how the UserPromptSubmit, PostToolUse, and Stop hooks work.

## Table of Contents

- [UserPromptSubmit Hook Flow](#userpromptsubmit-hook-flow)
- [PostToolUse Hook Flow](#posttooluse-hook-flow)
- [Exit Code Behavior (CRITICAL)](#exit-code-behavior-critical)
- [Session State Management](#session-state-management)
- [Performance Considerations](#performance-considerations)

---

## UserPromptSubmit Hook Flow

### Execution Sequence

```
User submits prompt
    ↓
.claude/settings.json registers hook
    ↓
skill-activation-prompt.mjs executes
    ↓
node skill-activation-prompt.mjs
    ↓
Hook reads stdin (JSON with prompt)
    ↓
Loads skill-rules.json
    ↓
Matches keywords + intent patterns
    ↓
Groups matches by priority (critical → high → medium → low)
    ↓
Outputs formatted message to stdout
    ↓
stdout becomes context for Claude (injected before prompt)
    ↓
Claude sees: [skill suggestion] + user's prompt
```

### Key Points

- **Exit code**: Always 0 (allow)
- **stdout**: → Claude's context (injected as system message)
- **Timing**: Runs BEFORE Claude processes prompt
- **Behavior**: Non-blocking, advisory only
- **Purpose**: Make Claude aware of relevant skills

### Input Format

```json
{
  "session_id": "abc-123",
  "transcript_path": "/path/to/transcript.json",
  "cwd": "/root/git/your-project",
  "permission_mode": "normal",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "how does the layout system work?"
}
```

### Output Format (to stdout)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 SKILL ACTIVATION CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 RECOMMENDED SKILLS:
  → project-catalog-developer

ACTION: Use Skill tool BEFORE responding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Claude sees this output as additional context before processing the user's prompt.

---

## PostToolUse Hook Flow

### Execution Sequence

```
Claude executes a file-changing tool
    ↓
.claude/settings.json registers hook (matcher includes Edit/Write/apply_patch/Bash)
    ↓
post-tool-use-tracker.mjs executes
    ↓
node post-tool-use-tracker.mjs
    ↓
Hook reads stdin (JSON with tool_name, tool_input)
    ↓
Determines edited file path and scope
    ↓
Writes tool usage logs under `.claude/tsc-cache/{session_id}`
    ↓
Updates `affected-repos.txt` and `commands.txt`
    ↓
Exit with code 0 (non-blocking tracker)
```

### Key Points

- **Exit code 0**: Allow (tracking only)
- **Timing**: Runs AFTER tool execution
- **Session tracking**: Groups edits by session in `.claude/tsc-cache/{session_id}`
- **Fail open**: On errors, allows operation (don't break workflow)
- **Purpose**: Record affected scope for Stop hooks

### Input Format

```json
{
  "session_id": "abc-123",
  "transcript_path": "/path/to/transcript.json",
  "cwd": "/root/git/your-project",
  "permission_mode": "normal",
  "hook_event_name": "PostToolUse",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/root/git/your-project/form/src/services/user.ts",
    "old_string": "...",
    "new_string": "..."
  }
}
```

### Output Format

```
No user-facing output on success.
Artifacts are written to cache files:
- `tool-usage.log`
- `edited-files.log`
- `affected-repos.txt`
- `commands.txt`
```

Later Stop hooks consume this metadata to decide which verification commands to run.

---

## Exit Code Behavior (CRITICAL)

### Exit Code Reference Table

| Exit Code | stdout | stderr | Tool Execution | Claude Sees |
|-----------|--------|--------|----------------|-------------|
| 0 (UserPromptSubmit) | → Context | → User only | N/A | stdout content |
| 0 (PostToolUse) | → User only | → User only | **Already executed** | Nothing |
| 0 (Stop hooks) | → User only | → User only | N/A | Nothing |
| Other | → User only | → User only | Fail-open in current scripts | Nothing |

### Current Behavior

Current repo hooks are advisory/tracking oriented:

1. UserPromptSubmit prints suggested skills to stdout.
2. PostToolUse records touched scopes and recommended checks.
3. Stop hooks run typecheck/build checks in fail-open mode.
4. No blocking PreToolUse guard script is wired in `.claude/settings.json`.

### Example Conversation Flow

```
User: "Add a new user service with Prisma"

Claude: "I'll create the user service..."
    [Attempts to Edit form/src/services/user.ts]

PostToolUse Hook: [Exit code 0]
    Cache updated: .claude/tsc-cache/{session_id}/commands.txt

Stop Hooks:
    Run npm run typecheck
    Run npm run build (if relevant scope)
```

---

## Session Cache Management

### Purpose

Keep per-session records of edited files and affected scope for verification commands.

### State File Location

`.claude/tsc-cache/{session_id}/`

### State File Structure

```json
tool-usage.log
edited-files.log
affected-repos.txt
commands.txt
```

### How It Works

1. **After file edit**:
   - PostToolUse writes event to session cache
   - Scope detector updates `affected-repos.txt`
   - Recommended commands are written to `commands.txt`

2. **On Stop**:
   - Stop hooks consume cache metadata
   - Typecheck/build are executed in fail-open mode

3. **Different session**:
   - New session ID creates a fresh cache directory

### Limitation

The current cache model tracks edited scope, not explicit skill-tool invocation.

---

## Performance Considerations

### Target Metrics

- **UserPromptSubmit**: < 100ms
- **PostToolUse**: < 200ms

### Performance Bottlenecks

1. **Loading skill-rules.json** (every execution)
   - Future: Cache in memory
   - Future: Watch for changes, reload only when needed

2. **Cache file writes** (PostToolUse)
   - Multiple append/write operations per tool event
   - Depends on filesystem latency

3. **Regex matching** (UserPromptSubmit)
   - Intent patterns (UserPromptSubmit)
   - Future: Lazy compile, cache compiled regexes

### Optimization Strategies

**Reduce patterns:**
- Use more specific patterns (fewer to check)
- Combine similar patterns where possible

**File path/scope mapping:**
- Keep scope rules narrow and deterministic for PostToolUse
- Update mappings when repository structure changes
- Simpler regex = faster matching

---

**Related Files:**
- [SKILL.md](SKILL.md) - Main skill guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Debug hook issues
- [SKILL_RULES_REFERENCE.md](SKILL_RULES_REFERENCE.md) - Configuration reference
