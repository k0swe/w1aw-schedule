# Angular MCP Tools Documentation

## Overview

This document provides a comprehensive guide to the Angular MCP (Model Context Protocol) tools available in this project. The Angular CLI (version 21.0.2) includes a built-in MCP server that exposes various tools for AI assistants to interact with Angular projects programmatically.

## MCP Server Configuration

The MCP server is configured in `/mcp.json`:

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"],
      "cwd": "./web"
    }
  }
}
```

**Important:** The `cwd` (current working directory) is set to `./web` because that's where the Angular project is located in this repository.

## Node.js Version Requirements

- **Minimum Required:** Node.js 20.x (project requirement: >= 22 per package.json)
- **Current Version in Environment:** v20.19.6
- **For `find_examples` tool:** Node.js 22.16+ is required (uses SQLite database features)

**Note:** The `find_examples` tool will be skipped during registration if Node.js version is below 22.16.

## Available Tools (Stable)

The following tools are enabled by default and considered stable:

### 1. `list_projects`
**Title:** List Angular Projects

**Purpose:** Provides a comprehensive overview of all Angular workspaces and projects within the repository.

**Use Cases:**
- Finding the correct project name for commands
- Identifying project root and sourceRoot for file operations
- Determining unit test framework before writing tests
- Getting style language (css, scss, sass, less) for file extensions
- Getting selector prefix for component generation
- Identifying Angular framework major version (crucial for monorepos)
- Determining project type by inspecting its builder

**Input:** None required

**Characteristics:**
- Read-only: Yes
- Local-only: Yes

**Notes:** This should be the **mandatory first step** before any project-specific actions.

---

### 2. `get_best_practices`
**Title:** Get Angular Coding Best Practices Guide

**Purpose:** Retrieves the official Angular Best Practices Guide that **MUST** be followed for any Angular code creation, analysis, or modification.

**Use Cases:**
- Mandatory first step before writing/modifying Angular code
- Learning about standalone components, typed forms, modern control flow
- Verifying existing code aligns with current conventions

**Input:**
- `workspacePath` (optional): Absolute path to `angular.json` for version-specific guide

**Characteristics:**
- Read-only: Yes
- Local-only: Yes

**Notes:** 
- **Recommended:** Provide `workspacePath` (from `list_projects`) for project-specific best practices
- Without `workspacePath`, returns latest generic guide

---

### 3. `search_documentation`
**Title:** Search Angular Documentation (angular.dev)

**Purpose:** Searches the official Angular documentation at https://angular.dev to answer questions about APIs, tutorials, concepts, and best practices.

**Use Cases:**
- Answering questions about Angular concepts
- Finding correct API or syntax for specific tasks
- Linking to official documentation as source of truth

**Input:**
- `query`: Search query string
- `version` (optional): Angular major version for version-specific results

**Characteristics:**
- Read-only: No (makes HTTP requests)
- Local-only: No (requires internet access)

**Notes:**
- Searches against specified major version
- Versions older than v17 are clamped to v17
- Use `list_projects` to get framework version for accurate results

---

### 4. `find_examples`
**Title:** Find Angular Code Examples

**Purpose:** Provides curated database of official, best-practice code examples focusing on modern, new, and recently updated Angular features.

**Use Cases:**
- Learning about new or updated Angular features
- Finding correct modern syntax for features
- Refactoring to modern patterns (e.g., replacing *ngIf with @if)
- Advanced filtering with full-text search

**Input:**
- `workspacePath` (optional): Absolute path to `angular.json` for version-specific examples
- `query`: Primary conceptual search query (uses SQLite FTS5 full-text search)
- Additional filters available (see tool schema)

**Characteristics:**
- Read-only: Yes
- Local-only: Yes

**Requirements:**
- **Node.js 22.16 or higher** (uses SQLite database features)
- Tool is skipped if Node.js version requirement not met

**Current Status:** ⚠️ Not available (Node.js 20.19.6 < 22.16)

---

### 5. `onpush_zoneless_migration`
**Title:** Plan migration to OnPush and/or zoneless

**Purpose:** Analyzes Angular code and provides a step-by-step, iterative plan to migrate to `OnPush` change detection, a prerequisite for a zoneless application.

**Use Cases:**
- Step-by-step migration to OnPush
- Pre-migration analysis for unsupported NgZone APIs
- Generating component migration instructions

**Input:**
- `fileOrDirPath`: Absolute path to directory or file with components/directives/services to migrate

**Characteristics:**
- Read-only: Yes
- Local-only: Yes

**Operational Notes:**
- **DOES NOT modify code** - only provides instructions
- **Iterative process** - must call repeatedly, applying suggestions after each call
- Can operate on single file or entire directory
- Should be used before the `modernize` tool for other migrations
- Identifies next single most important action

**Availability:** ✅ **YES** - This tool is available in Angular CLI 21.0.2

---

### 6. `ai_tutor`
**Title:** Start Angular AI Tutor

**Purpose:** Loads core instructions, curriculum, and persona for the Angular AI Tutor, reprogramming the assistant to become a specialized Angular tutor.

**Use Cases:**
- Starting guided, step-by-step tutorial for learning Angular
- Resuming previous tutoring session

**Input:** None required

**Characteristics:**
- Read-only: Yes
- Local-only: Yes

**Notes:**
- Returns new set of instructions for the LLM (not for user display)
- Supports special commands: "skip this section", "show table of contents", etc.
- Leads user through "Smart Recipe Box" application tutorial

---

## Experimental Tools

The following tools are available but not enabled by default:

### 7. `modernize` (Experimental)
**Title:** Modernize Angular Code

**Purpose:** Provides instructions and commands for modernizing Angular code to align with latest best practices and syntax.

**Available Transformations:**
- `control-flow`: Migrate from `*ngIf`, `*ngFor`, `*ngSwitch` to `@if`, `@for`, `@switch`
- `self-closing-tag`: Convert empty tags to self-closing
- `inject`: Convert constructor-based injection to `inject()` function
- `output-migration`: Convert `@Output` to functional `output()` syntax
- `signal-input-migration`: Migrate `@Input` to signal-based `input()` syntax
- And more...

**Use Cases:**
- Applying specific migrations
- Upgrading existing code
- Discovering available migrations

**Input:**
- Transformation name(s)
- Additional parameters based on transformation

**Characteristics:**
- Read-only: No (executes commands)
- Local-only: Yes

**Operational Notes:**
- Executes `ng generate` commands for simple migrations
- For complex migrations (e.g., 'standalone'), provides instructions
- Must execute commands in exact order provided

**How to Enable:** Set environment variable `NG_MCP_EXPERIMENTAL_TOOLS=modernize` or configure in MCP client settings

---

## Command Line Options

When starting the MCP server, the following options are available:

```bash
npx @angular/cli mcp [options]
```

**Options:**
- `--help`: Shows help message
- `--read-only`: Only register read-only tools (boolean, default: false)
- `--local-only`: Only register tools that don't require internet access (boolean, default: false)

---

## Workflow Recommendations

### 1. Starting Any Angular Work
```
1. Call list_projects to understand workspace structure
2. Call get_best_practices with workspacePath for coding standards
3. Proceed with specific tasks using other tools
```

### 2. Answering Questions
```
- For concepts: Use search_documentation
- For code examples: Use find_examples (if Node.js 22.16+)
```

### 3. Migrating to Zoneless/OnPush
```
1. Run onpush_zoneless_migration on target file/directory
2. Apply the suggested changes
3. Repeat until tool indicates migration is complete
4. Consider using modernize tool for other migrations (signal inputs, etc.)
```

---

## Specific Answer: onpush_zoneless_migration Tool

### Is it available?
**YES** ✅ - The `onpush_zoneless_migration` tool is available and fully functional in Angular CLI 21.0.2.

### Why wasn't it found initially?
The tool name in the Angular CLI is **`onpush_zoneless_migration`** (with underscores), which matches the documentation. The confusion may have arisen from:
1. MCP server needs to be properly connected with correct working directory
2. Tool registration happens at runtime when MCP server starts
3. Without proper connection, tools won't be discoverable

### How to use it?
```typescript
// Tool call format
{
  "name": "onpush_zoneless_migration",
  "arguments": {
    "fileOrDirPath": "/absolute/path/to/component.ts"
    // or
    "fileOrDirPath": "/absolute/path/to/directory"
  }
}
```

**Example workflow:**
1. Identify components to migrate
2. Call tool with file or directory path
3. Read and apply the migration instructions provided
4. Call tool again to get next step
5. Repeat until complete

### Tool Implementation Details
Located in: `node_modules/@angular/cli/src/commands/mcp/tools/onpush-zoneless-migration/`

**Key Features:**
- Analyzes TypeScript/Angular files
- Detects unsupported Zone.js API usage
- Provides step-by-step migration instructions
- Works with components, directives, and services
- Can process single files or entire directories

---

## Troubleshooting

### MCP Server Won't Start
- Ensure you're in the correct working directory (web/)
- Verify Node.js version meets requirements
- Check that Angular CLI is installed: `npx @angular/cli version`

### Tool Not Available
- Check Node.js version (find_examples requires 22.16+)
- Verify tool is not experimental (may need explicit enabling)
- Ensure MCP server started successfully

### Version Mismatches
- Use `list_projects` to get actual framework version
- Some tools (best_practices, find_examples, search_documentation) are version-aware
- Always provide `workspacePath` when available for accurate results

---

## Summary

This project has access to **6 stable tools** and **1 experimental tool** from Angular CLI 21.0.2:

**Stable (Auto-enabled):**
1. ✅ list_projects
2. ✅ get_best_practices
3. ✅ search_documentation
4. ⚠️ find_examples (requires Node.js 22.16+, currently unavailable)
5. ✅ onpush_zoneless_migration (AVAILABLE)
6. ✅ ai_tutor

**Experimental (Opt-in):**
7. 🧪 modernize

The `onpush_zoneless_migration` tool is **fully available** and ready to use for migrating components to OnPush change detection strategy and preparing for zoneless Angular applications.
