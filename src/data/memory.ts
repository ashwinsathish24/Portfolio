import { MemoryChild, MemoryCluster, MemoryLeaf } from '../types';

export const MEMORY_CLUSTERS: MemoryCluster[] = [
  {
    id: 'interests',
    label: 'INTERESTS',
    detail: 'Creativity  •  Design  •  Music  •  Automation',
    children: [
      {
        kind: 'leaf',
        id: 'int-cad',
        label: 'CAD & 3D',
        content: {
          title: 'CAD & 3D Modelling',
          lines: [
            'AutoCAD automation for P&ID drafting — DRAW_LINE, INSERT_BLOCK, OFFSET, and full coordinate syntax',
            'Parametric drawing generation driven by engineering field data',
            'PyVista 3D viewport and Hono 3D hierarchical modelling for rapid budgetary proposals',
          ],
        },
      },
      {
        kind: 'leaf',
        id: 'int-ai',
        label: 'AI & Automation',
        content: {
          title: 'AI & Automation',
          lines: [
            'Self-hosted LLMs and agentic tool pipelines — no cloud, fully private',
            'Knowledge-graph RAG and on-prem embedding infrastructure',
            'Automating the repetitive so engineers can focus on design',
          ],
        },
      },
      {
        kind: 'leaf',
        id: 'int-design',
        label: 'Design & Video',
        content: {
          title: 'Design & Multimedia',
          lines: [
            'Technical video editing with DaVinci Resolve and SaaS-style product demo animation',
            'Corporate branding in Figma — SharePoint Intranet redesign and official company assets',
          ],
        },
      },
      {
        kind: 'leaf',
        id: 'int-music',
        label: 'Music & Ambience',
        content: {
          title: 'Music & Ambience',
          lines: [
            'This site — synthesized windchimes, ambient melodies, "Ashwin\'s Alley"',
            'Web Audio design for immersive, calm interfaces',
          ],
        },
      },
    ],
  },
  {
    id: 'knowledge',
    label: 'KNOWLEDGE',
    detail: 'EDMS  •  AI Integration  •  RAG',
    children: [
      {
        kind: 'group',
        id: 'edms',
        label: 'EDMS',
        detail: 'Engineering Document Management',
        children: [
          {
            kind: 'leaf',
            id: 'edms-dev',
            label: 'EDMS Dev',
            content: {
              title: 'EDMS Development',
              lines: [
                'Engineered FLUENTA: 80+ source files and 10,000+ lines of Python',
                'Automates the company\'s entire engineering workflow end to end',
                'Full document lifecycle: creation → approval → transmittal → archival',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'edms-versioning',
            label: 'Git Versioning',
            content: {
              title: 'Git-Like Content-Addressable Versioning',
              lines: [
                'SHA-256 content hashing — objects stored per commit with a HEAD pointer',
                'HEAD tracks timestamp, file path, version number, and commit message',
                'Background commits — point-in-time recovery of any saved state',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'edms-tracking',
            label: 'Project Tracking',
            content: {
              title: 'Centralized Project Tracking',
              lines: [
                'Dynamic timesheets with automated man-hour calculation for project and non-project hours',
                'Priority-based daily hour caps with category hierarchies',
                'Weekend/holiday exclusion and a multi-level approval escalation pipeline',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'edms-finance',
            label: 'Finance',
            content: {
              title: 'Financial & Management Integration',
              lines: [
                'Cost codes and scope-of-supply management to streamline project reporting',
                'Paginated scope tables with discipline-level filtering',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'edms-workflow',
            label: 'Workflow',
            content: {
              title: 'Workflow Management System',
              lines: [
                'Visual node-graph designer: drag-to-connect, knife-to-delete, AND/OR logic gates',
                'Role-based user assignment and document-workflow mapping',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'edms-sync',
            label: 'Live Sync',
            content: {
              title: 'Real-Time Collaboration',
              lines: [
                'WebSocket-based synchronization — multiple users on the same project simultaneously',
                'File-change notifications, sync dispatching, and notification delivery',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'edms-transmittal',
            label: 'Transmittals',
            content: {
              title: 'Transmittal Management',
              lines: [
                'Dual-view Vendor/Customer transmittals with full status pipelines',
                'Tree checkbox selection and automatic sequential transmittal codes',
                'Microsoft Graph email notifications plus Outlook folder organization',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'edms-filemanager',
            label: 'File Manager',
            content: {
              title: 'Three-Pane File Manager',
              lines: [
                'Norton Commander-style browser with Vim-like h/j/k/l keyboard navigation',
                'Smart file opening by workflow status; background directory loading',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'edms-auth',
            label: 'Auth & RBAC',
            content: {
              title: 'Authentication, Security & User Management',
              lines: [
                'File-based licenses: SHA-256 password hashing bound to hardware fingerprint',
                'Granular role-based access control with project-level scoping',
                'Manager-report hierarchy powering approval escalation',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'edms-dashboard',
            label: 'Analytics',
            content: {
              title: 'Dashboard & Analytics',
              lines: [
                'Custom-painted cubic-Bezier time-series graphs with hover tooltips',
                'Document status pipeline tracking with CSV export',
                'Metadata drill-down with visual approval-workflow diagrams',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'edms-audit',
            label: 'Audit',
            content: {
              title: 'Audit Logging & Compliance',
              lines: [
                '100+ event audit trail with monthly JSONL rotation and background batched writes',
                'Full traceability of approvals, status changes, and user actions — ISO 9001:2015 aligned',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'edms-arch',
            label: 'Architecture',
            content: {
              title: 'Application Architecture & Infrastructure',
              lines: [
                'Five-tier modular architecture: config / core / logic / ui / excelsh',
                'Server-mediated file I/O with 4-layer thread-safe caching',
                'Single-instance enforcement, hardware fingerprinting & licensing, custom cursors, DPI scaling',
              ],
            },
          },
        ],
      },
      {
        kind: 'group',
        id: 'ai',
        label: 'AI Integration',
        detail: 'Self-Hosted LLM Engineering',
        children: [
          {
            kind: 'leaf',
            id: 'ai-llm',
            label: 'LLM + RAG',
            content: {
              title: 'Local LLM & RAG Integration',
              lines: [
                'Qwen Instruct VL 30B MoE powering multi-user workflows',
                'Custom JSON-schema parsing and web-search tools with Neo4j knowledge-graph RAG over PDF, Word, Excel, and text',
                'Sliding-window context management with configurable SKILL.md tool assignment',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'ai-vllm',
            label: 'vLLM',
            content: {
              title: 'Self-Hosted vLLM Inference Engine',
              lines: [
                'Qwen3-VL 30B A3B MoE (AWQ 4-bit) served via vLLM AsyncLLMEngine — zero external API dependencies',
                'Text + image input for vision OCR and diagram reading; OOM-resilient GPU init ladder',
                'Concurrency capped by token budget (~341K on an RTX 5090-class GPU) via asyncio semaphore',
                'JIT warmup + 60s keep-alive, prefix caching, chunked prefill, KV offload, expandable segments',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'ai-agent',
            label: 'Agents',
            content: {
              title: 'Agentic Tool-Calling Pipeline',
              lines: [
                'FastAPI + asyncio reasoning loop: plan → call tools → iterate, up to 50 rounds',
                'Regex-parsed <tool_call> blocks; <think> chain-of-thought stripped before answers',
                'Tool registry (search_brain, web_search, JsonParser) injected via the chat template',
                'Concurrent dispatch with asyncio.gather, fault-isolated tool errors, slash-command routing',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'ai-graphrag',
            label: 'Graph RAG',
            content: {
              title: 'Hybrid Knowledge-Graph RAG (search_brain)',
              lines: [
                'Neo4j 5 graph — Document/Chunk/Entity nodes with a native 1024-dim cosine vector index',
                'Single Cypher query unions vector similarity, entity-match, and document-name branches',
                'Graph expansion to depth 1–3 plus BGE cross-encoder two-stage ranking',
                'Six engineering-domain entity regexes and an anti-hallucination contract',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'ai-json',
            label: 'JsonParser',
            content: {
              title: 'Structured Data Query Tool (JsonParser)',
              lines: [
                'Read-only SQL over JSON, CSV, TSV, Parquet, XML, YAML, and logs via DuckDB',
                'DML/DDL stripped — SELECT/WITH only with automatic LIMIT 50',
                'Self-discovering schemas rewritten into the tool definition at runtime',
                'Self-healing binder errors with column hints and empty-result value hints',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'ai-web',
            label: 'Web Search',
            content: {
              title: 'Web Search with Semantic Reranking (web_search)',
              lines: [
                'Self-hosted SearXNG metasearch over Google/Bing/DuckDuckGo via async httpx',
                'Concurrent page fetching, HTML→Markdown conversion (MarkItDown), ONNX cross-encoder reranking',
                'Machine-parseable <ref> citation tags; context-budget-driven scaling',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'ai-embed',
            label: 'Embeddings',
            content: {
              title: 'Local Embedding & Reranking Infrastructure',
              lines: [
                'Quantized ONNX on CPU: bge-large-en-v1.5 producing 1024-dim vectors',
                '16 embedding + 8 reranker session pools; lru_cache memoization of repeats',
                'bge-reranker-base cross-encoder for final relevance ordering',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'ai-ocr',
            label: 'OCR / Ingest',
            content: {
              title: 'Intelligent PDF OCR & Continuous Ingestion',
              lines: [
                'PyMuPDF native text scored per page; vision-LLM OCR fallback below quality thresholds',
                'Adaptive DPI (60–200) with per-page token budgets (2K–16K)',
                'DOCX/XLSX/TXT through one dispatcher; watchdog ingestion with mtime-based idempotency',
                'ProcessPool extraction + ThreadPool OCR (max 4 workers)',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'ai-memory',
            label: 'Memory',
            content: {
              title: 'Conversational Memory & Context Budgeting',
              lines: [
                'Deterministic budget: 25% history / 30% tool results / 25% generation / 20% overhead',
                '50-turn JSONL sliding window reassembled backward to fit the history budget',
                'Head-and-tail tool truncation with explicit [...] markers; RLock-guarded history',
                'Auto-named sessions with REST rename/delete and resource cleanup',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'ai-skills',
            label: 'Skills',
            content: {
              title: 'Dynamic Skills System (SKILL.md)',
              lines: [
                'Each skill is a Markdown file with YAML-style frontmatter (name, tools, temperature)',
                '{placeholder} prompt templates; watchdog live reload — no restarts',
                'Skills pre-injected after the user prompt to avoid context contamination',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'ai-email',
            label: 'Email',
            content: {
              title: 'Microsoft Graph API Email Context Injection',
              lines: [
                'MSAL client-credentials auth; inbox + sent-items fetch with date-range filtering',
                'Attachment processing (PDF/DOCX/DOC/TXT) as base64',
                'Full email context injected into queries; local caching avoids re-fetch',
              ],
            },
          },
          {
            kind: 'leaf',
            id: 'ai-spell',
            label: 'Spell Check',
            content: {
              title: 'Spell Checking Integration',
              lines: [
                'Real-time Python spell-checking of user input',
                'Misspelled words + correction suggestions returned as JSON',
                'Frontend highlights errors and offers inline corrections',
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'goal',
    label: 'GOAL',
    detail: 'Endless search of knoledge and self-improvement',
    children: [
      {
        kind: 'leaf',
        id: 'goal-automate',
        label: 'Automate the Loop',
        content: {
          title: 'Automate the Recurring Loops',
          lines: [
            'Engineer the full loop end to end: CAD → documents → approvals → transmittals',
            'Give every team a system that absorbs the busywork',
            'Lead a company/team to a fully automated, self-hosted workflow',
          ],
        },
      },
      {
        kind: 'leaf',
        id: 'goal-local-ai',
        label: 'Master Local AI',
        content: {
          title: 'Master Local AI',
          lines: [
            'Ship self-hosted, GPU-resident LLM agents that run on my own hardware',
            'Keep the entire stack private, fast, and on-prem',
          ],
        },
      }
    ],
  },
];

export const MEMORY_LEAF_MAP: Record<string, MemoryLeaf> = (() => {
  const map: Record<string, MemoryLeaf> = {};
  const walk = (children: MemoryChild[]) => {
    for (const child of children) {
      if (child.kind === 'group') {
        walk(child.children);
      } else {
        map[child.id] = child;
      }
    }
  };
  for (const cluster of MEMORY_CLUSTERS) {
    walk(cluster.children);
  }
  return map;
})();

export const LEAF_TAG: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const cluster of MEMORY_CLUSTERS) {
    for (const child of cluster.children) {
      if (child.kind === 'group') {
        for (const leaf of child.children) {
          map[leaf.id] = child.label;
        }
      } else {
        map[child.id] = cluster.label;
      }
    }
  }
  return map;
})();
